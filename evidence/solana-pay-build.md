# solana-pay-build — moving two steps out of the model and into Rust

The charge procedure could not complete. It failed for two reasons that looked
unrelated and were the same reason, and fixing it properly meant writing code
rather than rewording a step.

---

## What was wrong

`charge-request` was five steps. Steps 3 and 4 read:

> **Mint a reference key** — Generate a fresh reference public key for this charge.
>
> **Build the payment request** — Assemble the Solana Pay transfer-request URL
> from the shop's receiving address, the amount, the token mint, and the
> reference key.

A language model can do neither. A reference key is 32 bytes of entropy. A
transfer request is a URL with exact percent-encoding rules. Both were written
as instructions to a model whose entire toolset was `http_request`,
`sop_execute`, `sop_status`.

Given no tool that fit, the model did not report that it was stuck. It invented
endpoints:

```
Agent wants to execute: http_request
  method: GET, url: https://example.com/generate-reference-key

Agent wants to execute: http_request
  method: GET, url: https://api.example.com/shop/token/verify?token=USDC
```

Neither exists. This is the same failure recorded in
`evidence/live-channel-run.md` (a charge reported as complete with
`native_tool_calls: 0`) and in `evidence/injection-transcript.md` (a fabricated
`<tool_result>` block). Three occurrences, three different places in the system.
The pattern is not the prompt. **Asked to do something it has no tool for, this
model invents a plausible result rather than failing.**

The second symptom was cost. Every SOP step is a separate model call carrying
the conversation — roughly 2,600 tokens. Five steps is about 13,000 against a
12,000-per-minute free-tier ceiling, so the run died mid-procedure:

```
>> charge-request  failed  step 4 / 5
   step_promoted
   step_promoted
   step_promoted
```

Paying for a higher tier would have kept a wrong design running.

## The fix

A new plugin, `solana-pay-build`, does both jobs in Rust. `charge-request` drops
from five steps to three.

The old step 2 — check the amount against the ceiling, check the token against
the allowlist — is gone as well. The plugin enforces both in code, reading them
from the operator's config rather than from the tool's arguments. A model step
re-checking what Rust already enforces buys a model call and no safety.

**The plugin is granted no network permission at all.**

```toml
permissions = ["config_read"]
```

No `http_client`. Building a transfer request contacts nothing — it is a string
and a hash. The absence is the control: the model tried to reach
`example.com/generate-reference-key` for this job, and a component without
`http_client` cannot be talked into it by any message.

The limits live in config, not in arguments:

```toml
[[plugins.entries]]
name = "solana-pay-build"
[plugins.entries.config]
recipient      = "REPLACE_ME"
allowed_tokens = "SOL,Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
max_amount     = "500"
```

The tool's parameter schema accepts `label`, `amount`, `token` and nothing else
(`additionalProperties: false`). No message arriving in the shop channel can
raise a ceiling or redirect a payment by supplying a field, because there is no
field to supply.

Custody tier is unchanged and remains T0 for this path: no key is held, nothing
is signed, nothing is submitted. The customer's own wallet builds and signs.

## Design notes worth stating

**Amounts are decimal strings end to end.** A binary float cannot represent
25.10 exactly, and a till that quietly re-renders the amount it charges is worse
than one that refuses. The ceiling comparison comparesss two decimal strings
digit by digit without parsing either into a number.

**The reference is derived, not random.** It is
`sha256("aval:solana-pay:reference:v1" || recipient || label || amount || token || salt)`,
where the salt is a nanosecond clock reading. A Solana Pay reference is used
read-only to identify a payment, so no private key for it ever needs to exist —
which is what keeps this at T0.

Uniqueness matters more than it first appears: `table 4, 25 USDC` twice in one
evening is ordinary, and if both charges shared a reference the second payment
would be indistinguishable from the first and a customer would be told they had
already paid. If the clock is unreadable the plugin **refuses to build the
charge** rather than falling back to a fixed value, because a fixed fallback
would make every charge in the shop derive the same reference.

Every field is length-prefixed before hashing. Without it, `("ab","c")` and
`("a","bc")` hash identically — and the label is chosen by whoever types into the
shop channel, which is exactly where that would be noticed.

## Tests

Host-run, no network, no live RPC:

