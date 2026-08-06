# Build log — every surprise, recorded as it happened

The brief asks builders to document what they hit at the component boundary and
in the host build ("budget for surprises... and write down what you hit — the
write-up is worth points"). This file is that record. Nothing here is
reconstructed after the fact; each entry was written when the command returned.

Environment: Windows 11, PowerShell + Git Bash, 2026-08-03.

---

## 1. The runtime is not installed by default, and the release binary is not enough

`which zeroclaw` returns nothing on a clean machine. That is expected — but it
matters more than it looks, because plugins are explicitly not in the release
binaries. The listing is unambiguous:

> "Running it: plugins are not in the release binaries. Build the host from
> source with `cargo build --release --features plugins-wasm-cranelift`...
> Judges score against exactly this bar."

So a submission that needs a plugin needs a source-built host, and the build is
part of the reproduction story an operator has to repeat. Cloned from
`github.com/zeroclaw-labs/zeroclaw` (the listing names this as the only official
repository).

Feature flag confirmed present in `Cargo.toml`:

```
428:plugins-wasm-cranelift = ["plugins-wasm", "zeroclaw-plugins/plugins-wasm-cranelift"]
```

## 2. The build fails on a toolchain most machines are running

First attempt at the scored build command:

```
cargo build --release --features plugins-wasm-cranelift
```

Result: failure, before a single crate compiled.

```
wasmtime-internal-cranelift@45.0.3 requires rustc 1.93.0
wasmtime-wasi@45.0.3            requires rustc 1.93.0
wasmtime-wasi-http@45.0.3       requires rustc 1.93.0
zeroclawlabs@0.8.4              requires rustc 1.96.1
```

Local toolchain was `rustc 1.89.0`. The binding constraint is `zeroclawlabs`
at **1.96.1**, not the wasmtime crates at 1.93.0.

This is worth stating plainly for any operator reproducing the setup: the
scored build command does not work on a stable toolchain from a year ago, and
the error arrives as a wall of forty near-identical lines that buries the one
number that matters. Fix:

```
rustup update stable
```

Reproduction requirement, therefore: **rustc >= 1.96.1**.

## 3. Three SOP fan-in sources are documented but not wired

This one changes designs, so it is the most valuable finding in this file.

The docs ship a shared snippet, `docs/book/src/_snippets/sop-unwired.md`:

> "**Not yet wired.** This trigger type is defined and matched, and its syntax
> validates, but no live event source currently routes events into the SOP
> dispatcher for it. A SOP with this trigger loads without error but only starts
> via a live source (MQTT, Filesystem, AMQP) or `sop_execute`."

Which trigger docs include it:

```
docs/book/src/sop/fan-in/calendar.md
docs/book/src/sop/fan-in/peripheral.md
docs/book/src/sop/fan-in/webhook.md
```

**The webhook trigger is not wired.** A SOP with a `webhook` trigger validates
cleanly, loads without error, and then never fires. There is no error message
telling you why, because from the loader's point of view nothing is wrong.

That matters here because the bounty text says:

> "inbound webhook-channel messages can start procedures via channel triggers"

Read carefully that sentence is about the *channel* trigger receiving messages
that arrived on a webhook *channel* — not about the `webhook` SOP *trigger*.
The two are different things with the same word in the name, and picking the
wrong one produces a SOP that silently never runs. An operator who designs
around the `webhook` trigger loses hours to a system that reports success.

Confirmed live: `cron` and `channel`.

`cron.md` states its own constraint precisely:

> "Cron triggers are dispatched by the periodic SOP maintenance tick, so this is
> a poller rather than a per-schedule timer. Firing needs that tick, which a
> `zeroclaw daemon` or the `zeroclaw channel start` supervisor spawns...
> Standalone `zeroclaw gateway start` does **not** spawn the maintenance tick,
> so it does not fire cron triggers... Schedules are parsed once at startup, so
> a SOP added while the daemon is running needs a reload before its cron trigger
> takes effect."

Three separate traps in one paragraph: gateway-only deployments never fire cron;
schedules are read once at startup; and cron is a poller bounded by
`sop.maintenance_interval_secs` (default 60), so a one-minute cron expression is
the practical floor.

This lines up with the brief's own advice — "design for polling, not webhooks" —
but for a different reason than the brief gives. The brief says polling wins
because a chat-resident agent has no guaranteed public inbound ingress. True.
The sharper reason is that on current master the webhook fan-in does not deliver
at all.

## 4. Plugin config has a first-write trap

From `docs/book/src/plugins/index.md`, a documented open issue (#8636), two
distinct failure modes:

First — a syntax slip is silent:

> "a syntax slip in a hand-edited section (for example `[plugins.entries]` where
> `[[plugins.entries]]` is meant) currently makes the whole `[plugins]` section
> fail deserialization and silently fall back to defaults, which reads back as
> `plugins.enabled = false` with no warning"

So a mistyped bracket disables the entire plugin system and then reports that
plugins are simply off. There is no error. The operator sees a config that looks
deliberate.

Second — the first write to a new plugin's entry cannot go through the CLI:

> "`plugin install` does not yet seed an entry, so the **first** write to a fresh
> plugin's entry fails with `Unknown property` and currently requires adding the
> entry to the config file by hand... once the entry exists, every surface reads
> and writes it normally."

Net effect for reproduction: the documented advice is "prefer the CLI over
hand-editing", but bootstrapping a fresh plugin entry *requires* hand-editing
exactly once, in the one file where a typo silently disables everything. Both
halves have to be in the reproduction guide or an operator will not get the
plugin loaded.

## 5. Approval surfaces, and which ones can actually clear a gate

Relevant because the use case is built on a human approval checkpoint.

Runs that hit a checkpoint park as `WaitingApproval`. They are cleared through:

- CLI: `zeroclaw sop list`, `zeroclaw sop pending`, `zeroclaw sop approve`
- Gateway API: `GET /admin/sop/pending`, `POST /admin/sop/approve`,
  `POST /admin/sop/deny`

With a constraint that shapes the threat model:

> "the current CLI approval path (`zeroclaw sop approve`) is anonymous and cannot
> satisfy `cli:<user>` membership yet"

So an approval *policy* with a required group and quorum cannot be satisfied from
the CLI at all — policy-gated approvals need the HTTP or WebSocket surface, whose
principal is the paired-token subject (lowercase SHA-256 of the bearer token).
A checkpoint with no policy is clearable from the CLI; a checkpoint that names a
policy is not.

Also load-bearing, and easy to get wrong: a step that names a policy which is
absent from `[sop.approval].policies` **fails closed** — the gate stays waiting
rather than clearing on a single approval. That is the correct default, and it
means a typo in a policy name produces a permanently stuck run rather than an
ungated one. Good design, worth relying on deliberately.

## 6. Durability and back-pressure defaults are already correct

Checked rather than assumed, because the use case parks runs at a human gate and
a lost gate is a lost payment:

- `persist_runs` defaults to `true`, with sqlite (`runs.db`) as the backend, so a
  run parked at a checkpoint survives a daemon restart.
- `build_sop_engine` falls back to an in-memory store *with a loud log* if the
  durable backend cannot open — degraded, but not silent.
- `max_pending_approvals` defaults to `0` (unlimited); past a set bound, triggers
  are deferred rather than dropped, except under the `drop` policy.
- A run parked at an approval **releases its concurrency slot**, so
  `max_concurrent = 1` does not block new charges while one waits for a human.

That last point is what makes a single-slot payment SOP usable in a shop: one
charge waiting on an owner's approval does not stop the next customer.

Counter-note, recorded because it bounds the design: deferred triggers have no
in-engine durable queue in this version. For cron and channel sources
specifically, "no per-message redelivery, so a deferred trigger is dropped after
a loud log". Back-pressure is therefore observable but lossy on exactly the two
transports this use case uses.

---

## 7. The build takes an hour, and that needs saying out loud

```
$ cargo build --release --features plugins-wasm-cranelift
    Finished `release` profile [optimized] target(s) in 61m 38s
$ zeroclaw --version
zeroclaw 0.8.4
```

Sixty-two minutes, 41 MB binary. The main crate alone held ~2.9 GB of working
set for a long stretch with no console output at all.

Worth stating in any reproduction guide, because an operator who expects a
five-minute build will conclude it has hung and kill it somewhere around minute
twenty.

## 8. A wrong config key silently weakened the security posture

The most valuable finding in this file, and it was nearly missed.

After validating, the SOPs reported `Mode: supervised` — despite the config
setting deterministic execution. The key is **`default_execution_mode`**, not
`execution_mode`:

```toml
[sop]
execution_mode         = "deterministic"   # accepted, does nothing at all
default_execution_mode = "deterministic"   # the real key
```

The wrong key produces no error, no warning, no log line. The engine falls back
to `supervised`, and `zeroclaw sop list` is the only surface where the
difference is visible.

This is not cosmetic. Deterministic means the steps run as written, with the
model filling in only what a step asks it to fill in. Supervised gives the model
latitude over the run itself. For a procedure whose sixth step is a human
approval gate on outbound money, silently getting the weaker mode is precisely
the class of failure that surfaces after an incident rather than before one.

Caught only because the parsed result was read back instead of assumed.

**The pattern across findings 4 and 8: this runtime fails quiet on
configuration.** A bracket typo disables the entire plugin system and reports
`enabled = false`. A misspelled key downgrades the execution mode and reports
nothing. Neither is a crash, and neither is logged.

The operational rule that follows: **never trust that a setting took effect
because the file says so.** Read it back — `sop list`, `config list`, whichever
surface shows the parsed value — every time.

---

## 9. Four more silent failures, all between a running daemon and a working agent

Connecting the agent to a real Telegram channel took five wrong configs. Every
one of them started the daemon successfully. None threw. The bot appeared
online, registered its nine commands, and ignored every message.

**A missing `schema_version = 3` discards the entire provider block.** The file
is parsed as legacy v2, and every v3-shaped section — `[providers.models.<type>.<alias>]`
among them — is dropped. The daemon boots, Telegram binds, and the agent cannot
think. One line, buried:

```
orchestrator: model_provider has no resolvable model
{"model_provider":"groq.main","reason":"no_model_configured"}
```

**`[channels.telegram]` is not a valid v3 section.** It must be
`[channels.telegram.default]` — every channel is `<type>.<alias>`. The undotted
form is not rejected; each key is reported as *"invalid and was skipped so the
daemon can start"* and the daemon starts with no channel.

**`allowed_users` is a v2 field.** The v2→v3 migrator folds it into a peer
group, so it works on a v2 file and is silently skipped on a v3 one — taking the
entire sender allowlist with it. Under v3 the allowlist is
`[peer_groups.<name>].external_peers`. Worth knowing: `is_user_allowed`
short-circuits on a `"*"` entry, so one wildcard disables the gate completely.

**An agent with no `channels` binds to nothing.** The daemon runs, the bot
connects, messages are dropped. The only trace is
`{"activated_bindings":0,"bindings":[]}`. And `channels = ["telegram"]` is
rejected for the same dotted-form reason, again without stopping the boot.

The through-line: **a ZeroClaw daemon that starts is not a ZeroClaw daemon that
works.** Its config layer prefers booting degraded over failing loudly. Every
one of these is diagnosable in seconds with `config list` and invisible
otherwise.

The check that actually catches them:

```sh
zeroclaw config list | grep -c "invalid and was skipped"   # must be 0
zeroclaw config list | grep -E "schema_version|model|channels|peer_groups"
```

## Running list of reproduction requirements

1. rustc >= 1.96.1 (`rustup update stable`)
2. `cargo build --release --features plugins-wasm-cranelift` from the official
   repo at `github.com/zeroclaw-labs/zeroclaw` — budget an hour
3. `plugins.enabled = true`, plugin entry seeded by hand once
4. Run under `zeroclaw daemon` (not `gateway start`) or cron never fires
5. Do not use the `webhook` SOP trigger; it validates and never fires
6. Reload after adding a SOP — cron schedules are parsed at startup only
7. Use `default_execution_mode`, not `execution_mode`
8. Read every setting back after writing it; this runtime does not complain
