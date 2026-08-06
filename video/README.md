# The demo videos, and how they were made

| File | Length | What it is |
|---|---|---|
| `aval-demo-1080p.mp4` | 3:06 | the evidence replay — devnet proof, the plugin, the ceiling, the heartbeat, the injection attempt |
| `aval-web-walkthrough.mp4` | 1:46 | the till, live, against the running daemon — nothing replayed |

Both 1920×1080, 25 fps, H.264 / yuv420p, faststart. The first is under the
bounty's three-minute ceiling with its end card inside it.

## The walkthrough is live, not a replay

`record-web.js` opens `till/index.html`, which posts to the daemon's gateway on
`127.0.0.1:42617`. What appears on screen is whatever the agent returned. Three
charges, and the runtime trace for the take that shipped:

```
17:11:37  solana_pay_build  {"amount":"18","label":"table-12",
                             "reference":"CZycSV4HkAAT5iA8yEYnZFuqf1fLYD5G4ViNXU2C4fyW"}
17:11:55  solana_pay_build  ERR amount 5000 is over the shop's per-charge ceiling of 500
```

The refusal is not a message the page composed. It came out of Rust, through the
tool, and the model relayed it — the ceiling is not one of the model's
arguments, so it had nothing to override.

**The guard the recording forced.** On an earlier take the model answered
*"I have processed the request to charge table-12 for 18 tokens"* having never
called the tool — the fabrication failure this project has now seen four times.
The till does not take prose as proof: no `solana:` URL means no charge. It
re-asks once, explicitly, and if that also comes back without a URL the owner is
told nothing was built. That first take is not the one that shipped, but the
guard exists because of it.

The bearer token never reaches the browser. `till/server.js` holds it and
forwards; the gateway ships a strict CSP and no CORS headers, so a page opened
from disk could not call it anyway.

## It was rendered, not recorded

There is no screen-capture tool on this machine and no way to add one. So the
demo is not a recording of a screen: Playwright drives `teleprompter.html` in a
real Chromium at a fixed 1920×1080 and writes the frames itself.

```
node record.js          # -> out/aval-demo.webm
ffmpeg -i out/aval-demo.webm -t 186 -c:v libx264 -preset slow -crf 19 \
       -pix_fmt yuv420p -r 25 -movflags +faststart aval-demo-1080p.mp4
```

Two consequences worth stating. It is deterministic — the same command produces
the same file, so a judge who doubts a frame can regenerate it. And there is no
cursor, no desktop, no notification bar, because there was never a desktop
involved.

`record.js` hides two things before pressing Play: the how-to-record notes and
the transport buttons. The page is also a teleprompter a person can read from,
and that furniture belongs to the teleprompter, not to the video. The progress
bar and clock stay, because a viewer is owed a sense of how much is left.

## What is on screen is evidence, not illustration

Every terminal block replays output captured from real runs, and each one has a
file behind it:

| Beat | Time | What it shows | Backed by |
|---|---|---|---|
| The 90-second problem | 0:00 | a regular transaction dying on `Hash has expired` | `evidence/devnet-proof.md` |
| On-chain proof | 0:20 | the durable-nonce transaction landing 4.5 hours after signing | `evidence/devnet-proof.md` |
| Charging a table | 0:50 | a real `solana_pay_build` tool call and the request it returns | `evidence/solana-pay-build.md` |
| The ceiling holds | 1:30 | an over-limit charge refused in Rust, not by the model | `evidence/solana-pay-build.md` |
| Unattended settlement | 2:00 | the heartbeat firing with nobody typing | `evidence/daemon-24-7.md` |
| Prompt injection | 2:25 | the model fabricating a tool result, and the tool-call counter reading zero | `evidence/injection-transcript.md` |

No frame contains a number that is not in one of those files.

## Voiceover

The video ships silent on purpose. The script is in
`../05-DEMO-VIDEO-SCRIPT.md`, timed to these beats, along with the YouTube
title, description with chapters, and tags. Read it flat over the footage —
the terminal is the argument and the voice should stay out of its way.

Two words the script avoids: *secure* and *proven*. Say what ran.

## Stills

`stills/beat1..6.png` are frames pulled at each beat, for the thread and the
showcase post:

```
ffmpeg -ss 70 -i aval-demo-1080p.mp4 -frames:v 1 stills/beat3.png
```
