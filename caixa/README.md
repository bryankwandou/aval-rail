# Caixa

A shop till that lives in the owner's chat. Charges in USDC, confirms payment on
its own, and holds refunds at a human approval gate until someone gets to it.

Built on [ZeroClaw](https://github.com/zeroclaw-labs/zeroclaw) and Solana.
Custody tier **T1** — no private key exists anywhere in the deployment.

```
owner  13:04  charge table 4, 25 USDC
caixa  13:04  Table 4 — 25 USDC. Scan to pay.  ref 8Kq2…4mB
       13:06  (customer settles from their own wallet)
caixa  13:07  Table 4 paid. 25 USDC.  sig 5xR2…9kM

owner  14:52  refund table 4, they were overcharged
caixa  14:52  Refund built: 25 USDC back to the wallet that paid.
              Waiting on you. It will not expire.
owner  19:30  approved
caixa  19:30  Signed and sent.  sig 7pN4…2vC
```

Look at the gap between 14:52 and 19:30. A transaction built the ordinary way
stopped being valid at 14:54.

## Why that gap is hard

An unsigned Solana transaction is anchored to a recent blockhash and expires in
roughly ninety seconds. Fine for a bot that signs for itself; fatal for one
waiting on a person. An approval queue that expires in ninety seconds is not a
queue — it is a stopwatch.

Refunds here anchor to a **durable nonce account** instead, so they have no
deadline.

## Proof

Two transfers, signed at the same moment, submitted together four and a half
minutes later. Identical except for what they anchor to.

```
CONTROL (recent blockhash)  →  Error: Hash has expired
CAIXA   (durable nonce)     →  Signature: 5U2c5RV3…QZnj7   [Finalized]
```

The recipient was generated unfunded and never airdropped; its balance is
entirely the settled transfer. Afterwards the nonce advanced
(`7tfvBRBM…` → `A8zkZeDL…`), so those signed bytes can never execute twice.

A durable transaction is not one that lives forever. It is one with **no
deadline and exactly one use** — which is why a refund parked in a queue for six
hours cannot be replayed by anyone who sees it.

Full transcript with explorer links: [`../evidence/devnet-proof.md`](../evidence/devnet-proof.md).
Reproducible with the Solana CLI alone in about four minutes — no build needed.

## Safety

**No key exists.** Not "is protected" — absent. There is no code path that
accepts a private key, so there is no configuration that could expose one.

**The refund destination is not sourced from text.** It is read off the
transaction that paid the original order. The obvious attack —
*"refund order 412 to `<attacker address>`"* — is not filtered out. It fails
because no code reads a destination from a message. There is no refusal to log,
because there is no field to poison.

Behind that: caps and mint allowlists compiled into the component and read from
operator config rather than tool arguments; `untrusted_input_guard = "block"`
(the default is `warn`, which is wrong for a payments surface); a human
checkpoint on every outbound payment; and three executable injection tests so
the refusal transcript cannot quietly stop being true.

Threat model, including where this is weak: [`../02-THREAT-MODEL.md`](../02-THREAT-MODEL.md).

## Layout

```
sops/
  charge-request/     channel trigger  — parse, check limits, mint reference, build Solana Pay URL
  settlement-poll/    cron, 1 min      — poll references, verify the transfer, report
  refund-approval/    channel trigger  — read payer from chain, build on nonce, park at human gate
skills/
  solana-pay/         Solana Pay construction and settlement reading
config/
  config.example.toml every secret a placeholder
```

Three components live in a separate repo and are used by `refund-approval`:
`nonce-vault-init` (T1), `durable-tx-build` (T1), `approval-recheck` (T0).

## What was deliberately not compiled

Charge construction and settlement detection are **not** plugins. A Solana Pay
transfer request is a string and settlement is one RPC call, so both are a skill
plus the built-in `http_request` tool. Wrapping them in WASM would be the "thin
single-RPC-call wrapper padded into WASM" the bounty rejects by name — and it
would be right to.

Only the durable-nonce path needed bounded code inside the sandbox.

## Running it

```bash
# 1. toolchain — the build will not proceed below this
rustup update stable                 # needs >= 1.96.1

# 2. host from source; plugins are not in the release binary
git clone https://github.com/zeroclaw-labs/zeroclaw && cd zeroclaw
cargo build --release --features plugins-wasm-cranelift

# 3. config — fill four values: bot token, owner telegram id,
#    receiving address, RPC url
cp config/config.example.toml ~/.zeroclaw/config.toml

# 4. procedures and skill
cp -r sops skills ~/.zeroclaw/shared/
zeroclaw sop validate

# 5. one-time nonce vault
zeroclaw tool nonce-vault-init

# 6. run it — daemon, not gateway (see below)
zeroclaw daemon
```

Secrets go through `zeroclaw config set` (encrypted at rest), never the file.

Then message the shop's Telegram: `charge table 4, 25 USDC`.

## Traps worth knowing before you start

Each of these cost an evening. Written down so they do not cost yours.

**The `webhook` SOP trigger is not wired on current master.** It validates, it
loads without error, and it never fires — no diagnostic, because from the
loader's view nothing is wrong. Note the name collision: a message arriving on a
*webhook channel* can start a SOP through a **`channel`** trigger; the
**`webhook` trigger** is a different thing that currently does not deliver.
`calendar` and `peripheral` are unwired too.

**Cron is a poller on the SOP maintenance tick, not a scheduler.** It needs
`zeroclaw daemon` or `channel start`. A standalone `gateway start` never spawns
the tick, so cron silently never fires there. Schedules parse once at startup, so
a SOP added to a running daemon needs a reload. `maintenance_interval_secs`
(default 60) is the real floor on polling frequency.

**A bracket typo in `[plugins]` silently disables the whole plugin system.**
Writing `[plugins.entries]` where `[[plugins.entries]]` is meant fails
deserialization for the entire section and falls back to defaults — which reads
back as `plugins.enabled = false`, with no warning (upstream issue #8636).
Compounding it, the first write to a fresh plugin entry cannot go through the
CLI (`Unknown property`, since `plugin install` does not seed one), so
bootstrapping *requires* hand-editing exactly the file where a typo is silent.

**`zeroclaw sop approve` is anonymous** and cannot satisfy `cli:<user>`
membership, so a policy-gated checkpoint cannot be cleared from the CLI. A step
naming a policy that does not exist fails closed and parks forever — the right
default, and a typo gives you a stuck refund rather than an ungated one.

## Known limits

- A hostile RPC provider could fake settlement. One endpoint, no cross-check.
- The approval gate authenticates a Telegram account, not a person.
- One nonce account serialises one in-flight refund. Parallel refunds need one
  each, at ~0.00145 SOL rent apiece.
- Cron and channel triggers have no durable redelivery; a deferred trigger is
  dropped after a loud log. The settlement poller recovers on the next tick; a
  dropped refund request must be re-sent.
- Token-2022 is refused rather than partially supported. Transfer-fee and hook
  extensions change what a transfer means, and guessing is worse than declining.
- Nothing here defends against the owner. It ensures a human decided — not which
  human, or why.

## Licence

MIT.
