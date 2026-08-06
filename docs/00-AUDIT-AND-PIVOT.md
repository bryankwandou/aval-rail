# Aval — audit, roast, and the pivot that saves the submission

Written 2026-08-03. Deadline: 2026-08-07 (~3d 15h at time of writing).
Prize pool 5,000 USDG (1st 1,800 / 2nd 1,200 / 3rd 1,000 / 4x 250 bonus).
98 submissions already in at time of audit.

---

## Part 1 — What was verified, not assumed

Claims in the old deliverables index were checked against reality rather than
taken on faith.

| Claim | Verdict | Evidence |
|---|---|---|
| Plugin tests green | TRUE | `cargo test --release`: nonce-vault-init 5/5, durable-tx-build 18/18, approval-recheck 13/13. Zero failures. |
| Landing page public | TRUE | `aval-rail.vercel.app` returns HTTP 200 to anonymous request |
| GitHub Pages mirror live | TRUE | `bryankwandou.github.io/aval-site/` returns 200 |
| PR #98 exists | TRUE | returns 200 |
| `docs/reports/` delivered | **FALSE** | directory does not exist on disk |
| "Disable Vercel protection" action pending | **STALE** | already resolved; doc still instructs the reader to fix it |
| Git history real | TRUE | 4 Aval commits on branch `aval-suite`, clean working tree |

Two provably-false statements were being carried into a submission. Both are
corrected in this pass.

---

## Part 2 — The roast (no positive affirmation, scored against a 110-point rubric)

**One-line verdict:** technically honest, well-tested plugin code wrapped in a
submission strategy that the bounty rules reject outright.

| Dimension | Score | Reasoning |
|---|---|---|
| Value proposition (2x) | 16/20 | "Agent proposes, you co-sign later, the transaction survives" reads in one pass. Only lands for a reader who already knows what blockhash expiry costs them. |
| Crypto necessity | 9/10 | Durable nonces are an L1 primitive. Replace the chain with a database and there is no product left. |
| Target user clarity | 6/10 | "ZeroClaw plugin authors needing approval-gated payments" is real but small, and the population size was never verified. |
| First-time experience | 5/10 | Page loads, but the shipped instructions send a reader to fix something already fixed. |
| Core loop | 4/10 | Infrastructure has no daily return loop. Structural to the category, not a defect — but the rubric still docks it. |
| Competitive moat | 5/10 | The mechanism is fully described in a public README. A competent Rust developer reproduces it over a weekend. Being first into the registry is the only moat. |
| Technical execution | 8/10 | Test counts verified true. Clean split between pure core and wasm shim. Integer-only money math. Token-2022 refused honestly instead of mishandled quietly. |
| Naming and messaging | 8/10 | Short, ownable, ties to the sponsoring region's own vocabulary, tagline doubles as the explanation. Carries no meaning outside Brazil until the tagline lands. |
| Monetisation | 2/10 | Absent from every artifact. Fine for a bounty; fatal for the stated ambition of turning this into a company. |
| Market timing | 8/10 | Correct wave, correct week, deadline imminent. |

**Total: 71/110.** Strong tier, dragged down by strategy rather than code.

---

## Part 3 — The disqualification risk nobody had noticed

This is the finding that matters more than every score above.

The listing states, in three separate places:

> "We are not accepting just standalone plugin PRs as submissions."

> "A plugin with no use case around it. Components are not submissions here."

> "We are judging use cases, not components. A plugin nobody uses is not a
> submission. A use case someone runs every day is."

The prior Aval submission is exactly three plugins and a landing page. No agent.
No channel. No job being done. Under the published rules that is not a weak
submission, it is a rejected one.

A second rule was also being broken:

> "Don't open registry PRs during the bounty."

PR #98 against `zeroclaw-labs/zeroclaw-plugins` was opened as the centrepiece of
the submission. The listing says registry merges happen after judging and that
maintainers invite the strongest implementation per family. Leading with the PR
reads as ignoring the brief.

Third, the submission mechanism assumed in `submission-pack.html` does not
match the real one. There is no "paste the description into Earn and flip the PR
to ready" flow. The real requirement is a showcase post in `#solana-bounty` on
the ZeroClaw Discord carrying a video of three minutes or less plus a written
report, with the Earn form collecting links to that material.

---

## Part 4 — The pivot

Keep every line of the plugin code. It is tested, it is correct, and it solves
the trap the brief calls out by name. Change what surrounds it.

The plugins stop being the submission and become the machinery underneath a
submission. The submission becomes a running agent doing a job on a real
channel, in the shape the listing itself describes as the winning example:

- an operator messages the shop's channel: charge table four, 25 USDC
- the agent builds the charge and returns a payment request
- the payer settles it from their own wallet
- the agent confirms the payment back into the operator's channel
- refunds and anything above a cap stop at a human approval checkpoint

Custody stays at T1: the agent builds, a human signs, no key is ever held. The
durable-nonce work is what lets the approval checkpoint take as long as a human
actually takes, which is precisely trap #1 from the brief, solved inside a use
case instead of in a vacuum.

---

## Part 5 — Ordered plan against the clock

1. Build the ZeroClaw host from source with `--features plugins-wasm-cranelift`,
   because judges score against exactly that bar. (Started, long compile.)
2. Wire the agent: channel, SOP with cron polling, approval checkpoint, config.
3. Run it end to end against Solana devnet and capture the evidence.
4. Record the prompt-injection attempt and its refusal, from the running system.
5. Record the video, three minutes maximum, terminal plus phone.
6. Write the showcase post: what it does, who for, which ZeroClaw features,
   what was built, custody tier, threat model, reproduction steps.
7. Post to `#solana-bounty`, then fill the Earn form with the links.
8. In parallel: brand and landing page work, which does not block the above.

---

## Part 6 — The monetisation gap, stated plainly

Nothing in the project answers who pays. For a bounty that is acceptable, since
none of the five judging criteria is revenue. For the stated goal of growing this
into a company it is the single largest hole.

Three honest paths, one of which has to be chosen in writing:

1. **Absorbed.** The approval rail is the kind of thing a wallet vendor or an
   agent runtime buys rather than licenses. The outcome is an acquisition or a
   maintainer role, not a business.
2. **Generalised.** `aval-core` stops being ZeroClaw-specific and becomes the
   durable-nonce approval layer any agent framework can adopt. Revenue would come
   from hosted infrastructure around it, not the crate.
3. **Capped.** Win the bounty, get merged upstream, stop. A credential rather
   than a company.

Path 2 is the only one that supports the stated ambition. It also implies the
work does not end at ZeroClaw, and that the naming and positioning should stop
being framed around a single runtime.
