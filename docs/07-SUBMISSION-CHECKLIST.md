# Submission checklist

Deadline **2026-08-07**. Written 2026-08-03.

Status is either verified with a command, or marked as not done. Nothing is
marked complete on the strength of intending to do it.

---

## Done and verified

| Item | Evidence |
|---|---|
| Durable nonce beats blockhash expiry, on devnet | `5U2c5RV3…QZnj7` Finalized; control tx returned `Hash has expired` |
| Nonce advances after use (replay closed) | `7tfvBRBM…` → `A8zkZeDL…` |
| Recipient funded only by the refund | balance `0.01 SOL`, generated unfunded, never airdropped |
| Plugin tests green | 5 / 18 / 13, zero failures, re-run today not quoted from memory |
| wasm32-wasip2 component builds | `durable_tx_build.wasm`, 386 KB, on rustc 1.97.1 |
| SOP files parse | all three `SOP.toml` valid; step numbering, bullets and JSON schemas checked against the documented parser rules |
| Config parses | `config.example.toml`, including the `[[plugins.entries]]` array-of-tables that issue #8636 punishes |
| ZeroClaw host built from source | `cargo build --release --features plugins-wasm-cranelift`, 61m 38s, `zeroclaw 0.8.4`, 41 MB — the exact bar judges score against |
| All three SOPs validate against the real binary | `zeroclaw sop validate` → three green ticks |
| Engine parsed them as designed | `sop list` reports deterministic mode, 5 / 7 / 4 steps, `channel:telegram` and `cron:* * * * *` triggers |
| Approval gate confirmed by the engine | `sop show refund-approval` → step 6 `[confirmation required]`; max_concurrent 1, admission hold, max pending 3 |
| Shipped example config loads | the actual `config.example.toml`, unedited apart from `sops_dir` |
| `[plugins]` section survives deserialization | `plugins.enabled` reads back `true`, not the silent `false` fallback of issue #8636; all three entries present and secret-masked |
| Agent runs against a real model provider | Groq `openai/gpt-oss-120b`; API key by env override, never on disk (reads back `💉 … ****  🔒`) |
| The model fires the procedure itself | chose `sop_execute`, shaped its own payload `{"order_id":"table-4"}`, run `det-1785774515636535600-0001` started |
| Supervised profile gates the tool call and fails closed | unanswered prompt denied the run outright — a second gate, earlier than the SOP checkpoint |
| Runs persist and survive process exit | read back from `data/sop/runs.db` after the agent exited: `status=running`, `step 1/7`, plus a one-hour concurrency lease in `sop_claims` |
| **Cron fires autonomously under the daemon** | a `settlement-poll` run appeared that nobody started, on the maintenance tick |
| Engine fails closed and says why | `headless_driver_missing` with the exact step named |
| Corrected design re-validated | all three SOPs valid; heartbeat enabled at 5 min; `policy_allowed: 3, retained: 3` (no silently dropped tool names) |
| Use case authored | 3 SOPs, 1 skill, 1 config |
| Threat model written | `02-THREAT-MODEL.md`, including failure modes |
| Showcase post written | `03-SHOWCASE-POST.md` |
| One-pager written | `06-ONE-PAGER.md` |
| Video script written | `05-DEMO-VIDEO-SCRIPT.md` |
| X thread written | `04-X-THREAD.md` |
| Landing page rebuilt around the use case | builds clean, deployed |
| Nav rendering bug fixed | `TextRoll` (skiper58) was used at 14 px but is built for 48 px+ with `lineHeight: 0.75`; both stacked layers rendered at once and garbled every nav label |

## Vercel — resolved, no dashboard action needed

`https://aval-rail.vercel.app` now returns **200** to an anonymous request and
serves the real page.

```
attempt 1: HTTP 200, 40023 bytes
attempt 2: HTTP 200, 40023 bytes
attempt 3: HTTP 200, 40023 bytes
<title>Aval — the co-sign rail for autonomous agents</title>
```

