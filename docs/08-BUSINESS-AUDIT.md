# Caixa — business model audit, without the flattery

The instruction was to attack this rather than affirm it. So the structure below
is: what the thing actually is, where it breaks as a business, and what the
strongest defensible version looks like. Sections that would normally be
optimistic are written as adversarially as the evidence allows.

---

## 1. What is really being sold

Strip the framing away and Caixa is: **a chat-native till that settles in
stablecoins, whose distinguishing feature is that its approval queue does not
expire.**

That last clause is the only genuinely novel part. Everything else — QR
payments, chat interfaces, settlement polling — exists in a dozen products.

Be precise about the size of the innovation, because overstating it is how this
loses credibility with anyone technical: **durable nonces are a documented
Solana primitive from 2020.** Using them is not an invention. The insight is
noticing that approval-gated agent payments are structurally broken without
them, and that nobody in a 98-submission field had wired them into a use case.
That is a *good observation*, not a *moat*.

---

## 2. Business Model Canvas, with the weak cells called out

### Customer segments
Small merchants who already take digital payment and would take stablecoins if
setup cost an evening. Brazil-first, because that is where the sponsor's
distribution is and where PIX has already trained merchants to expect instant
settlement.

**Weakness:** this segment is notoriously hard to sell to, price-sensitive, and
has near-zero tolerance for anything that breaks during service. They also do
not currently want stablecoins. Demand here is assumed, not evidenced. Nobody has
been interviewed.

### Value proposition
Take USDC without buying hardware; refunds wait for you instead of expiring.

**Weakness:** the second half is a benefit only to someone who already
experienced the pain. A merchant who has never run an agent-gated refund does not
know that ninety-second expiry is a problem, so the differentiator is invisible
at the point of sale. **The wedge feature is unmarketable to the target
customer.** That is a serious positioning problem, and it is the single most
important line in this document.

### Channels
The ZeroClaw community, the bounty itself, and Superteam Brasil's network.

**Weakness:** all three are the same small pond. There is no channel to actual
merchants. Winning the bounty reaches developers, not cafés.

### Revenue streams
None. There is no pricing, no take rate, no subscription.

**Weakness:** the honest options are all unattractive at this stage. A take rate
on payments makes it a payment processor competing with Stripe and PIX on cost.
A subscription to self-hosted software the operator runs on their own machine is
hard to enforce and philosophically at odds with the "you own the agent" thesis
the runtime is built on. Selling support is a services business, not a startup.

### Key resources
The durable-nonce components, the SOP design, and — realistically — the
credibility of having solved the trap the brief named.

### Cost structure
Effectively zero marginal cost, since the operator runs the software and supplies
the RPC. Which also means near-zero lock-in.

---

## 3. SWOT, weighted honestly

**Strengths.** The chain-level claim is proven, not asserted, and reproducible in
four minutes without a build. The custody story is unusually strong — not "keys
are protected" but "no code accepts a key". The injection defence is
architectural rather than filter-based, which is a genuinely better design than
most agent payment systems ship. The correct-layering discipline (refusing to
compile things that should be a skill) reads as engineering judgment, and the
brief scores it explicitly.

**Weaknesses.** No revenue model. No merchant interviewed. The differentiator is
invisible to the buyer. The moat is a weekend of work for a competent Rust
developer who reads the public README. Single-operator deployment means no
network effect of any kind. And the thing it improves — refund latency — is a
rare event in a small shop's day, which means the headline benefit applies to
maybe one transaction in fifty.

**Opportunities.** Agent-to-agent payments are arriving and every one of them has
the same approval-expiry problem, in a setting where the "human is at lunch"
framing becomes "the counterparty agent is rate-limited". The generalised version
— a durable approval layer any agent framework can adopt — is a much larger
market than tills. Brazilian stablecoin adoption is real and accelerating.

**Threats.** ZeroClaw could absorb this into core, which would be flattering and
fatal. A wallet vendor could ship approval-queue durability as a feature. And the
most likely threat is neither: the segment simply does not adopt stablecoin
payments fast enough to matter, and the product is correct and unused.

