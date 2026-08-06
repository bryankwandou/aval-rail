# charge-request

The owner types a charge into the shop's Telegram. The agent turns it into a
Solana Pay request the customer can settle from any wallet, and records the
reference key so settlement-poll can recognise the payment later.

Nothing in this procedure holds a key or moves money. A Solana Pay transfer
request is a string; the customer's own wallet builds and signs the transaction.
Custody tier T0/T1 throughout.

## Why this is three steps and not five

It was five. Steps 3 and 4 asked the model to mint a reference key and assemble
the transfer URL, and a language model can do neither: a reference key is 32
bytes of entropy, and the URL has exact percent-encoding rules. Given no tool
that fit, the model reached for the only one it had and invented endpoints:

```
http_request GET https://example.com/generate-reference-key
http_request GET https://api.example.com/shop/token/verify?token=USDC
```

Neither exists. It did not report that it was stuck — it fabricated a plausible
URL. Both steps are now one call to `solana_pay_build`, which does the work in
Rust and is granted no network permission at all, so it cannot be talked into
reaching for an endpoint.

The old step 2 checked the amount against the shop's ceiling and the token
against its allowlist. The plugin enforces both in code now, reading them from
the operator's config rather than from arguments — so no message arriving in the
channel can raise a limit by supplying a field. A model step re-checking what
Rust already enforces buys a model call and no safety, so it is gone.

Token cost is the other half of the reason. Each step is a separate model call
carrying the conversation, roughly 2,600 tokens. Five steps is about 13,000
against a 12,000-per-minute free-tier ceiling, and the run died mid-procedure at
step 4 with `rate_limit_exceeded`. Three steps fits.

## Steps

1. **Read the charge** — Pull the amount, the token, and the table or order label out of the operator's message. Reject anything that does not name all three. Amounts are decimal strings, never floats.
   The three keys are named `amount`, `token` and `label`; `label` holds the table or order name, whatever the incoming payload happened to call it (`order_id`, `table`, `order`). Copying the payload's own key names through is the common way this step fails. Reply with the JSON object alone and nothing else — no prose, no explanation, no code fence. `step_schema_enforce` rejects a step whose output is not the declared shape, and a reply that merely describes the values fails the run here.
   - output: {"type":"object","required":["amount","token","label"],"properties":{"amount":{"type":"string"},"token":{"type":"string"},"label":{"type":"string"}}}

2. **Build the payment request** — Call `solana_pay_build` with the label, amount and token from step 1. It mints the reference key, enforces the shop's ceiling and allowlist, and returns the transfer request. Do not compose a `solana:` URL by hand and do not invent a reference. If the tool refuses, the charge does not happen and its refusal text goes back to the operator unchanged.
   - tools: solana_pay_build
   - depends_on: 1
   - output: {"type":"object","required":["url","reference"],"properties":{"url":{"type":"string"},"reference":{"type":"string"}}}

3. **Post it to the operator** — Send the transfer request and a one-line summary back into the channel the request arrived on: the label, the amount, the token, and a short reference stub the operator can quote. Record the charge in memory as pending, keyed by the reference, so settlement-poll can find it.
   - depends_on: 2