Three consecutive clean requests, no session, no cookies, correct title and
full page weight — not a challenge page. The GitHub Pages mirror also serves
200, so there are two independent public URLs.

**Do not delete and recreate the project.** The 403 is gone; deleting would
throw away the working deployment and the name, and a fresh project inherits the
same account-level protection defaults that caused it. Nothing needs doing here.

## Superseded — what the 403 section used to say

**Vercel is gating the site.** `aval-rail.vercel.app` returns **403 Vercel
Security Checkpoint** to an anonymous request. The bare project URL returns 302.

This is the single highest-risk item on the list. A judge who opens the link
sees a challenge page, not the submission.

```
aval-rail.vercel.app                        403
aval-rail-nayrbryangamings-projects...      302
bryankwandou.github.io/aval-site/           200   ← only public URL right now
```

Fix, in the Vercel dashboard (not available from the CLI):

1. `vercel.com/nayrbryangamings-projects/aval-rail/settings`
2. **Deployment Protection** → set to Off
3. Also check **Firewall / Attack Challenge Mode** — a 403 checkpoint page is
   that feature rather than standard deployment protection, which returns 401.

Re-verify afterwards with a request that carries no session:

```
curl -s -o /dev/null -w "%{http_code}\n" https://aval-rail.vercel.app
```

Anything other than `200` means judges cannot see it.

Until that is done, **link the GitHub Pages mirror in the submission**, not the
Vercel URL. It serves 200 and is not subject to this setting.

## Live channel — connected and autonomous, one step short

| Item | Evidence |
|---|---|
| Telegram bot created and wired | `@avalrailbot`, `getMe` returns `{"username":"avalrailbot","first_name":"Aval"}`; token supplied by env override, never on disk |
| Channel bound to the agent | `activated_bindings":1, bindings":["telegram.default"]` |
| Bot registers with Telegram | `Telegram bot commands registered successfully (9 commands)` |
| Queued messages consumed | pending updates went `2 → 0` on daemon start |
| **Heartbeat fires autonomously** | two turns, five minutes apart, nobody typing: `llm_request {input_tokens:1269, output_tokens:70}` then `heartbeat phase 1: skip (nothing to do)` |
| The corrected poller design works | this is the primitive the cron rewrite moved to after `headless_driver_missing`; `parsed_tool_calls: 0` is correct — no pending charges exist, and a poller that invents work is worse than one that sleeps |
| Prompt injection executed, not authored | two attacks run against the live agent; transcript in `evidence/injection-transcript.md` |

Five configuration errors stood between "daemon runs" and "agent works", and
**every one of them started the daemon successfully and did nothing**. Missing
`schema_version = 3` (discards the whole provider block); `[channels.telegram]`
instead of `[channels.telegram.default]`; `allowed_users` under v3 (a v2 field —
takes the sender allowlist with it); no `channels` on the agent
(`activated_bindings: 0`); and `channels = ["telegram"]` instead of the dotted
form. All fixed, all documented in `01-BUILD-LOG.md` §9. The shipped config now
reports zero skipped keys.

## Runs unattended — autostart, supervision, and a charge with nobody watching

Full detail in `evidence/daemon-24-7.md`.

