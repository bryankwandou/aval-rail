# Host build and SOP validation — against the real binary

Run 2026-08-03. Everything below is output from the source-built host, not from
an independent parser and not from the docs.

---

## The build the bounty scores against

> "Running it: plugins are not in the release binaries. Build the host from
> source — `cargo build --release --features plugins-wasm-cranelift`... Judges
> score against exactly this bar."

```
$ cargo build --release --features plugins-wasm-cranelift
    Finished `release` profile [optimized] target(s) in 61m 38s

$ zeroclaw --version
zeroclaw 0.8.4
```

41 MB binary. One hour and two minutes on a warm cache with a fast machine —
worth stating plainly in a reproduction guide, because an operator who expects a
five-minute build will assume it has hung.

It does not build at all on a stable toolchain from a year ago. See
`01-BUILD-LOG.md`: `zeroclawlabs@0.8.4` requires **rustc >= 1.96.1**.

## Validation

```
$ zeroclaw sop validate
  ✅ charge-request — valid
  ✅ refund-approval — valid
  ✅ settlement-poll — valid

All SOPs passed validation.
```

## What the engine actually parsed

```
$ zeroclaw sop list
Loaded SOPs (3):

  charge-request v1.0.0 [normal]
    Mode: deterministic  Steps: 5  Triggers: channel:telegram
  refund-approval v1.0.0 [normal]
    Mode: deterministic  Steps: 7  Triggers: channel:telegram
  settlement-poll v1.0.0 [normal]
    Mode: deterministic  Steps: 4  Triggers: cron:* * * * *
```

Step counts, trigger types and execution mode all match what was authored.

## The approval gate, confirmed by the engine rather than asserted

```
$ zeroclaw sop show refund-approval

  Max concurrent: 1
  Admission:      hold
  Max pending:    3

  Steps:
    ...
    6. Wait for the owner [confirmation required]
    7. Hand it back to be signed
```

`[confirmation required]` on step 6 is the engine confirming the checkpoint
parsed. The concurrency fields read back exactly as set: one in-flight refund
(a chain constraint, since one nonce account backs one in-flight transaction),
`hold` admission, and at most three refunds parked at the gate at once.

## Routing

```
$ zeroclaw sop graph refund-approval
1. Read the refund request -> 2, 2
2. Find the original payment -> 3, 3
3. Check it against the rules -> 4, 4
4. Build it against the nonce vault -> 5, 5
5. Re-read it from the bytes -> 6, 6
6. Wait for the owner -> 7, 7
7. Hand it back to be signed
1000000. telegram -> 1

$ zeroclaw sop graph settlement-poll
1. Collect pending charges -> 2, 2
2. Ask the chain about each reference -> 3, 3
3. Verify what actually landed -> 4, 4
4. Tell the operator
1000000. cron -> 1
```

Node `1000000` is the trigger, edged into step 1. Targets appear twice because
each step carries both an explicit `depends_on` and the implicit linear
successor; they agree, so the duplication is harmless.

---

## A finding that cost real security posture

The SOPs first reported `Mode: supervised` despite the config saying otherwise.

The config key is **`default_execution_mode`**, not `execution_mode`.

```toml
[sop]
execution_mode         = "deterministic"   # accepted, silently does nothing
default_execution_mode = "deterministic"   # the real key
```

Writing the wrong one produces no error, no warning, and no log line. The engine
falls back to `supervised`, and `zeroclaw sop list` is the only place the
difference is visible.

This is not cosmetic. `deterministic` means the steps run as written and the
model fills in the parts a step asks it to fill in. `supervised` gives the model
latitude over the run. For a procedure whose sixth step is a human approval gate
on outbound money, silently getting the weaker mode is exactly the class of
failure that is discovered after an incident rather than before one.

Caught only because the parsed output was read back rather than trusted. The
shipped `config.example.toml` now carries both the correct key and a note about
the trap.

Same shape as issue #8636 (a bracket typo silently disabling the whole plugin
system): **this runtime tends to fail quiet on configuration.** The general
lesson for anyone deploying it — do not trust that a setting took effect
because the file says so. Read it back from `sop list`, `config list`, or the
equivalent surface, every time.

---

## The shipped example config, loaded by the real binary

Not a hand-checked file — the actual `config.example.toml` from the repo, with
only `sops_dir` repointed at the test workspace, fed to the built host.

```
$ zeroclaw sop list
Loaded SOPs (3):
  charge-request    Mode: deterministic  Steps: 5  Triggers: channel:telegram
  refund-approval   Mode: deterministic  Steps: 7  Triggers: channel:telegram
  settlement-poll   Mode: deterministic  Steps: 4  Triggers: cron:* * * * *
```

And the `[plugins]` section survived deserialization, which is the specific
thing issue #8636 punishes:

```
$ zeroclaw config list | grep plugins
Plugins:
  plugins.enabled                             = true                (bool)
  plugins.plugins_dir                         = ~/.zeroclaw/plugins (String)
  plugins.security.signature_mode             = permissive          (String)
  plugins.limits.call_fuel                    = 1000000000          (u64)
  plugins.limits.max_memory_mb                = 256                 (usize)
  plugins.entries.nonce-vault-init.config.rpc_url             = **** 🔒
  plugins.entries.durable-tx-build.config.rpc_url             = **** 🔒
  plugins.entries.durable-tx-build.config.max_lamports_per_tx = **** 🔒
  plugins.entries.durable-tx-build.config.mint_allowlist      = **** 🔒
  plugins.entries.approval-recheck.config.rpc_url             = **** 🔒

$ zeroclaw config get plugins.enabled
true
```

Three things this confirms, none of which were safe to assume:

1. **`plugins.enabled` reads back `true`.** Under #8636 a malformed section
   silently falls back to defaults and reports `false`. It did not, so the
   `[[plugins.entries]]` array-of-tables is written correctly.
2. **All three plugin entries are present** with their config, meaning the
   hand-seeded bootstrap the CLI cannot perform was done right.
3. **Every entry value is secret-marked and masked** (`****` with a lock).
   Plugin config is treated as sensitive by default — so an operator's RPC key
   and caps do not leak into a terminal recording during a demo. Useful to know
   before pointing a camera at this.

## What is proven here, and what is not

**Proven:** the host builds with the scored feature flag; all three procedures
load and validate against it; the approval checkpoint, concurrency policy and
trigger wiring parse as designed; execution mode is deterministic.

**Not proven by this document:** a live end-to-end run with a real Telegram
channel and a real customer payment. That needs a bot token and a funded
counterparty, and it is recorded separately. Nothing here should be read as
standing in for that.

The chain-level claim is proven independently in `devnet-proof.md`, which needs
no host build at all.
