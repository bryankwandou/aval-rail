# Direction, with 80 days instead of 40 hours

Written 2026-08-06, after the deadline moved. This supersedes the "ship what
exists" posture in `07-SUBMISSION-CHECKLIST.md`. It is not a rewrite of the
codebase; it is a decision about what the project is *for*, and it comes out of
the audit rather than out of enthusiasm.

---

## The finding that should change the plan

Across this build the model fabricated work it had not done **four separate
times**:

1. invented `https://example.com/generate-reference-key` when asked to mint a key
2. invented `https://api.example.com/shop/token/verify` when asked to build a URL
3. reported *"Table 4 has been charged"* with `native_tool_calls: 0`
4. reported *"I have processed the request to charge table-12"* with no tool call

And once, under attack, it wrote a `<tool_result>` block as prose to make a
refund look completed.

Every fix was the same shape: **take the decision away from the model and put it
in code that cannot be argued with.** The ceiling moved into Rust. The reference
key moved into Rust. The URL moved into Rust. The till stopped believing prose.

That is the actual thesis of this project, and until now it has been buried
under a shop till.

## Why the till alone will not win

Stated plainly, from the audit:

- The listing uses "payment terminal in a family shop's chat" as **its own
  example**. Building the example is competing on execution of someone else's
  idea, in a field of 120.
- Strip the LLM out of the till and the product gets better: faster, cheaper,
  deterministic. A product whose own build log argues against its architecture
  is a product a judge will notice.
- No shop has ever run it. Nine hours of uptime driven by `curl` on the builder's
  own laptop is a smoke test, not usage.
- There is no moat. The plugin is ~400 lines.

The till is not being thrown away. It becomes the *proof*, which is what the
listing asks a use case to be. What changes is what it proves.

## The direction: certify the intent, not the sentence

The listing names this in its own words, under the experimental edge:

> Fail-closed action certification, where nothing leaves the machine unless the
> exact serialized transaction has been verified against intent.

That is the guard already written into the till, in embryo: *no `solana:` URL
means no charge, no matter what the model says happened.* Generalised, it is a
component that sits between the agent and anything leaving the machine, and it
does one job:

**Re-derive the artefact from structured intent, in Rust, and refuse anything
that does not match byte for byte.**

The model may propose. It may not describe. A description that cannot be
reproduced from the intent is discarded, and the discard is logged.

Concretely, for each outbound thing:

| Artefact | What is re-derived | What a mismatch means |
|---|---|---|
| Solana Pay request | recipient, amount, mint, reference, from config + intent | the model edited a field it was shown |
| Unsigned transfer | the serialized message bytes | the model altered a destination or an amount |
| Refund | destination read from the paying transaction | the model took an address from a message |
| Any chat reply | every base58 token must have appeared in a tool result | the model is echoing an attacker's address |

That last row is the hole the injection test found and that
`untrusted_outbound_redact = true` did not close. It has been specified since
day one and never built. It is now the centre of the product rather than a
footnote in "not done".

## Why this is defensible where the till is not

- **It is built on evidence nobody else has.** Four logged fabrications and one
  fabricated tool result, from one build. Competitors assert their model is
  well-behaved; this project has the transcripts proving the opposite and a
  mechanism that makes it not matter.
- **It generalises past payments.** A certifier that re-derives artefacts from
  intent is not a shop feature. It is the thing every agent runtime needs the
  moment an agent touches money, and it is sellable as a layer rather than as a
  till.
- **It is the correct layer for WASM.** The listing rejects "thin single-RPC-call
  wrappers padded into WASM" and asks for "bounded code inside the sandbox" —
  deterministic, declared permissions, auditable. Certification is exactly that,
  and unlike URL-building it genuinely cannot live in a skill.
- **It scores where the marks are.** Safety and custody is 25%, craft is 20%.
  A certifier is entirely inside both.

## What the audit says is still missing, and must be fixed regardless

These are not optional and no amount of direction fixes them:

1. **No customer has ever paid one of these requests.** The core loop is broken
   in the middle. Pay one on devnet from a real wallet and let `settlement-poll`
   catch it. Until that exists, the product does not work end to end.
2. **No shop, no user, no interview.** One real operator running it for a week
   is worth more than every other item on this list. Find one.
3. **Testing is thinner than the field leader's.** PR #30 ships negative controls
   — every check must be provoked into failing or the harness fails. Twenty
   passing tests without that discipline is a weaker claim, and copying the
   discipline is free.
4. **No revenue model at all.** Not needed to win a bounty. Needed for the
   "go startup" claim, and its absence should stop being described as a plan.
5. **The nav bug is live on the deployed site.** Diagnosed, unfixed, and the
   checklist claimed otherwise for days.

## Order of work

**Weeks 1–2 — close the loop that is open.**
Pay a request on devnet, catch it with `settlement-poll`, record it. Fix the
nav. Get the Telegram token into the environment so "a real channel" needs no
explanation.

**Weeks 3–5 — build the certifier.**
Start with the outbound address filter, because it closes a hole that is already
proven to exist. Extract base58 tokens from every outbound message, drop any
that never appeared in a tool result, log the drop. Then generalise to
re-deriving the Solana Pay request and the unsigned transfer from intent.

**Weeks 6–7 — adopt the negative-control discipline.**
Every guard ships with a test that plants the violation and asserts the guard
turns red. A check nobody has watched fail is decoration.

**Weeks 8–10 — one real operator.**
A shop, a market stall, a freelancer invoicing in USDC. Watch them set it up
without help and write down every place they stall. That log is worth more to
the reproducibility score than any rewrite of the README.

**Weeks 11–12 — rebuild the showcase around the new centre.**
The video leads with the fabrication and the certification, not with a QR code.
The till is the demo; the certifier is the claim.

## What is deliberately not being done

- **Not rebuilding the landing page around a large animation library.** The
  audit found no problem the site's animation count solves, and one real
  rendering bug it already has. Fix the bug; leave the rest alone.
- **Not renaming.** `09-NAMING-DECISION.md` settled this, the availability
  checks are done, and a second rename costs a day and buys nothing.
- **Not starting a new project.** The assets that score — an on-chain proof, a
  running daemon, a trap catalogue, and the fabrication transcripts — took weeks
  to accumulate and cannot be regenerated in 80 days from zero.
