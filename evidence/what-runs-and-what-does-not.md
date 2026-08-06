# What runs, and what does not

Checked 2026-08-06 12:40 UTC. This file exists because an earlier version of the
submission said "runs 24/7" without qualifying it, and that sentence was true of
two channels out of three. A claim that needs a footnote to survive is a claim
that should have been narrower in the first place.

---

## Running, unattended

| | Evidence |
|---|---|
| Daemon | `pid 31260`, **19.6 hours** continuous, autostart at logon via the per-user Startup folder |
| Till proxy (web) | `HTTP 200`, own supervisor + Startup entry, verified by killing it and watching it come back |
| Gateway | `GET /health` → `HTTP 200` |

Both supervisors restart their process with a backoff that doubles to a 300s
ceiling, and both refuse to start without their credential rather than starting
and serving errors.

## Not running

**Telegram.** The channel is bound and configured. It has never once connected,
because the bot token is supplied per run and is not in the daemon's
environment. The Telegram API returns `404 Not Found` to every poll, five
seconds apart, and has done for the entire uptime above:

```
crates\zeroclaw-channels\src\telegram.rs:3768
{"desc":"Not Found","error_code":404}
```

One command fixes it, and it is the operator's to run:

```powershell
[Environment]::SetEnvironmentVariable('ZEROCLAW_channels__telegram__bot_token','<token>','User')
```

## The bug that made this hard to see

`GET /health` reports:

```
"channel:telegram.default": { "status": "ok", "last_error": null }
```

while that same channel 404s continuously. **The daemon reports a component
healthy that has never connected.** Anyone building a 24/7 claim on `/health`
alone would state something false in good faith, which is exactly what happened
here.

This is the same class of failure as the model reporting a charge it never made:
a self-report that is not checked against the world. It is worth reporting
upstream rather than working around quietly.

## The honest check

The till now exposes `GET /truth`, which asks nothing about itself. It calls
Telegram's `getMe` with the configured token and reports what came back:

```json
{
  "till":     { "up": true, "note": "you are talking to it" },
  "telegram": { "up": false, "reason": "no bot token in the environment; the bot cannot reply" },
  "caveat":   "the daemon's own /health reports this channel ok regardless;
               this check calls the Telegram API instead of trusting it"
}
```

No token, or a token the API rejects, and it says the channel is down. It cannot
report healthy for something that has never connected, because it does not ask
the daemon — it asks Telegram.

## The sentence that survives an audit

> The daemon and the web till have run unattended for 19.6 hours and restart
> themselves at logon. Telegram is configured but has no token in this
> environment and is not answering; `GET /truth` on the till reports that
> directly rather than relaying the daemon's own optimistic health.
