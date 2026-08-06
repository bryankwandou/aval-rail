# Setting Aval up

Honest up front about the wall, because it is the main reason someone bounces:
**plugins are not in the ZeroClaw release binary.** The host must be built from
source with the wasm feature. That is the runtime's constraint, not ours, and it
is the single biggest barrier to anyone adopting this.

What we *can* remove is the second build. The component is shipped prebuilt in
[`dist/`](dist/) with a checksum, so you do not also need a Rust wasm toolchain,
the `wasm32-wasip2` target, or an understanding of which WIT version the host
pins.

```
dist/solana_pay_build.wasm
  sha256  07d478d46374b63ce367af53ae62414f83be618fc6741448b340a41f3bec6f64
```

---

## Before you build anything

Check the on-chain claims. No keys, no wallet, no clone — this is also the
fastest way to decide whether the rest is worth your evening:

```bash
curl -s https://api.devnet.solana.com -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getSignaturesForAddress","params":["Dh3ike7G5GVyDP6wnrjxuWyxQ8cJGCxVjvcgebDHhrqd",{"limit":5}]}'
```

One signature, `err: null`. That is a customer's payment found by its reference
key alone — the same call the settlement procedure makes every five minutes.

## The one wall: build the host

```bash
git clone https://github.com/zeroclaw-labs/zeroclaw && cd zeroclaw
cargo build --release --features plugins-wasm-cranelift
```

Twenty to sixty minutes depending on the machine. The feature flag is not
optional: without it the binary starts, reports success, loads no plugins, and
the agent answers as though it has no tools. That failure is silent, which is
why it is stated here in bold rather than in a footnote.

## Then Aval

```bash
git clone https://github.com/bryankwandou/aval-rail && cd aval-rail
cp dist/solana_pay_build.wasm runtime/plugins/solana-pay-build/
```

Set the three credentials. **They are never written to disk** — the supervisors
read them from the persisted user environment at start:

```powershell
[Environment]::SetEnvironmentVariable('ZEROCLAW_providers__models__groq__main__api_key','<key>','User')
[Environment]::SetEnvironmentVariable('ZEROCLAW_channels__telegram__default__bot_token','<token>','User')
[Environment]::SetEnvironmentVariable('GATEWAY_TOKEN','<pair token>','User')
```

`.default` is not decoration. Under schema v3 the channel is
`[channels.telegram.default]`, so an override without that segment makes the
host refuse to boot — with a clear error, which makes it the kindest of the nine
traps.

Point the shop at your own wallet in `runtime/config.toml`:

```toml
recipient      = "<your Solana address>"
allowed_tokens = "SOL,<mint you accept>"   # mint addresses, not tickers
charge_ceiling = "500"                     # decimal string, never a float
```

Then:

```bash
zeroclaw --config-dir ./runtime sop validate
zeroclaw --config-dir ./runtime daemon
```

## Check it came up honestly

```bash
curl http://127.0.0.1:42617/health    # the daemon's own report
curl http://127.0.0.1:8099/truth      # this one does not believe it
```

Use the second. `/health` reported `channel:telegram.default: ok` for nineteen
hours while the Telegram API returned 404 to every poll — a component reporting
healthy that had never once connected. `/truth` calls Telegram's `getMe` and
reports what came back.

## Run it unattended

Windows: copy both `.vbs` files into
`shell:startup`. `zeroclaw service install` has no Windows branch and Task
Scheduler needs elevation; the per-user Startup folder needs neither. The
supervisors restart on exit with a backoff doubling to a 300s ceiling, and
refuse to start without their credential rather than starting and serving
errors.

## Verify the guards

```bash
cargo test --test negative_controls     # 9, in the plugin
node video/till/filter.test.js          # 6, outbound address filter
```

Each plants the violation and asserts the refusal, then asserts the same input
still passes once the violation is removed.

## What will bite you

| | |
|---|---|
| Missing `schema_version = 3` | the whole provider block is discarded, silently |
| `[channels.telegram]` | must be `[channels.telegram.default]` |
| `execution_mode` | the key is `default_execution_mode` |
| `deterministic` mode | runs headless, ordinary steps fail closed |
| `instructions` in config | not a key this host reads — the persona lives in `agents/<alias>/workspace/IDENTITY.md` |
| Provider fallback | carries the primary's model id, so the fallback is asked for a model it does not have and can never fire. Whichever provider is primary must be the one that can answer |

Full list with traces in [`docs/01-BUILD-LOG.md`](docs/01-BUILD-LOG.md).
