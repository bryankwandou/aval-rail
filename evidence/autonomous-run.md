# Live autonomous run — what worked, and the design error it exposed

Run 2026-08-03 against the source-built host (`zeroclaw 0.8.4`), a real Groq
model provider, and the three Caixa procedures. Model `openai/gpt-oss-120b`.

This document is deliberately not a success story. The run proved several things
work and proved one part of my design was wrong. Both are recorded.

---

## Setup

The API key is supplied by environment override, so it never reaches disk:

```
export ZEROCLAW_providers__models__groq__main__api_key=<key>
```

The runtime confirms the path it applied it to, and marks it secret:

```
Secret applied from env override
  {"env_var":"ZEROCLAW_providers__models__groq__main__api_key",
   "path":"providers.models.groq.main.api_key"}

$ zeroclaw config list | grep groq.main.api_key
💉 providers.models.groq.main.api_key = ****  (Option<String>) 🔒
```

The 💉 marks it as env-overridden and the lock marks it secret. Worth knowing
before pointing a camera at a terminal.

## 1. The agent runs

```
$ zeroclaw agent -a caixa -m "Reply with exactly: CAIXA ONLINE"
CAIXA ONLINE
```

Getting there took two corrections, both worth recording:

**A minimal config needs four sections, not two.** A provider and an agent are
not enough — the agent must name a risk profile that exists:

```
Error: agents.caixa.risk_profile does not name a configured risk_profiles entry
```

**The free Groq tier cannot carry ZeroClaw's default tool set.**

```
Groq API error (413 Payload Too Large): Request too large for model
`openai/gpt-oss-120b` ... on tokens per minute (TPM): Limit 8000,
Requested 13970
```

56 registered tools serialise to roughly 14k tokens of schema before the
conversation starts. Narrowing `allowed_tools` on the risk profile fixed it, and
the runtime reports the filtering honestly:

```
Applied capability-based tool access filter
  {"before":56,"policy_allowed":4,"retained":3}
```

Note `policy_allowed: 4` against `retained: 3` — one name in my allowlist did not
match a registered tool, and **nothing warned about it**. A typo in
`allowed_tools` silently narrows the agent's capability. Same failure shape as
the other config traps in `01-BUILD-LOG.md`: this runtime does not complain about
configuration that is merely wrong.

## 2. The agent fires the procedure

```
$ zeroclaw agent -a caixa -m "Call sop_execute with sop_name refund-approval ..."

🔧 Agent wants to execute: sop_execute
   name: refund-approval, payload: {"order_id":"table-4"}
   [Y]es / [N]o / [A]lways for sop_execute:
```

Two observations.

**The model chose the tool and shaped the payload itself** — it read
`table-4` out of the sentence and passed `{"order_id":"table-4"}`.

**A `supervised` risk profile puts a second gate in front of the tool call.**
This is separate from, and earlier than, the SOP's own approval checkpoint.
Declined once with no answer available on stdin, the run never started:

> "The request to start the refund-approval SOP for order table-4 was denied."

Fail-closed on an unanswered prompt. That is a gate I had not documented in the
threat model, and it means an operator running `supervised` gets **two**
independent human checkpoints on a refund, not one.

Approved, the run starts:

```
The refund-approval SOP has been launched (run ID det-1785774515636535600-0001).
```

## 3. The run is durable

Read from a fresh process after the agent exited, straight out of sqlite:

```
$ sqlite3 data/sop/runs.db
tables: sop_runs, sop_events, sop_claims, sop_proposals

run_id   = det-1785774515636535600-0001
sop_name = refund-approval
status   = running
current_step = 1 / 7
terminal = 0
```

And a concurrency lease, which is what enforces `max_concurrent = 1`:

```
sop_claims:
  run_id        = det-1785774515636535600-0001
  sop_name      = refund-approval
  lease_expires = 2026-08-03T17:28:35Z    (one hour)
```

The run survived process exit. That is the claim the threat model makes about a
parked refund surviving a restart, checked rather than assumed.

## 4. Cron fires on its own — and the design error surfaces

Started the daemon and left it alone:

```
$ zeroclaw daemon
🦀 ZeroClaw Gateway listening on http://127.0.0.1:42617
   PAIRING REQUIRED — one-time code: 728876
```

Within the first maintenance tick, **a second run appeared that nobody
started**:

```
det-1785774656040896700-0001   settlement-poll   status=failed   step=1/4
```

The cron trigger fired autonomously. That half worked exactly as designed.

Then it failed:

```
sop_events:
  kind   = headless_driver_missing
  reason = Headless deterministic SOP step 1 'Collect pending charges'
           requires an external driver; it was not executed
```

### What that actually means

From `crates/zeroclaw-runtime/src/sop/engine.rs`, `drive_headless_deterministic`:

