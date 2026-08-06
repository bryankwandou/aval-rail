# aval-site

The public page for [Aval](../README.md) — live at
[aval-site.vercel.app](https://aval-site.vercel.app).

Next.js 16, Tailwind v4, no animation library. Scroll reveals are an
`IntersectionObserver` and a CSS transition: a landing page does not need a
physics engine to move eighteen pixels, and every dependency is one more thing
that can break a deploy the night before it matters.

```bash
npm install
npm run dev      # localhost:3000
npm run build    # what Vercel runs
```

## What is here

| | |
|---|---|
| `app/page.tsx` | the whole page — hero, the problem, devnet proof, custody ladder, the four model fabrications, the config traps |
| `app/components/Till.tsx` | the hero terminal. Replays a recorded run, and the page says so rather than implying a live connection |
| `app/components/Nav.tsx` | rewritten after the previous nav stacked two text layers at 14px and rendered `Bullreauest` |
| `app/components/Endorsement.tsx` | the mark's stroke, drawn once across the hero on load |
| `app/components/Reveal.tsx` | scroll entrance, with a three-second failsafe so a full-page screenshot never captures blank sections |
| `app/globals.css` | tokens, motion, and the layout fixes below |

## Two bugs worth keeping in the record

**Mobile overflow.** At 390px the document was 644px wide. `html`, `body` and
every ancestor reported innocent numbers — `main` was the one at 644, with
`min-width: 0` already set. In a column flex container the line's cross size is
the largest item's hypothetical cross size, and items stretch to the line rather
than to the container, so `main` sized itself to its own max-content. Fixed with
an explicit width on the top-level landmarks, plus `minmax(0,1fr)` on the hero
grid so a 56-character base58 mint cannot set the column width.

**Invisible sections.** `Reveal` starts *visible* and only hides once the client
has confirmed it can observe and un-hide it again. Starting hidden would have
meant server-rendered HTML full of invisible sections — blank to a crawler, to
reader mode, and to anyone with scripting off.

## Deploy

```bash
vercel deploy --prod
```

Then verify anonymously, because a checkpoint on the account will 403 a reader
without warning:

```bash
curl -s -o /dev/null -w "%{http_code}" https://aval-site.vercel.app   # 200
```
