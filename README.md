# Aval

Aval is a shop till for the [ZeroClaw](https://github.com/zeroclaw-labs/zeroclaw)
agent runtime. The owner types a charge the way they would tell a waiter, the
agent turns it into a Solana Pay request, and the customer's own wallet pays it.
The agent holds no key on that path and signs nothing.

Site: [aval-site.vercel.app](https://aval-site.vercel.app) · Telegram:
[@avalrailbot](https://t.me/avalrailbot) · Source: this repo

**The flagship problem** is the one this bounty names first: a Solana blockhash
expires in about ninety seconds, so an approval gate in front of an agent's
payment kills the transaction before anyone answers. Aval keeps the human and
fixes the clock — it anchors the transaction to a durable nonce, and the request
waits as long as the shop does. The full write-up, with on-chain proofs, is in
[SHOWCASE-POST.md](SHOWCASE-POST.md); every claim is re-runnable from
[VERIFICATION.md](VERIFICATION.md).

## Check it in 30 seconds (no keys, no wallet, no clone)

Two transactions were signed at the same moment and submitted after the same
wait. Ask public devnet what happened to each:

```bash
# the nonce-anchored one — Finalized, 4h29m after signing
curl -s https://api.devnet.solana.com -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getSignatureStatuses","params":[["5U2c5RV3TEurNYFeC7r17jK5CWkRgMzwEsxA978M9DLLYhjx38JmUkK1yVG5qiXVqo9z2XPRbesXfgNeuBbQZnj7"],{"searchTransactionHistory":true}]}'

# and a customer's payment, found by the reference key alone —
# exactly the call the settlement SOP makes every five minutes
curl -s https://api.devnet.solana.com -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getSignaturesForAddress","params":["Dh3ike7G5GVyDP6wnrjxuWyxQ8cJGCxVjvcgebDHhrqd",{"limit":5}]}'
```

The first returns `confirmationStatus: finalized`. The second returns one
signature and no others — which is what makes settlement detectable when many
orders share a single shop wallet.

To run the agent itself (Telegram, approval gate, the wasm tools) follow
[VERIFICATION.md](VERIFICATION.md) §6.

## The name

*Aval* is Brazilian Portuguese for guaranteeing someone else's obligation by
adding your signature to it — historically written across the back of a bill of
exchange, over the note rather than beside it. That is what the product does:
the agent proposes a payment, and a person's signature is what makes it real.
The mark is an **A** whose crossbar is that endorsement stroke, overshooting the
letterform, because the guarantee is wider than the thing it guarantees.

`Caixa` — Portuguese for the till — is the name of this shop's deployment. One
brand: *Caixa is the till; it runs on Aval.*

## Why Aval exists

ZeroClaw runs as one binary on your own machine, with your model and your keys.
That is its strength and its risk. When an agent can move money, the model
becomes a path to your wallet, and the model reads messages you do not control.

Most designs answer this by removing the human. They do not mean to — they are
forced to, because a blockhash cannot survive a person who is serving a table.
Aval refuses that trade. The durable nonce makes the approval affordable, and
everything that could move money stays at the safe end of the custody ladder:
the component builds a string, the customer's wallet signs, and the limits live
in compiled Rust that no message can argue with.

This is not theory. Four separate times during this build the model reported
work it had never done, including `"Table 4 has been charged"` with
`native_tool_calls: 0` behind it. Every fix was the same move: take the decision
off the model.

## The pieces

| Component | Tier | Holds | What it does |
|---|---|---|---|
| [`solana-pay-build`](caixa) | T1 | nothing | Mints the reference key and builds the transfer request. Ceiling and token allowlist read from operator config and enforced here. `permissions = ["config_read"]` — no network at all. |
| [`durable-tx-build`](caixa) | T1 | nothing | Builds the nonce-anchored transaction a human signs, with `AdvanceNonceAccount` first. |
| `charge-request` SOP | T1 | nothing | One sentence in, one payment request out. Three steps. |
| `settlement-poll` SOP | T0 | RPC key | Cron. Asks the chain whether a reference key has been used. Declines to invent work when there is none. |
| `refund-approval` SOP | T1 | nothing | Two independent human gates. An unanswered prompt denies. Destination is read from the paying transaction, never from a message. |
| [`till`](video/till) | — | bearer token | The shop's page. Keeps the token server-side, and exposes `/truth`, which calls Telegram's API rather than trusting the daemon's own health. |

**No tool here can sign or submit.** T2 is not shipped.

## Proven on devnet

| | signature |
|---|---|
| Durable nonce vs blockhash | `5U2c5RV3TEurNYFeC7r17jK5CWkRgMzwEsxA978M9DLLYhjx38JmUkK1yVG5qiXVqo9z2XPRbesXfgNeuBbQZnj7` |
| SOL settlement | `2enW3Y91s9GSCYdyW4axdBirf2Poc6qEtxRPzGDa9PWbSsu6hWMisRYMqfCLQmk4QfamVXB3KmXrmAS5ELfKKyha` |
| SPL settlement | `5hFq5bnkpHFzcNa5K5aN64SupGGBaREyQGAvmUjuxF3yJeuTdgEnQsoTWSaWBBQ5wdypHMVfKd2NnuEAZDVQ75Gx` |

The nonce recipient was generated unfunded and never airdropped, so its balance
came from that transfer and nothing else. The nonce advanced after use
(`7tfvBRBM…` → `A8zkZeDL…`), which closes replay.

## Every guard ships a test that proves it can fail

```bash
cargo test --test negative_controls     # 9, in the plugin
node video/till/filter.test.js          # 6, outbound address filter
```

Each plants the violation and asserts the refusal, **then** asserts the same
input passes once the violation is removed — so a deleted guard fails the first
half, and a test passing for the wrong reason fails the second. A check nobody
has watched fail is decoration.

## What broke, published because it is the useful part

Nine silent configuration traps, each of which started the daemon successfully
and did nothing. Two are upstream defects rather than ours:

- **`/health` reported `channel:telegram.default: ok` for nineteen hours** while
  the Telegram API returned 404 to every poll — a component reporting healthy
  that had never once connected. That is why the till has `/truth`.
- **The provider fallback carries the primary's model id**, so the fallback is
  asked for a model it does not have, fails, and is marked rate-limited
  alongside the primary. A correctly configured fallback can never fire.

Also: `instructions` is not a key this host reads (the persona belongs in
`agents/<alias>/workspace/IDENTITY.md`), `[channels.telegram]` must be
`.default` under schema v3, and `execution_mode` is really
`default_execution_mode`. Full list in [`docs/01-BUILD-LOG.md`](docs/01-BUILD-LOG.md).

## Licence

MIT.
