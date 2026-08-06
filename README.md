# Aval

**A shop till that lives in the owner's chat, built on the one Solana primitive
that lets an agent's payment survive the person approving it.**

| | |
|---|---|
| **Problem** | A Solana blockhash expires in ~90s. An approval gate in front of an agent's payment kills the transaction before anyone answers. |
| **Solution** | Anchor it to a durable nonce. The request waits as long as the shop does. |
| **Live demo** | [aval-site.vercel.app](https://aval-site.vercel.app) · Telegram [@avalrailbot](https://t.me/avalrailbot) |
| **Video** | 80s — `video/remotion/` renders it; the same command reproduces the file |
| **Chain** | Solana devnet — signatures in the table below, all re-checkable on Explorer |
| **Custody** | **T0** on the charge path: no key held, nothing signed, nothing submitted |
| **Stack** | ZeroClaw 0.8.4 · Rust → `wasm32-wasip2` · Solana Pay · Telegram + HTTP gateway |
| **Built** | 2 wasm components · 3 SOP procedures · 1 skill · 1 agent identity |
| **Reproduce** | [`VERIFICATION.md`](VERIFICATION.md) — every claim below, without trusting us |
| **Status** | Running unattended; both supervisors autostart at logon |

---

A Solana blockhash lasts about ninety seconds. Put a human approval in front of
an agent's payment and the transaction is dead before anyone answers. That is
why agent-payment designs quietly drop the human. Aval keeps the human and fixes
the clock.

**Proved on devnet — two transactions signed at the same moment:**

```
control, ordinary blockhash   Error: Hash has expired
durable nonce                 Finalized, 4h 29m after signing
  5U2c5RV3TEurNYFeC7r17jK5CWkRgMzwEsxA978M9DLLYhjx38JmUkK1yVG5qiXVqo9z2XPRbesXfgNeuBbQZnj7
```

The recipient was generated unfunded and never airdropped, so its balance came
from that transfer and nothing else.

## What it does

`charge table 4, 25 USDC` becomes a Solana Pay request the customer settles from
any wallet. The agent watches the chain for the payment. Refunds wait for the
owner to approve.

**The loop is closed in both directions, on devnet:**

| | signature |
|---|---|
| SOL | `2enW3Y91s9GSCYdyW4axdBirf2Poc6qEtxRPzGDa9PWbSsu6hWMisRYMqfCLQmk4QfamVXB3KmXrmAS5ELfKKyha` |
| SPL | `5hFq5bnkpHFzcNa5K5aN64SupGGBaREyQGAvmUjuxF3yJeuTdgEnQsoTWSaWBBQ5wdypHMVfKd2NnuEAZDVQ75Gx` |

In each case the agent built the request, a different wallet holding its own key
paid it, and a single `getSignaturesForAddress` against the reference key found
that transaction and no other.

## Custody: T0 on the charge path

No key held. Nothing signed. Nothing submitted. The customer's wallet does that.

```toml
permissions = ["config_read"]     # no http_client, at all
```

The component cannot reach an endpoint even if a message talks it into trying —
which matters, because it tried. Asked to mint a reference key with no tool for
it, the model invented `https://example.com/generate-reference-key`.

## The limits are compiled, not prompted

```
amount 5000    →  "over the shop's per-charge ceiling of 500"
token "USDC"   →  "not on the shop's allowlist"   (it holds mints, not tickers)
```

Both refusals come out of Rust. The ceiling and the allowlist are read from the
operator's config inside the sandbox and are not arguments the model can pass,
so nothing arriving in the shop channel can move them.

**15 negative controls** across Rust and JS. Each plants the violation and
asserts the refusal, *then* asserts the same input passes once the violation is
removed — so a deleted guard fails the first half, and a test passing for the
wrong reason fails the second. A check nobody has watched fail is decoration.

```
cargo test --test negative_controls          # 9, in the plugin
node video/till/filter.test.js               # 6, outbound address filter
```

## Layout

| | |
|---|---|
| `runtime/` | config, procedures, skills, supervisors |
| `caixa/` | the Rust wasm component that builds requests |
| `evidence/` | devnet proofs, transcripts, the payment scripts |
| `video/` | Remotion source for the demo, and the till page |
| `aval-site/` | the public site |
| `VERIFICATION.md` | **every claim above, re-runnable without trusting us** |

## What broke, published because it is the useful part

Nine silent configuration traps, each of which started the daemon successfully
and did nothing. Two are upstream defects, not ours:

- **`/health` reported `channel:telegram.default: ok` for nineteen hours** while
  the Telegram API returned 404 to every poll — a component reporting healthy
  that had never once connected.
- **The provider fallback carries the primary's model id**, so the fallback
  provider is asked for a model it does not have, fails, and is marked
  rate-limited alongside the primary. A correctly configured fallback can never
  fire.

And four times the model reported work it had never done, including
`"Table 4 has been charged"` with `native_tool_calls: 0` behind it. Every fix
was the same move: take the decision off the model and put it in code that
cannot be argued with.

Full list in [`01-BUILD-LOG.md`](01-BUILD-LOG.md) and
[`VERIFICATION.md`](VERIFICATION.md).

## Running it

Plugins are not in the release binaries, so the host is built from source:

```bash
cargo build --release --features plugins-wasm-cranelift
zeroclaw --config-dir ./runtime sop validate
zeroclaw --config-dir ./runtime daemon

curl http://127.0.0.1:42617/health     # the daemon answers for itself
curl http://127.0.0.1:8099/truth       # and this one does not trust it
```

Credentials are supplied at runtime and never written to disk. The `.default`
segment is not optional — under schema v3 the channel is
`[channels.telegram.default]`, so the override is:

```
ZEROCLAW_channels__telegram__default__bot_token
```

Without it the host refuses to boot, which is the kindest of the nine traps.

## Licence

MIT.
