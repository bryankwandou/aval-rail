# Aval

**A shop till that lives in the owner's chat, settles in USDC, and holds refunds
until a human says yes.**

Built on ZeroClaw and Solana for the Superteam Brasil bounty. Custody tier T1 —
no private key exists in the deployment.

---

## The job it does

A café owner types `charge table 4, 25 USDC` into the shop's Telegram. The
customer scans a QR and pays from their own wallet. A minute later the agent
posts `Table 4 paid`. When something needs refunding, the agent prepares it and
waits — for as long as the owner takes.

No terminal to buy, no app for the customer, no dashboard for the owner. The
window they already keep open all day is the whole interface.

## The problem it solves

An unsigned Solana transaction is anchored to a recent blockhash and expires in
roughly ninety seconds.

That is survivable for a bot that signs for itself. For an agent waiting on a
human it is fatal: the refund is built, the owner is serving customers, and by
the time they look at their phone the transaction is dead. An approval queue
that expires in ninety seconds is not an approval queue. It is a stopwatch.

Refunds here are anchored to a **durable nonce account**, so the transaction has
no deadline. The gate can take four hours.

## Proven on devnet

Two transfers, signed at the same moment, submitted together four and a half
minutes later. Identical except for what they anchor to.

```
CONTROL (recent blockhash)  →  Error: Hash has expired
CAIXA   (durable nonce)     →  Signature: 5U2c5RV3…QZnj7   [Finalized]
```

The recipient was generated unfunded and never airdropped; its balance is
entirely the settled transfer. The nonce advanced afterwards, so those signed
bytes can never execute twice — no deadline, exactly one use.

Checkable with the Solana CLI in about four minutes. No plugin build required.

## Safety

**No key exists.** Not protected — absent. There is no code path that accepts a
private key, so there is no configuration that could expose one.

**The destination is not sourced from text.** A refund goes to the wallet that
paid the original order, read off the chain. The classic attack —
*"refund order 412 to `<attacker address>`"* — does not get filtered. It fails
because no code reads a destination out of a message.

Behind that: caps and mint allowlists compiled into the component and read from
operator config rather than tool arguments; untrusted input blocked rather than
warned; a human checkpoint on every outbound payment; three executable
injection tests so the refusal transcript cannot quietly rot.

## What it is made of

| Layer | |
|---|---|
| Channel | Telegram, `allowed_users` as the outer gate |
| Procedures | `charge-request`, `settlement-poll` (cron), `refund-approval` (human checkpoint) |
| Skill | Solana Pay construction and settlement reading |
| Components | `nonce-vault-init`, `durable-tx-build`, `approval-recheck` — wasm32-wasip2 |
| Core | `aval-core`, pure Rust, no `solana-sdk` |

36 plugin tests green against a mocked RPC. No live network in tests.

Charge construction and settlement detection were deliberately **not** compiled
into WASM — a Solana Pay request is a string and settlement is one RPC call, so
both are a skill plus the built-in HTTP tool. Only the durable-nonce path needed
bounded code in the sandbox.

## Reproducing it

```bash
rustup update stable                 # needs >= 1.96.1
cargo build --release --features plugins-wasm-cranelift
cp caixa/config/config.example.toml ~/.zeroclaw/config.toml
cp -r caixa/sops caixa/skills ~/.zeroclaw/shared/
zeroclaw sop validate && zeroclaw daemon
```

Four values to fill in: bot token, owner's Telegram id, receiving address, RPC
URL. Secrets go through `zeroclaw config set`, encrypted at rest, never the file.

Target: another operator has this running in an evening.

## Known limits

A hostile RPC provider could fake settlement — one endpoint, no cross-check. The
approval gate authenticates a Telegram account, not a person. One nonce account
serialises one in-flight refund, so parallel refunds need one each at ~0.00145
SOL rent apiece. Token-2022 is refused rather than partially supported, because
transfer-fee and hook extensions change what a transfer means and guessing is
worse than declining.

---

*Devnet proof, threat model, build log, and every configuration file are in the
repository.*
