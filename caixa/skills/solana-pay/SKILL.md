---
name: solana-pay
description: Build Solana Pay transfer requests and recognise when one has been settled. Use when the operator asks to charge someone, quote a price, check whether an order has been paid, or look up a payment by order reference.
---

# Charging and settling with Solana Pay

A transfer request is a string. There is no SDK here and no key: the customer's
wallet reads the string, builds the transaction, and signs it. The shop's side
of the exchange is composing that string correctly and then watching the chain
for the result.

## Composing the request

```
solana:<recipient>?amount=<decimal>&spl-token=<mint>&reference=<pubkey>&label=<shop>&message=<order>
```

Rules that matter, in the order they tend to be broken:

**The amount is a decimal string in whole tokens, not base units.** `25` means
twenty-five USDC. It is not `25000000`. Writing base units here overcharges the
customer by six orders of magnitude and the wallet will not warn anyone.

**Never build the amount through a float.** Parse and carry it as a decimal
string. A price that survives a round trip through binary floating point is a
price that eventually settles wrong, and money bugs of this kind are silent.

**`spl-token` is omitted entirely for native SOL.** Present but empty is not the
same as absent, and some wallets will read the empty value as a mint.

**The reference is a fresh public key per charge, used for nothing else.** It is
not a wallet, it holds no funds, and nothing is ever sent to it. It appears in
the transaction as a read-only account so that the payment can be found later.
Reusing one across two orders makes both unidentifiable, and deriving it from
the order number makes it guessable by anyone who can count.

Percent-encode `label` and `message`. A shop name with a space in it will break
the URL otherwise.

## Recognising settlement

Ask the chain which transactions mentioned the reference key:

```
getSignaturesForAddress(<reference>, {commitment: "confirmed"})
```

An empty result means unpaid. It does not mean failed, and it does not mean the
customer left — a request sitting unanswered for four minutes is normal while
someone finds their phone.

Two rules about reading the answer:

**Confirmed, not processed.** A processed signature can still disappear. Treat
only confirmed (or finalized) results as payment.

**A hit is not a payment.** The reference proves some transaction mentioned this
order. It does not prove the transaction paid the right amount, in the right
token, to the right address. Fetch the transaction and check all three before
telling anyone the order is settled. Underpayments and wrong-mint transfers both
produce a reference hit and are both not payment. Report those as a mismatch for
a human to look at, never as success.

## Keeping responses small

The raw RPC replies here are large, and every one of them is billed to the
operator and pushed through the model's context on every poll. Return the
shortest form that answers the question:

```
{"order": "table-4", "status": "settled", "amount": "25", "signature": "5xR2…9kM"}
```

A whole transaction object, or worse a full account scan, will flood the context
window and cost real money once a minute forever. Shape the output at the point
it is produced, not afterwards.

## What this skill will not do

It does not sign anything, hold a key, or submit a transaction. Charging is a
string; settlement is a read. Anything that moves money out of the shop goes
through the refund procedure and stops at a human first.