```
running 14 tests
test pay::tests::builds_an_spl_transfer_request ... ok
test pay::tests::native_sol_carries_no_spl_token_parameter ... ok
test pay::tests::reference_is_a_valid_32_byte_key ... ok
test pay::tests::identical_charges_get_different_references ... ok
test pay::tests::reference_is_reproducible_for_one_charge ... ok
test pay::tests::field_boundaries_cannot_be_shifted_by_a_crafted_label ... ok
test pay::tests::refuses_a_token_off_the_allowlist ... ok
test pay::tests::refuses_an_amount_over_the_ceiling ... ok
test pay::tests::accepts_the_ceiling_exactly ... ok
test pay::tests::refuses_a_non_decimal_amount ... ok
test pay::tests::refuses_an_empty_label ... ok
test pay::tests::refuses_a_malformed_recipient ... ok
test pay::tests::encodes_labels_that_are_not_url_safe ... ok
test pay::tests::decimal_comparison_handles_padding_and_precision ... ok

test result: ok. 14 passed; 0 failed
```

The encoding test is there because a table name is free text: `Table 4` and
`Café` both occur in practice, and an unencoded space or accent would truncate
or corrupt the request.

## The component boundary, which is where the brief said the risk lived

The brief's trap 4 says `wit/v0` is unfrozen and to expect a rebuild. That is
exactly what happened, and the failure is worth quoting because it is invisible
from the plugin side.

The component built clean, `plugin list` showed it installed, and the host
refused to instantiate it:

```
failed to instantiate tool plugin: component imports instance
`zeroclaw:plugin/logging@0.1.0`, but a matching implementation was not found in
the linker: instance export `log-record` has the wrong type: type mismatch for
field action: expected enum of 38 names, found 37 names

{"discovered":1,"registered":0}
```

The `zeroclaw-plugins` repo vendors its own copy of `wit/v0`, and that copy has
drifted from the WIT the host actually ships:

```
zeroclaw/wit/v0/logging.wit          plugin-action: 38 names
zeroclaw-plugins/wit/v0/logging.wit  plugin-action: 37 names
```

One enum variant. The plugin compiles, installs, and lists normally; only
instantiation fails. **Build against the WIT shipped with the host you are
running, not the copy vendored beside your plugin.** After repointing
`wit_bindgen::generate!` at the host's tree the same source instantiated
unchanged:

```
{"discovered":1,"registered":1}
"retained":4
```

`retained: 4` is the number to check — the tool survived the capability filter
and reached the model. A name that does not match a registered tool is dropped
silently, so `policy_allowed` above `retained` would mean it had not.

A second linker error is worth recording alongside it. The first version of this
crate depended on the sibling `durable-tx-build` for base58, and building for
wasm produced:

```
rust-lld: error: duplicate symbol: cabi_post_zeroclaw:plugin/tool@0.1.0#description
```

That crate is `crate-type = ["cdylib", "rlib"]` with a wasm-gated component
shim, so depending on it as a library compiles two components into one artifact.
One component exports one tool. Base58 is vendored here instead, in
`src/base58.rs`, with the reasoning recorded at the top of that file.

## Live run

Through the real host, against the real model, with the tool registered:

```
$ zeroclaw agent -a caixa -m "Charge table 4 for 25 USDC..."

Agent wants to execute: solana_pay_build
   amount: 25, label: table-4, token: [redacted]

solana:GsbwXfJraMomNxBcjK1LfJ8HPnzUnEzUcNvLYSbxNQpr
  ?amount=25
  &spl-token=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
  &reference=AXZnTMLRrQWznLgkGd8fqhaJFHiZv1BXufnG6s5P1eKx
  &label=table-4
```

A real tool call, a real transfer request, a reference minted in Rust. Compare
this against `evidence/live-channel-run.md`, where the same instruction produced
a confident "Table 4 has been charged" with `native_tool_calls: 0` and nothing
behind it. The difference is not a better prompt. It is that the work is no
longer the model's to invent.

The ceiling was then tested through the same live path:

```
$ zeroclaw agent -a caixa -m "Charge table 9 for 5000 USDC..."

Agent wants to execute: solana_pay_build
   amount: 5000, label: table-9

"The charge amount of 5000 USDC exceeds the shop's per-charge ceiling of 500
 USDC. The transaction cannot be processed as requested."
```

The tool was called and the plugin refused. The model did not decide this and
could not have overridden it: the ceiling is not one of its arguments. The
refusal text came out of Rust and the model relayed it.

## Status

**Done and verified.** Plugin written; 20 host tests green (14 payment logic, 6
base58). Component builds for `wasm32-wasip2`, 260,663 bytes, and instantiates
in the host (`registered: 1`, `retained: 4`). A live agent run produced a real
Solana Pay URL through a real tool call, and a live over-ceiling charge was
refused in code. `charge-request` reduced to three steps; all three SOPs
validate against the real binary.

**Not yet done.** The charge has not been driven from an inbound Telegram
message end to end — the runs above are the CLI agent path. The channel is bound
and the trigger is proven to fire (`evidence/live-channel-run.md`), so what
remains is one message during a daemon window. Nor has a customer paid one of
these requests on devnet and been detected by `settlement-poll`; the poller's
mechanism is proven, its happy path is not.
