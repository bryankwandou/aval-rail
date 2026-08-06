# Naming — decided, with the availability checks behind it

Settled 2026-08-04. One brand, not two.

---

## The decision

**The product is Aval.** `Caixa` stays as the name of the shop deployment — the
configuration and its three procedures — and is never presented as a second
brand.

Read aloud it works in one line: *"Caixa is the till; it runs on Aval."*

## Why not two names

Carrying `Aval` and `Caixa` as co-equal brands was the state of the project an
hour ago and it was a liability. In a three-minute video a judge should never
have to work out whether they are looking at one product or two. Every second
spent on that is taken from the thing that wins — the refund surviving four
hours.

## Why Aval and not Caixa

**Caixa is the narrower word.** It means the till, the cash register. A name that
means "till" caps the product at retail. The business audit concluded the
durable approval rail is the asset and the shop is the proof — a name that only
fits shops fights that.

**Aval is the mechanism, not the venue.** Brazilian Portuguese for guaranteeing
someone else's obligation by adding your signature to it. That is exactly what
the product does, and it keeps working when the counterparty stops being a café
and starts being another agent.

**Aval is also the sponsor's own vocabulary.** Superteam Brasil, and a word a
Brazilian judge reads without translation.

**And `caixa` is taken anyway.** GitHub `200`, Vercel `200`. There is no clean
namespace to move into even if the argument went the other way.

## Availability, checked rather than assumed

```
name           github   vercel
caixa            200      200     ← taken on both
caixa-rail       404      404
avalrail         404      404
aval-rail        404      403     ← already ours (403 = deployment protection)
caixapay         404      404
caixa-till       404      404
tillrail         404      404
nonceq           404      404
quietrail        404      404
```

`404` means free. The existing footprint is already on `aval-rail`, so the
decision costs no migration: the live site, the GitHub Pages mirror, the logo,
`brand.md`, and the palette all stay exactly as they are.

## The handles

| Surface | Handle | State |
|---|---|---|
| Site | `aval-rail.vercel.app` | live, ours |
| Mirror | `bryankwandou.github.io/aval-site` | live, serving 200 |
| Repo | `github.com/bryankwandou/aval-site` | ours |
| Suite repo | `avalrail` or `aval-core` | free |
| Telegram bot | **`avalrailbot`** | free at time of checking |

Telegram handles checked:

```
avalbot        TAKEN
aval_bot       TAKEN
avalpaybot     TAKEN
avalrailbot    free
avaltillbot    free
caixaavalbot   free
```

## On the bot that already exists

`nayrbryanGaming_openclaw1bot` works and is a perfectly good bot. It is also the
one thing on screen for most of the demo video, and it currently reads as a
personal test account rather than a product.

Recommendation: run `/newbot` once more and take **`avalrailbot`**, so the handle
matches the domain. Thirty seconds of work, and the video stops looking like a
prototype.

Set the display name to `Aval` and the about line to something like *"Charges in
USDC. Refunds wait for you."* Both are editable later with `/setname` and
`/setdescription`; the username is not.

Keeping the existing bot is not wrong — it costs presentation, not correctness.
Nothing in the configuration depends on which one is used.

## Where the name appears

Already consistent, no changes pending:

- site metadata, hero, and navigation — Aval
- `brand.md` — Aval, with the logo built around the co-signed "A"
- `caixa/` folder, agent alias `caixa`, three procedures — the deployment
- showcase post — leads with the use case, credits Aval as the rail beneath it
