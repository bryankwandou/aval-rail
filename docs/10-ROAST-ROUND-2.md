# Roast, round two — auditing what I built, not what I intended

No hedging, no credit for effort. Written 2026-08-04, three days out.

---

## Verdict

**I built the worked example from the brief, almost word for word, and then
spent a day polishing it.**

The listing says:

> Video: a phone screen. Someone DMs the shop's WhatsApp: **"charge table 4,
> 25 USDC."** The agent replies with a QR. A customer wallet pays it. Forty
> seconds later the agent posts "Invoice #412 paid ✓" in the owner's channel.

The instruction was explicit: do not build what the competition already names as
an example. The test message I have been sending all evening is *literally*
`charge table 4, 25 USDC`. Not similar. The same string.

Everything below follows from that.

## Scorecard

| Dimension | Score | Why |
|---|---|---|
| Use case (30%) | 4/10 | Real job, zero discovery. It is the brief's own example. |
| Originality multiplier | 2/10 | "Originality counts double." A transcription scores near nothing, doubled. |
| Safety & custody (25%) | 8/10 | Genuinely strong: T1, two gates, fails closed, caps in Rust. The best part. |
| Craft (20%) | 7/10 | Correct layering, real tests, five documented runtime traps. |
| Reproducibility (15%) | 8/10 | Config traps documented at a level the docs do not reach. |
| Showcase (10%) | 5/10 | Written, not filmed. Nothing exists on video yet. |
| "Are YOU running it?" | 2/10 | Running for hours, in a scratch directory, with me as the only customer. |
| **Weighted** | **~55/100** | Competent. Not winning. |

99.5/100 was the target. This is not close, and no amount of copy-editing moves
it, because the problem is upstream of the writing.

## The five things actually wrong

### 1. The idea is the brief's example, and originality is double-weighted

The judges wrote that paragraph. They will recognise it in the first ten seconds
of the video. Handing back the example is the one submission guaranteed not to
"define the field" — it re-enacts it.

Worse: the design regressed against the example. Theirs says *forty seconds*.
Mine, after the cron finding, floors at **five minutes**, because a heartbeat is
the only primitive that can poll with tools. I am shipping a slower version of
their illustration.

### 2. The one original thing is buried

Trap #1 in the listing:

> Blockhash expiry... **Solving this well is worth points.** Durable nonces
> solve it, with three gotchas: rent, AdvanceNonceAccount ordering, and **one
> nonce account serializes to one in-flight transaction — parallel pending
> approvals need a nonce account each.**

That last clause is an unsolved problem stated in the open, and I proved the
core of it on devnet: a transfer that survived four and a half hours past
blockhash expiry, nonce advanced, replay closed.

Then I put it in section three of a page about a café.

The till is the least interesting thing I built. The durable approval rail is
the thing nobody has built, the thing the brief flags as worth points, and the
thing that survives when the counterparty stops being a café.

### 3. `max_concurrent = 1` is a design admission, not a feature

I wrote it as a safety property. It is not. One nonce account serializes to one
in-flight transaction, so a shop with two pending refunds **queues the second
one**. Two customers on a Friday night and the till stalls.

The brief names the fix — a nonce account each — and I did not build it. A
**nonce pool** (lease an account per pending approval, return it on
settle-or-expire, garbage-collect leaked leases) is the actual missing
infrastructure. It is also exactly what the listing calls a valid builder's use
case competing for a top prize.

### 4. Nobody runs this

30% of the score asks whether *I* run it and whether a stranger still would in a
month. Honest answer: it has run in a temp directory for one evening, with a bot
I created two hours ago, against devnet, with zero real customers. No shop has
ever used it. The five-minute settlement delay guarantees no shop would.

### 5. The prompt-injection transcript is written, not recorded

The brief: *"Transcript required."* Mine is authored prose describing what would
happen. The runtime is now live and I have the tools to actually run the attack
and capture the refusal. Until that exists, the strongest section of the
submission rests on my say-so — which is precisely what the judges are
screening for.

## Sins detected

- **Solution in search of a demo.** The nonce work came first; the café was
  reverse-engineered onto it to satisfy "use case, not component."
- **Two names for one product** (fixed today, but it existed for a day).
- **Documentation substituting for traction.** 15,000 words, one evening of
  uptime. Volume is not evidence.
- **Confusing rigor with originality.** Every trap I found is real and useful.
  None of them make the *idea* new.

## What actually has value here

Stated plainly because it decides the pivot, not to soften anything:

The four documented runtime traps — silent `[plugins.entries]`, silent
`execution_mode`, silently-dropped tool names, and the one found tonight where a
missing `schema_version` discards the entire provider block while the daemon
boots happily — plus `headless_driver_missing`, are worth more to another
operator than the café is. They are undocumented, each costs an evening, and
three of them silently weaken security.

That is a **reliability contribution to the runtime**, and it is the only part
of this submission a stranger would still be using in a month.

## The pivot

Stop leading with the till. Lead with the thing the brief says is unsolved.

**Aval: the durable approval rail for agent payments — and the nonce pool that
makes more than one approval possible at a time.**

1. **Nonce pool.** Lease-per-pending-approval, return on settle-or-expire,
   reap leaked leases. Kills `max_concurrent = 1`. Directly answers the clause
   the brief leaves open.
2. **Fail-closed re-verification.** Already built: decode the transaction bytes
   and re-check destination, mint, cap and nonce currency against the chain
   before the human ever sees it. The verdict comes from bytes, never from the
   conversation. The brief lists this ("fail-closed action certification") as
   frontier work.
3. **The traps, as a hardening note**, not an appendix.
4. **The café demoted to the demo it always was** — one screen proving the rail
   works, thirty seconds of the video, not the thesis.

Same code. Same devnet proof. Different claim — and the claim is what is being
judged.

## Fix these three, in this order

1. **Reframe to the rail and build the nonce pool.** Highest impact and the
   only thing that moves originality off the floor. The pool is a lease table
   and a reaper — hours, not days.
2. **Run the injection attack for real and capture the refusal.** Cheapest win
   on the board. The daemon is live; the attack message is two lines. It
   converts the 25% safety section from assertion to evidence.
3. **Fix the Vercel 403.** Existential and still open. A judge who opens the
   link sees a challenge page. Two minutes in a dashboard, and it silently
   invalidates everything else until it is done.

## What I will not pretend

Three days left. The pool is buildable; a month of shop traction is not. The
honest submission says: here is an unsolved problem in the brief, here is the
mechanism, here is the on-chain proof it survives, here is the till proving the
shape, and here is everything that broke on the way — including the parts still
broken.

That is a strong third place. First place belongs to whoever has a real
merchant taking real payments, and I do not have one and cannot manufacture one
by Thursday.
