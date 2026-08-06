# Running 24/7 — autostart, supervision, and the unattended charge

A till that needs someone to start it is not a till. This is what was done to
make the daemon survive a logout, a crash, and an empty keyboard, and what each
step actually proved.

---

## `zeroclaw service install` does not cover Windows

The binary ships a service command, and it writes launchd or systemd units:

```
$ zeroclaw service install
Error: Command failed: ERROR: Access is denied.
```

`--service-init` accepts `auto`, `systemd`, `openrc`. There is no Windows
branch. A shop till that only runs unattended on Linux is not a shop till, so
the Windows half is supplied here.

Task Scheduler was the first choice and is unavailable without elevation:

```
Register-ScheduledTask : Access is denied.  HRESULT 0x80070005
```

The per-user Startup folder needs no elevation and fires at logon, which is what
"24/7" means on a machine that gets turned off at night:

```
C:\Users\arche\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\
  Aval-Caixa-Daemon.vbs   ->  runtime/caixa-daemon.ps1
```

The `.vbs` exists only to launch with no console window. A PowerShell window the
owner can close by accident is not a daemon.

## The supervisor, and the restart it actually performed

`runtime/caixa-daemon.ps1` refuses to start without a provider key, then loops:
start the daemon, log the exit, back off, start again. The backoff doubles to a
300-second ceiling for a daemon that dies immediately and resets for one that
ran, so a bad config cannot spin the CPU filling a disk with one error.

This is not a description of intent. The daemon was killed and the supervisor
brought it back on its own:

```
[2026-08-05T02:10:38Z supervisor] supervisor up; workspace .../runtime
[2026-08-05T02:10:38Z supervisor] starting daemon
[2026-08-05T02:16:49Z supervisor] daemon exited code=-1 after 366s
[2026-08-05T02:16:50Z supervisor] restarting in 5s
[2026-08-05T02:16:55Z supervisor] starting daemon
```

The refusal branch was also exercised, on the first launch, before the key was
persisted:

```
[2026-08-05T02:08:23Z supervisor] refusing to start: no provider key in the environment
```

That is the intended behaviour. A daemon that boots without a model and sits
there looking healthy is the exact failure this whole config was written
against — five separate settings in it started cleanly and did nothing.

## Connected to ZeroClaw — the machine-readable proof

The daemon's own gateway answers. This is `GET /health` on the live process,
not a log line about it:

```json
{
  "status": "ok",
  "runtime": {
    "pid": 2744,
    "uptime_seconds": 186,
    "components": {
      "daemon":                    {"status":"ok","restart_count":0},
      "control-plane":             {"status":"ok","restart_count":0},
      "scheduler":                 {"status":"ok","restart_count":0},
      "heartbeat":                 {"status":"ok","restart_count":0},
      "channels":                  {"status":"ok","restart_count":0},
      "channel:telegram.default":  {"status":"ok","restart_count":0,
                                    "last_ok":"2026-08-05T02:20:02Z"},
      "gateway":                   {"status":"ok","restart_count":0}
    }
  }
}
```

`channel:telegram.default` is the binding, reported by the host rather than
inferred. `scheduler.last_ok` moves on every maintenance tick — comparing it
against `daemon.last_ok` shows the process is doing work, not merely alive.

Terminal banner from the same run:

```
ZeroClaw Channel Server
  Model:    gemini-flash-latest (agent: caixa)
  Channels: telegram.default
  Agents:   caixa
  Listening for messages...
```

## The provider, and why it is not Groq

Groq's free tier is 12,000 tokens per minute and the till was one step from it.
The daemon runs on Gemini, with both providers now naming each other as
fallback, so a cooldown on one is a slower charge rather than a shop that stops
taking payment:

```
providers.models.gemini.main.fallback = ["groq.main"]
providers.models.groq.main.fallback   = ["gemini.main"]
```

The model name cost a round of debugging worth recording. `gemini-2.0-flash`
returns **429 with `limit: 0`** for this key — which reads like rate limiting
and actually means "not served to this key at all". Probed directly before
wiring anything in:

```
gemini-2.5-flash      404
gemini-2.5-flash-lite 404
gemini-flash-latest   200   <- configured
gemini-3.5-flash      200
```

Keys are never on disk. The provider key is set in the **user environment**, so
the Startup entry inherits it at logon and nothing is written into the config:

```
providers.models.gemini.main.api_key = ****   (env-injected, secret-marked)
```

## The unattended charge

Autostart is worth nothing if the agent stops at an approval prompt with nobody
there. It did, at first — driven through the daemon's own gateway with no human
present:

```
POST /webhook  {"message":"Charge table 7 for 40 ..."}
-> "The Solana Pay charge build request for table 7 was canceled by the user."
```

Nobody cancelled it. Under `supervised`, an unanswered prompt denies, which is
correct on a laptop and fatal in a daemon.

The fix is a custody split, not a blanket relaxation. `solana_pay_build` was
added to `auto_approve`; `sop_execute` deliberately was not.

| Tool | Unattended? | Why |
|---|---|---|
| `solana_pay_build` | yes | holds no key, signs nothing, submits nothing, has no network permission at all; ceiling and allowlist enforced in Rust from operator config, not from arguments |
| `sop_status` | yes | read-only |
| `sop_execute` | **no** | the door to the refund procedure, and a refund moves money — it keeps both of its gates |
| `http_request` | **no** | this is the tool the model reached for when it invented `example.com/generate-reference-key` |

Re-run with **stdin closed**, so any prompt would deny rather than wait:

```
$ zeroclaw agent -a caixa -m "Charge table 7 for 40 of token Gh9Zw..." < /dev/null

Solana Pay request built for table 7:
  Amount:    40 Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
  Reference: Ct4LXMnn1Jpx9TFfmBumKeRacXveLQ9bz5MsSrrktmSe
  URL:       solana:GsbwXfJraMomNxBcjK1LfJ8HPnzUnEzUcNvLYSbxNQpr
             ?amount=40&spl-token=Gh9Zw...
             &reference=Ct4LXMnn1Jpx9TFfmBumKeRacXveLQ9bz5MsSrrktmSe
             &label=table%207
```

No keyboard, no stdin, a real tool call, a real transfer request. The same
instruction earlier in this project produced a confident "Table 4 has been
charged" with `native_tool_calls: 0` behind it
(`evidence/live-channel-run.md`).

## Where it runs

The workspace was moved out of a temp directory and into the submission tree,
because a 24/7 claim that lives in `%TEMP%` is one disk cleanup from being
false:

```
solana open agent zeroclaw/runtime/
  config.toml          the live config, not the example
  caixa-daemon.ps1     supervisor
  plugins/             solana-pay-build component
  shared/sops/         the three procedures
  data/state/          run store, runtime trace
  logs/daemon.log
```

## Still not done, stated plainly

- **Telegram is bound but not talking.** `channel:telegram.default` is `ok` and
  the binding is real, but the runtime trace repeats
  `Startup probe: API error; retrying in 5s` because the bot token is not in
  this environment. The token was always supplied per-run and never written to
  disk. One `ZEROCLAW_channels__telegram__bot_token` in the user environment —
  the same mechanism already proven for the provider key — closes it.
- **The long-lived daemon still holds the pre-`auto_approve` config.** Config is
  read at start, and the running process predates the change. It picks the new
  config up on its next start, which the supervisor performs at the next exit or
  logon. The change itself is verified — the unattended run above is against the
  same config file.
- **No customer has paid one of these requests on devnet.** `settlement-poll`'s
  mechanism is proven; its happy path is not.
