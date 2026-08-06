# settlement-poll

Runs once a minute. Looks at every charge still marked pending, asks the chain
whether its reference key has been touched, and tells the operator about the
ones that have settled.

Read-only against the chain. Custody tier T0: the only secret involved is an
RPC endpoint, and the shop can supply its own.

The polling design is deliberate rather than a fallback. A chat-resident agent
has no guaranteed public inbound address, so a webhook push has nowhere to land.
Scheduled reads of transaction history are the transport that actually works
here.

## Steps

1. **Collect pending charges** — Read the charges currently marked pending out of memory. Drop any that have passed the shop's expiry window; a customer who walked away should not leave a charge open forever.
   - output: {"type":"object","required":["pending"],"properties":{"pending":{"type":"array","items":{"type":"object"}}}}

2. **Ask the chain about each reference** — For every pending reference key, request the signatures that mention it. Confirmed signatures only; a processed-but-unconfirmed result is not a payment. Return the shortest useful answer per charge rather than the raw response, because an unshaped RPC reply will flood the context window and bill the operator for it on every tick.
   - tools: http_request
   - depends_on: 1
   - output: {"type":"object","required":["settled"],"properties":{"settled":{"type":"array","items":{"type":"object"}},"still_open":{"type":"number"}}}

3. **Verify what actually landed** — For each signature found, confirm the transfer matches the charge: right recipient, right mint, right amount. A reference key proves a transaction mentioned this order, not that it paid it correctly. An underpayment, a wrong mint, or a transfer to a different address is reported to the operator as a mismatch, never as a payment.
   - tools: http_request
   - depends_on: 2
   - output: {"type":"object","required":["confirmed","mismatched"],"properties":{"confirmed":{"type":"array"},"mismatched":{"type":"array"}}}

4. **Tell the operator** — Post one line per settled charge into the shop's channel: the label, the amount, and the signature. Post mismatches separately and flag them for a human to look at. Mark settled charges closed in memory so the next tick does not announce them again.
   - depends_on: 3
