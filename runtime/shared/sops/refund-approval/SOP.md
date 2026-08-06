# refund-approval

A refund sends money out of the shop, so it is the one thing here that stops for
a human. The agent prepares it, states plainly what it will do, and waits. The
owner signs when they get to it — after the lunch rush, that evening, the next
morning.

That last sentence is the whole reason this procedure exists in this shape.

A transaction anchored to a recent blockhash dies about ninety seconds after it
is built. An approval queue that a human answers in ninety seconds is not an
approval queue, it is a formality. So the refund is anchored to a durable nonce
account instead, and it stays valid until it is either used or deliberately
cancelled. The gate can take as long as a person actually takes.

Custody tier T1. The agent builds an unsigned transaction and never holds a key.
What the owner signs is the exact bytes that execute.

## Steps

1. **Read the refund request** — Pull the order reference and the amount out of the operator's message. A refund names an existing settled charge; a refund to a free-typed address with no order behind it is refused here.
   - output: {"type":"object","required":["order","amount"],"properties":{"order":{"type":"string"},"amount":{"type":"string"}}}

2. **Find the original payment** — Look up the settled charge and read the payer's address off the transaction that actually paid it. The destination comes from the chain, not from the message that asked for the refund. This is the step that makes the obvious attack pointless: a message can ask for a refund, but it cannot choose where the money goes.
   - tools: http_request
   - depends_on: 1
   - output: {"type":"object","required":["payer","original_amount","mint"],"properties":{"payer":{"type":"string"},"original_amount":{"type":"string"},"mint":{"type":"string"}}}

3. **Check it against the rules** — The refund cannot exceed what was paid, the mint has to match the original, and the amount has to sit under the shop's refund ceiling. These are enforced in code before anything is built, not asked of the model. A request that fails any of them stops with a refusal naming which rule it broke.
   - depends_on: 2
   - output: {"type":"object","required":["accepted"],"properties":{"accepted":{"type":"boolean"},"reason":{"type":"string"}}}
   - when: $.steps.3.accepted == "true"
   - next: 4

4. **Build it against the nonce vault** — Construct the unsigned transfer anchored to the shop's durable nonce account, with the advance-nonce instruction first as the runtime requires. The mint allowlist and the per-transaction cap are applied inside the component before any network call.
   - depends_on: 3
   - output: {"type":"object","required":["transaction","nonce_account"],"properties":{"transaction":{"type":"string"},"nonce_account":{"type":"string"}}}

5. **Re-read it from the bytes** — Decode the transaction that was just built and re-check it against the chain: is the nonce still current, does the destination still match the payer from step 2, is the source funded for this amount. The verdict is read out of the transaction bytes, never out of the conversation that produced them. Anything short of a clean result is surfaced as-is rather than explained away.
   - depends_on: 4
   - output: {"type":"object","required":["verdict"],"properties":{"verdict":{"type":"string"},"detail":{"type":"string"}}}

6. **Wait for the owner** — Present the refund for approval: who is being paid, how much, in which token, against which order, and the verdict from the previous step. The run parks here and holds. It survives a daemon restart, and it releases its execution slot while it waits, so the shop keeps taking payments in the meantime.
   - kind: checkpoint
   - requires_confirmation: true
   - depends_on: 5
   - next: 7

7. **Hand it back to be signed** — On approval, return the unsigned transaction to the owner to sign from their own wallet, then report the result into the channel. On denial, the run is cancelled and the refund is recorded as refused. Either way the decision lands in the approval ledger.
   - depends_on: 6
