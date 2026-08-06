# Aval — independent verification sheet

Every claim below can be checked by someone who does not trust us. Where a check
needs the operator's own machine, that is said plainly rather than dressed up.

Last run: 2026-08-06.

---

## 1. The site is live and public

```
curl -s -o /dev/null -w "%{http_code}" https://aval-site.vercel.app
```

Returns **200** to an anonymous request — no session, no Vercel checkpoint.
Page title reads *"Aval — the co-sign rail for agent payments"*, body ~54 KB.

The nav labels render once each. The earlier deployment stacked two copies of
every label at 14px and read `Bullreauest` instead of `Pull request`; that
component is gone. Checked programmatically rather than by eye — one text node
per anchor:

```js
[...document.querySelectorAll('header nav ul a')]
  .map(a => [...a.childNodes].filter(n => n.nodeType === 3).length)
// [1, 1, 1, 1, 1]
```

No horizontal overflow at 390px. No console errors.

## 2. On-chain proof (Solana devnet)

Both transactions were signed at the same moment. One waited for an approval;
the other was anchored to a durable nonce.

```
control (recent blockhash)   Error: Hash has expired
durable nonce                Finalized, 4h29m after signing
  5U2c5RV3TEurNYFeC7r17jK5CWkRgMzwEsxA978M9DLLYhjx38JmUkK1yVG5qiXVqo9z2XPRbesXfgNeuBbQZnj7

nonce advanced after use — the same transaction cannot land twice
  7tfvBRBMvnitJJ9tCN9BZLADhaPuGgJ4m4KwguTCYr9E  →  A8zkZeDL...
```

**The recipient was generated unfunded and never airdropped.** Its 0.01 SOL came
from that transfer and from nothing else, which is what separates this from a
screenshot. Check the balance and the transfer history yourself.

## 3. The Telegram bot is a real bot, connected

```
curl -s "https://api.telegram.org/bot<token>/getMe"
{"ok":true,"result":{"id":8754348686,"is_bot":true,
 "first_name":"Aval","username":"avalrailbot"}}
```

`t.me/avalrailbot` — description *"Charges in USDC from the shop chat. Refunds
wait for you."*

**A second check that is harder to fake:** `getUpdates` returns
`{"ok":true,"result":[]}` while the daemon is running. Telegram hands each
update to exactly one consumer, so an empty queue means the daemon is holding
the long-poll. A disconnected bot would leave messages sitting there.

The daemon's own log, same minute:

```
telegram.rs:3687  channel listening for messages...
telegram.rs:1075  Telegram bot commands registered successfully
```

## 4. The agent builds real payment requests

Four calls in twenty minutes, each returning a **different** reference key —
the Rust component minting fresh output, not replaying a cached string:

```
5Zjkf4VomGcfBVz9NVrtohVMHJBdCXYPHMgBYpweMptv
9cFGAn2zyX8XYe3urfsBVLQFvPJhwhqpbH4H7Kk4MYsF
5tdqijuaXknq3UzLsuZ9mieuEU18LCCVgmSwHeWHWGiu
CZycSV4HkAAT5iA8yEYnZFuqf1fLYD5G4ViNXU2C4fyW   (recorded in the walkthrough)
```

Full request:

```
solana:GsbwXfJraMomNxBcjK1LfJ8HPnzUnEzUcNvLYSbxNQpr
  ?amount=40&spl-token=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
  &reference=5tdqijuaXknq3UzLsuZ9mieuEU18LCCVgmSwHeWHWGiu&label=table-7
```

## 5. A customer paid one, and the reference found it

The loop closed on devnet on 2026-08-06. The agent built the request; a
different wallet, holding its own key, paid it; one RPC call against the
reference key found exactly that transaction.

```
built by the agent
  solana:GsbwXfJraMomNxBcjK1LfJ8HPnzUnEzUcNvLYSbxNQpr?amount=0.02
    &reference=Dh3ike7G5GVyDP6wnrjxuWyxQ8cJGCxVjvcgebDHhrqd&label=table-11

paid by the customer
  from      35z7X59rtyts557Up1RAwpyYN7x2cFqcDc7RjPuNxFzr
  signature 2enW3Y91s9GSCYdyW4axdBirf2Poc6qEtxRPzGDa9PWbSsu6hWMisRYMqfCLQmk4QfamVXB3KmXrmAS5ELfKKyha

settlement
  getSignaturesForAddress(Dh3ike7G…) → 1 result
  slot 481636113, err null
```

