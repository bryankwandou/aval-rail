# Caixa — deliverables index

Submission for the Superteam Brasil × ZeroClaw Solana bounty.
Rewritten 2026-08-03. Deadline 2026-08-07.

**What changed and why.** The earlier version of this file described a
submission consisting of three plugins and a landing page. The listing rejects
that shape in three separate places — "we are judging use cases, not
components", "a plugin with no use case around it" is listed under what will not
be accepted, and standalone plugin PRs are excluded explicitly. The plugins were
kept; what surrounds them changed. The submission is now a running agent doing a
job, with the plugins as machinery underneath it. Full reasoning in
`00-AUDIT-AND-PIVOT.md`.

The listing also says not to open registry PRs during the bounty. PR #98 is
therefore **not** part of this submission and is not linked as one.

---

## The submission

| Asset | Where |
|---|---|
| Showcase post (the submission itself) | `03-SHOWCASE-POST.md` |
| Devnet proof, verifiable on chain | `evidence/devnet-proof.md` |
| Custody tier and threat model | `02-THREAT-MODEL.md` |
| Build log — every undocumented trap hit | `01-BUILD-LOG.md` |
| Audit and the pivot reasoning | `00-AUDIT-AND-PIVOT.md` |
| Agent configuration | `caixa/config/config.example.toml` |
| Procedures | `caixa/sops/{charge-request,settlement-poll,refund-approval}/` |
| Skill | `caixa/skills/solana-pay/SKILL.md` |

## Verified on devnet, 2026-08-03

A controlled comparison: two transfers signed at the same moment, submitted
together four and a half minutes later.

```
CONTROL (recent blockhash) → Error: Hash has expired
CAIXA   (durable nonce)    → Signature: 5U2c5RV3…QZnj7   [Finalized]
```

Recipient `3ygUMWcJ…JrbB` was generated unfunded and never airdropped; its
balance is `0.01 SOL`, entirely the settled transfer. The nonce advanced from
`7tfvBRBM…` to `A8zkZeDL…`, closing replay.

- https://explorer.solana.com/tx/5U2c5RV3TEurNYFeC7r17jK5CWkRgMzwEsxA978M9DLLYhjx38JmUkK1yVG5qiXVqo9z2XPRbesXfgNeuBbQZnj7?cluster=devnet
- https://explorer.solana.com/address/E9mhDio83iWTmsfW3Z8SwuPkfQZwBEZocqfjDCwubzke?cluster=devnet

## Plugin test suite

Re-run 2026-08-03, not quoted from memory:

```
nonce-vault-init    5 passed; 0 failed
durable-tx-build   18 passed; 0 failed
approval-recheck   13 passed; 0 failed
```

Mocked RPC, no live network in tests. Includes the executable prompt-injection
suite (`injection_cannot_*`).

## Local paths

| Asset | Path |
|---|---|
| Plugin suite (Rust) | `C:\Users\arche\projects\zeroclaw-plugins\plugins\{aval-core, nonce-vault-init, durable-tx-build, approval-recheck}` |
| ZeroClaw host (source build) | `C:\Users\arche\projects\zeroclaw` |
| Landing page | `E:\projects\aval\site` |
| Brand definition | `E:\projects\aval\brand.md` |

## Corrections to the previous index

- The `docs/reports/` directory it listed as delivered **does not exist**. The
  line has been removed rather than left claiming something untrue.
- The "disable Vercel deployment protection" action it listed as pending is
  **already resolved**; `aval-rail.vercel.app` returns HTTP 200 to anonymous
  requests, and the GitHub Pages mirror does too. Both were re-checked today.
- The submission process it described (paste a description into Earn, flip PR #98
  to ready) is **not the real process**. See below.

## Remaining before submitting

1. Record the demo video, three minutes maximum. Terminal plus phone, real agent
   on a real channel. No slides — the listing rules them out.
2. Post the showcase to `#solana-bounty` on the ZeroClaw Discord. This is the
   submission format; there is no other.
3. Fill the Earn form: link to the showcase, tweet link, demo video link,
   supporting material. Costs one credit — the Earn account previously reported
   insufficient credits, so check that before the deadline rather than on it.
4. Post the build-in-public thread on X. Listed as the tiebreak.
