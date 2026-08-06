# Demo video — script, voiceover, and publishing copy

Three minutes maximum, per the brief. No slides. Terminal on the left, phone on
the right. One continuous take if possible; the brief rewards a real run over a
polished edit.

**Do not record the full charge beat until the step-4 blocker below is cleared.**
A video of a charge that does not complete is worse than no video, because the
reviewers read the terminal.

---

## What is recordable today, and what is not

| Beat | State |
|---|---|
| Durable nonce beats blockhash expiry, on devnet | Recordable. Explorer links resolve. |
| Host built from source, three SOPs validate | Recordable. |
| Telegram bound, heartbeat fires unattended | Recordable. |
| Charge request, steps 1 through 3 | Recordable. `step_promoted` three times. |
| Charge request, steps 4 and 5 | **Not recordable yet.** See below. |
| Injection attack, and what actually held | Recordable, with the honest caveat. |

Two things stand between this and a complete run. Neither is hand-waving.

**The free Groq tier cannot carry a five-step procedure.** Every step is a
separate model call carrying the conversation — roughly 2,600 tokens each. Five
steps is about 13,000 tokens against a 12,000-per-minute ceiling on
`llama-3.3-70b-versatile`, or 8,000 on `gpt-oss-120b`. The run dies at step 4
with `rate_limit_exceeded`, mid-procedure:

```
>> charge-request  failed  step 4 / 5
   step_promoted
   step_promoted
   step_promoted
```

Three steps executed correctly and the fourth hit a quota wall. This is a
billing limit, not a logic error, and it is worth stating plainly in the
write-up: a deterministic multi-step SOP is expensive in a way a single agent
turn is not, and the free tier is not sized for it.

**Step 3 asks for something no tool can do.** "Mint a reference key" is local
keypair generation. The agent's toolset is `http_request`, `sop_execute`,
`sop_status`. Given no tool that fits, the model invented one:

```
Agent wants to execute: http_request
  method: GET, url: https://example.com/generate-reference-key
```

There is no such endpoint. Rather than reporting that it could not proceed, the
model fabricated a plausible URL — the third time in this project that a model
has invented a result instead of failing. A reference key has to come from code:
a plugin, or a `kind: capability` step. Until it does, step 3 produces a
reference the shop cannot verify.

---

## Shot list

**0:00–0:20 — the problem, stated once**

Screen: terminal, `solana confirm` on the control transfer.

> A payment waits for a human to approve it. The human is at lunch. Ninety
> seconds later the blockhash is dead and the transaction is garbage. That is
> the structural problem with putting an approval gate in front of an agent's
> payments, and it is the reason this exists.

**0:20–0:50 — the proof, on-chain**

Screen: split. Left, the control transfer returning `Hash has expired`. Right,
the durable-nonce transfer, finalized four and a half hours after it was built.

> Same wait, two transactions. The ordinary one expired. The nonce-anchored one
> finalized after four and a half hours in the queue. The recipient was
> generated unfunded and never airdropped, so its balance came from this
> transfer and nothing else. Both are on devnet, both are linkable.

**0:50–1:30 — the shop**

Screen: phone, Telegram. Owner types `charge table 4, 25 USDC`. Terminal beside
it shows the run advancing, step by step.

> The owner types a charge the way they would tell a waiter. The procedure reads
> it, checks it against the shop's ceiling, and builds a Solana Pay request. No
> key is held anywhere in this path — the customer's own wallet builds and signs.

**1:30–2:00 — settlement**

Screen: terminal, heartbeat waking on its own.

> Nobody typed this. The daemon wakes the agent every five minutes and asks
> whether anything settled. When there is nothing to do, it says so and goes
> back to sleep.

**2:00–2:40 — the attack**

Screen: terminal, the injection run.

> A message asks for a refund to a different address, phrased like ordinary
> business. The model does not refuse it. Watch the counter instead:
> `native_tool_calls: zero`. No tool ran, no key exists, and a refund
> destination is read from the transaction that paid the order — not from the
> message. What held was structure, not the model's judgement. The model failed
> this test. The system did not.

**2:40–3:00 — reproduce it**

Screen: the config file.

> Config, procedures, and the build log are in the repo, including the five
> silent misconfigurations that cost me an evening each. Every one of them
> started the daemon successfully and did nothing.

---

## Voiceover notes

Read it flat. No enthusiasm and no rising inflection on the proof beats — the
terminal is the evidence and the voice should stay out of its way. Pause a full
beat before "The model failed this test."

Two words to avoid, because a reviewer will check them against the terminal:
**"secure"** and **"proven"**. Say what ran instead.

Do not say seamless, powerful, revolutionary, or leverage. Do not say the agent
is safe. Say it holds no keys — that is the actual claim and it is stronger.

---

## YouTube title

Primary:

> Aval — an agent that takes payments and never holds a key

Alternatives if the primary reads too quiet:

> A Solana payment terminal that survives its own approval queue
> Durable nonces vs the 90-second blockhash: an agent payments build

Avoid a question-mark title, and avoid "AI" in first position. The audience here
is operators and judges, not a general feed.

## YouTube description

```
A shop till that runs inside Telegram. The owner types "charge table 4,
25 USDC" and gets back a Solana Pay request the customer settles from any
wallet. The agent holds no private key at any point.

Built on ZeroClaw — a self-hosted agent runtime written in Rust — against
Solana devnet.

The problem it solves: an approval-gated payment dies in the queue. A
transaction's blockhash expires roughly 90 seconds after it is built, so a
refund waiting on a human is worthless by the time that human answers. This
build anchors those transactions to a durable nonce account instead, and the
proof is on-chain — a control transfer expired while a nonce-anchored one
finalized four and a half hours later.

Custody tier T1: the agent builds unsigned transactions and Solana Pay URLs, and
a human or the customer's wallet signs. No key exists for it to misuse.

Includes a prompt-injection test that the model fails and the system survives,
and a write-up that says so rather than hiding it.

Chapters
0:00  The 90-second problem
0:20  On-chain proof: expired vs finalized
0:50  Charging a table from Telegram
1:30  Unattended settlement polling
2:00  Prompt injection, and what actually held
2:40  Reproducing it

Repo, config, SOPs and build log: <REPO URL>
Built for the Superteam Brasil x ZeroClaw bounty.

Everything here runs on devnet. Nothing in this video moves mainnet funds.
```

## Tags

`solana` `zeroclaw` `ai agents` `solana pay` `durable nonce` `rust`
`self-hosted` `agent security` `prompt injection` `devnet`