```rust
SopRunAction::DeterministicStep { ref step, .. }
    if step.kind == SopStepKind::Capability => { /* executed */ }

SopRunAction::DeterministicStep { ref step, ref run_id, .. } => {
    return self.fail_headless_driverless_step(run_id, &sop_name, step);
}
```

A headless deterministic run executes **only** `kind: capability` steps. Every
ordinary `execute` step fails closed.

And the two capability steps that exist — `llm.generate` and `forge.comment` —
are a bounded model call with no tools, and a git-forge comment. Neither can make
an HTTP request.

Which yields the constraint that broke my design:

> **A cron-triggered SOP has no agent turn behind it, so it cannot call
> `http_request` at all.** A polling procedure that must read the chain cannot be
> a cron SOP.

This is not in the documentation. It is discoverable only by running one.

### The correction

`settlement-poll` was authored as a cron SOP that reads
`getSignaturesForAddress`. That cannot work, and the runtime is right to refuse
it rather than half-run it.

The correct primitive is the **heartbeat**, which schedules a full agent turn —
and an agent turn has tools:

```toml
[heartbeat]
enabled = true
agent = "caixa"
interval_minutes = 5      # floor is 5; 30 is the default
message = "Check pending charges for settlement and report any that landed."
```

The cost of being wrong here is real and worth stating: polling drops from a
one-minute floor to a five-minute floor. A customer who pays and waits will see
the confirmation up to five minutes later, not one. That is a worse product than
the design claimed, and pretending otherwise would be dishonest.

The alternative — keeping a one-minute cron and having it do nothing but
`llm.generate` — is not a payment poller, because it cannot reach the chain.

## 5. The corrected design, running autonomously

The cron poller failed with `headless_driver_missing` and was rewritten onto the
heartbeat. That rewrite is not a paper fix — the replacement runs:

```
$ zeroclaw daemon
   activated_bindings":1, bindings":["telegram.default"]

  [no human involved from here]

   llm_request   {"iteration":1,"messages_count":2,"model":"openai/gpt-oss-120b"}
   llm_response  {"input_tokens":1269,"output_tokens":70,
                  "native_tool_calls":0,"parsed_tool_calls":0}
   heartbeat phase 1: skip (nothing to do)
```

Nobody typed anything. The daemon woke the agent on its own schedule, handed it
the settlement instruction, and the agent ran a real model turn against Groq —
1269 tokens in, 70 out — decided there were no pending charges to check, and
went back to sleep without calling a tool.

Two things worth separating here.

**The scheduling works.** This is the same autonomy the cron trigger promised
and could not deliver, on the primitive that actually has tools behind it.

**The agent declined to act, correctly.** There are no pending charges in this
workspace, so the right answer was to do nothing. `parsed_tool_calls: 0` is the
desired outcome, not a failure — a poller that invents work when there is none
is worse than one that sleeps. ZeroClaw's two-phase heartbeat exists for exactly
this: phase 1 decides whether there is anything to do, and only then does phase
2 spend a full turn on it.

What this does **not** show is the poller finding a real settled payment and
announcing it, because no charge has been created through the live channel yet.
The mechanism is proven; the happy path through it is not.

## What is proven, and what is not

**Proven by this run.** The host builds and runs. The agent loop works against a
real provider. The model selects `sop_execute` and shapes its own payload. A
supervised risk profile gates the tool call and fails closed when unanswered.
Runs persist to sqlite with a concurrency lease and survive process exit. **The
cron trigger fires autonomously under the daemon**, with no human involvement.
The engine fails closed and says exactly why when it cannot execute a step.

**Not proven, and not claimed.** A refund driven all the way to the step-6
checkpoint and cleared by `zeroclaw sop approve`. The run reached step 1 of 7 and
holds there; driving a deterministic run through ordinary steps needs the agent
loop as the external driver, and each step is another model call against an
8000-token-per-minute ceiling. A Telegram channel with a real bot token. A
customer payment against a live charge.

Anyone reading this should treat the settlement path as **redesigned but not yet
re-run**. The refund path is proven up to the gate; the poller is proven only in
the sense that its failure taught the correct architecture.

## The pattern across every finding

Four separate configuration traps in this build, all the same shape:

| What was wrong | What the runtime did |
|---|---|
| `[plugins.entries]` instead of `[[plugins.entries]]` | disabled all plugins, reported `enabled = false` |
| `execution_mode` instead of `default_execution_mode` | silently ran `supervised` |
| a tool name in `allowed_tools` that does not exist | silently narrowed capability |
| a `webhook` SOP trigger | validated, loaded, never fired |

None of these produced an error. Three of them weaken security posture.

**Read every setting back from a surface that shows the parsed value.** Do not
trust the file, and do not trust that silence means agreement.