---

## 4. The strategic question nobody has answered

Three futures, and they are mutually exclusive:

**A — The till.** Sell Caixa to merchants. Requires a merchant go-to-market, PIX
reconciliation, BRL invoicing, and support. This is a payments company. The
durable-nonce work becomes an implementation detail nobody outside pays for.
Hardest path, largest market, worst fit for the current skill set.

**B — The rail.** Generalise `aval-core` into the durable approval layer that any
agent framework adopts. The customer is a framework or wallet, not a merchant.
Caixa becomes the reference implementation that proves the rail — which is
exactly what it already is. Revenue comes from hosted infrastructure or an
enterprise tier, not from the crate.

**C — The credential.** Win, get merged, stop. A very good line on a CV and a
strong open-source contribution. Not a company, and there is no shame in that.

**The recommendation is B, and the current work is already 80% of the way there
by accident.** Caixa exists to prove the rail is real; the rail is the asset.
Path B also explains why the positioning should stop being ZeroClaw-specific: a
layer that only works inside one runtime is a plugin, and plugins do not become
companies.

The concrete implication: `aval-core` should be framework-agnostic and the
messaging should stop leading with ZeroClaw. Not before the deadline — after it.

---

## 5. Hard questions, answered without hedging

**"Why would a shop use this instead of PIX?"**
Today, it mostly would not. PIX is instant, free, and universal in Brazil. The
honest answer is cross-border and dollar-denominated receipts — a shop with
tourist customers or one that wants USD exposure without a bank. That is a
narrower segment than "small merchants" and the pitch should say so.

**"What stops ZeroClaw from building this?"**
Nothing. It should be assumed they will, or that they will invite the strongest
implementation upstream — the listing says exactly that. Being the invited
implementation is the realistic win condition, not defending territory.

**"Is the durable nonce actually necessary, or is it a solution looking for a
problem?"**
Necessary for approval-gated payments; unnecessary for everything else. In a
café that refunds twice a week, it matters twice a week. In agent-to-agent
settlement where every transaction is gated, it matters constantly. The second
setting is the real market, which is another argument for path B.

**"What is the single most likely reason this fails?"**
Not competition and not technology. It is that no merchant is ever interviewed,
the product stays correct and unused, and the team mistakes bounty placement for
market validation. Those are different signals and it is very easy to confuse
them for six months.

---

## 6. What would move this from strong to unarguable

Ordered by effect per hour spent, and none of these are pre-deadline work except
the first:

1. **Run it for a week on something real.** Even one merchant, even the author's
   own transactions. "I have been running this daily" answers the bounty's
   loudest question — *are YOU running it?* — better than any amount of polish.
2. **Interview five merchants.** Not to validate; to find out that the assumption
   is wrong while it is still cheap.
3. **Show the rail working outside ZeroClaw.** One other framework, even crudely,
   converts "plugin" into "layer" and unlocks path B.
4. **Instrument the approval latency.** Publish the actual distribution of how
   long humans take to approve. Nobody has that data and it is the empirical
   justification for the entire product.

---

## 7. Scoring, against the criteria that actually apply

Not the generic startup rubric — the bounty's own weights, which is what the
next four days are judged on.

| Criterion | Weight | Standing | Why |
|---|---|---|---|
| The use case | 30% | strong | A real job, on a real channel, in the shape the brief describes as winning. Weak point: not yet run daily by the author. |
| Safety and custody | 25% | strongest | Tier honest, no key exists, injection defeated architecturally rather than by filter, failure modes published. |
| Craft | 20% | strong | Correct layering, refusing to compile what should be a skill, real tests, honest refusals over silent mishandling. |
| Reproducibility | 15% | good | Config, SOPs, skill and a four-minute proof needing no build. Untested claim: that an operator really can do it in an evening. |
| Showcase | 10% | pending | Video not recorded. This is the only criterion currently at zero. |

The gap between where this stands and where it could stand is almost entirely
the video and one week of daily use — not more code.