The reference is in the instruction as a **read-only, non-signer** account, per
the Solana Pay spec. It moves nothing and signs nothing; it exists so that one
`getSignaturesForAddress` call finds the transaction that paid *this* order and
no other — which is what makes settlement detectable when many orders share one
shop wallet. That call is exactly what the cron SOP runs every five minutes.

The agent holds no key on any part of this path. The paying wallet is the
customer's, and it is not the shop's. Re-run it against a request of your own:

```
node evidence/pay-request.js "solana:<the URL the agent gave you>"
```

## 6. The limits are enforced in Rust, and refuse

Over the ceiling:

```
in :  amount 5000, label table-9
out:  "The charge for table-9 is over the allowed limit.
       The amount of 5000 exceeds the per-charge ceiling of 500."
```

Token not on the allowlist (the allowlist holds mint addresses, not tickers):

```
in :  token "USDC"
out:  "The token USDC is not on the shop's allowlist."
```

Neither limit is an argument the model can pass. The component's whole
permission grant is `permissions = ["config_read"]` — **no `http_client`**, so
it cannot reach an endpoint even if a message talks it into trying.

## 6. It runs unattended

```
GET http://127.0.0.1:42617/health   → 200
GET http://127.0.0.1:8099/          → 200
```

Autostart, both halves, per-user Startup folder (no elevation needed — `zeroclaw
service install` has no Windows branch and Task Scheduler requires elevation):

```
Aval-Caixa-Daemon.vbs → runtime/caixa-daemon.ps1
Aval-Caixa-Till.vbs   → runtime/caixa-till.ps1
```

Both supervisors restart their process with a backoff doubling to a 300s
ceiling, both hydrate credentials from the persisted user environment rather
than trusting inheritance, and both refuse to start without their credential
instead of starting and serving errors. Verified by killing each process and
watching it return.

## 7. Do not trust `/health` on the channel row

`GET /health` reported `channel:telegram.default: status ok, last_error: null`
for nineteen hours while the Telegram API returned `404` to every poll, five
seconds apart. **The daemon reported a component healthy that had never
connected.**

The till therefore exposes `GET /truth`, which asks nothing about itself — it
calls Telegram's `getMe` and reports what came back:

```json
{
  "till":     { "up": true, "note": "you are talking to it" },
  "telegram": { "up": true, "http_status": 200, "username": "avalrailbot" },
  "caveat":   "the daemon's own /health reports this channel ok regardless"
}
```

It cannot report healthy for a channel that has never connected.

## 8. The videos

| File | Checked |
|---|---|
| `aval-cut-80s.mp4` | 80.04s, 1920×1080, **full decode pass, zero errors** |
| `aval-demo-4k.mp4` | 180.05s, **3840×2160**, full decode pass, zero errors |
| `aval-web-walkthrough.mp4` | 105.76s, live take against the running daemon |

Rendered by Remotion — `video/remotion/src/` — not screen-captured. The same
command reproduces the same file:

```
remotion render src/index.ts AvalCut out/aval-cut.mp4 \
  --codec h264 --crf 18 --color-space bt709
```

A duration check is not enough: an earlier render passed `ffprobe` at the right
length and was garbage from the first frame. Every file above survived
`ffmpeg -i <file> -f null -` with no output.

---

## What this sheet does not claim

- **Both settlement paths are closed.** Native SOL (`2enW3Y91…`) and SPL
  (`5hFq5bnk…`, decimals read from the mint, `transferChecked`, recipient token
  account created by the customer's wallet). What has *not* been run is a day of
  traffic, or several references in flight at once.
- **One payment, not a week of them.** The loop is proven; a shop's worth of
  traffic through it is not.
- **No WhatsApp channel exists.** It needs a Meta Business account and app
  review — external approval, not code. Two channels work: Telegram and the
  daemon's own HTTP gateway.
- **The outbound address filter is built and tested**, in `video/till/server.js`
  with six negative controls in `video/till/filter.test.js`. An address leaves
  the till only if it appeared in the owner's own request or is the shop's
  configured recipient. It runs at the till, not inside the agent, so an
  operator on a different front end does not inherit it.
- **Testing is thinner than the strongest competing entry.** ~20 tests, and no
  negative controls that must fail. A check nobody has watched fail is
  decoration.