| Item | Evidence |
|---|---|
| `zeroclaw service install` does not cover Windows | writes launchd/systemd units only; `--service-init` offers `auto, systemd, openrc`; on this host it exits `Access is denied` |
| Autostart without elevation | `Register-ScheduledTask` is also denied (`HRESULT 0x80070005`); the per-user Startup entry `Aval-Caixa-Daemon.vbs` fires at logon and needs none |
| Supervisor actually restarted the daemon | `daemon exited code=-1 after 366s` → `restarting in 5s` → `starting daemon`, from its own log |
| Supervisor fails closed with no provider key | `refusing to start: no provider key in the environment` — logged on the first launch, before the key was persisted |
| Host reports itself connected | `GET /health` on the live process: `status ok`, `pid 2744`, `uptime_seconds`, and every component ok including `channel:telegram.default` and `heartbeat`; `scheduler.last_ok` advances each tick |
| Runs outside a temp directory | workspace moved to `runtime/`; a 24/7 claim living in `%TEMP%` is one disk cleanup from false |
| Groq cooldown no longer stops the shop | both providers name each other: `gemini.main.fallback = ["groq.main"]` and the reverse |
| Provider key off disk | set in the user environment, inherited by the Startup entry; reads back `**** 🔒` env-injected |
| **A charge built with nobody at the keyboard** | first attempt through the daemon gateway returned *"canceled by the user"* — under `supervised` an unanswered prompt denies. Split by custody: `solana_pay_build` auto-approved (no keys, no signing, no network permission, limits enforced in Rust), `sop_execute` deliberately not. Re-run **with stdin closed**: real tool call, real URL, reference `Ct4LXMnn1Jpx9TFfmBumKeRacXveLQ9bz5MsSrrktmSe` |

## Not done

| Item | Note |
|---|---|
| Telegram answering live | The binding is real and `channel:telegram.default` reports ok, but the runtime trace loops `Startup probe: API error; retrying in 5s`: the bot token is the one credential never written to disk, so a daemon started at logon has none. One command by the owner, in their own shell, closes it — `[Environment]::SetEnvironmentVariable('ZEROCLAW_channels__telegram__bot_token','<token>','User')` — after which the daemon picks it up on its next start. Messages sent to the bot on 5 Aug sit unanswered for exactly this reason. |
| The long-lived daemon holds the pre-`auto_approve` config | Config is read at start and the running process predates the change. It reloads on its next start, which the supervisor performs at the next exit or logon. The change itself is verified against the same config file. |
| One owner message → charge → Solana Pay URL, over the live channel | The channel is bound, the agent is awake, and the heartbeat proves the loop runs unattended. What is missing is a single inbound message during a daemon window: the two sent earlier were consumed by a daemon that then exited, and a bot cannot send to itself. This is minutes of work, not a rebuild, and it stays listed as not done until the terminal output exists. |
| Outbound address filter | The injection test found a real hole: after prompt hardening the agent still echoed an attacker-supplied address and suggested the owner pay it by hand. `untrusted_outbound_redact = true` did not redact. The fix is deterministic code — extract base58 tokens from outbound messages, drop any that never appeared in a tool result. Specified, not built. |
| Nonce pool | `max_concurrent = 1` is a limitation, not a feature: two pending refunds queue. The brief names the fix ("parallel pending approvals need a nonce account each") and calls solving it worth points. Not started. |
| Demo video recorded | script ready; three minutes maximum, terminal plus phone, no slides |
| Showcase posted to `#solana-bounty` | this is the submission format, there is no other |
| Earn form submitted | costs one credit — **the account previously reported insufficient credits, check this before the deadline rather than on it** |
| X thread posted | listed as the tiebreak |

## Order to do the remaining work in

1. Flip the Vercel setting. Two minutes, and it is the only item that silently
   invalidates everything else.
2. Check the Earn credit balance. Also two minutes, also silently fatal.
3. Finish the host build, run the agent, capture the terminal output.
4. Record the video against that run.
5. Post the showcase to Discord, then fill the Earn form with the links.
6. Post the X thread, then reply to it daily until judging.

## Deliberately not doing

- **Not opening a registry PR.** The listing says registry merges happen after
  judging and asks builders not to open them during the bounty. The existing
  PR #98 is not linked as part of this submission.
- **Not wrapping charge construction or settlement detection in WASM.** A
  Solana Pay request is a string and settlement is one RPC call. Both belong in
  a skill with the built-in HTTP tool. Compiling them would be the "thin
  single-RPC-call wrapper padded into WASM" the brief rejects by name.
- **Not claiming Token-2022 support.** Transfer-fee and hook extensions change
  what a transfer means. It is refused explicitly rather than mishandled
  quietly.
