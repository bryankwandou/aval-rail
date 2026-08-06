# Devnet proof — the refund gate outlives blockhash expiry

Run 2026-08-03 on Solana devnet. Every value below is verifiable on chain; the
commands are exactly what produced the output, in the order they ran.

The claim under test is the one the bounty calls Trap #1: an approval-gated
payment dies before the human answers. The test is a controlled comparison —
two transactions signed at the same moment, submitted together three minutes
later, differing only in what they are anchored to.

---

## Setup

Durable nonce account created on devnet:

```
$ solana create-nonce-account nonce-vault.json 0.0015 --url devnet
Signature: JMoAifeQSHzSp4JpZp2EkfGWxzRoDB8dnqGyx4Fuo5VZjihDQxNBzZQXvfPiyJQZ73mPKfmgXhz26tmheyPfjjD
```

Nonce account: `E9mhDio83iWTmsfW3Z8SwuPkfQZwBEZocqfjDCwubzke`

```
$ solana nonce-account E9mhDio83iWTmsfW3Z8SwuPkfQZwBEZocqfjDCwubzke --url devnet
Balance: 0.0015 SOL
Minimum Balance Required: 0.00144768 SOL
Nonce blockhash: 7tfvBRBMvnitJJ9tCN9BZLADhaPuGgJ4m4KwguTCYr9E
Fee: 5000 lamports per signature
Authority: 35z7X59rtyts557Up1RAwpyYN7x2cFqcDc7RjPuNxFzr
```

The rent figure is worth noting because the brief calls it out as a gotcha: the
account locks 0.00144768 SOL as its rent-exempt minimum. That is the standing
cost of being able to wait.

Customer (refund recipient), freshly generated and deliberately unfunded so that
any balance it ends with is unambiguous proof of settlement:

```
3ygUMWcJqQsqte2ypckqXnVhxsCcBgRZxfmBJkPyJrbB
```

---

## Both transactions signed at 12:28 UTC

**The control — anchored to a recent blockhash, the ordinary way:**

```
$ solana transfer 3ygUMWcJ… 0.01 --blockhash 5Thz4e1tYN1XRzcxrs3nKqVt3BHjGjyhi9w85f5hK9in \
    --sign-only --url devnet --allow-unfunded-recipient

Blockhash: 5Thz4e1tYN1XRzcxrs3nKqVt3BHjGjyhi9w85f5hK9in
Signers (Pubkey=Signature):
 35z7X59rtyts557Up1RAwpyYN7x2cFqcDc7RjPuNxFzr=3u94KM5Lbm6HWT5ovCW2KtfuejN3B8oDwBXA6NUA3wr2hnBS4T99SM7ej3Dpnnhc2LWbpxkogD4HjQ9vvP55HQRW
```

**The refund — anchored to the durable nonce:**

```
$ solana transfer 3ygUMWcJ… 0.01 --blockhash 7tfvBRBMvnitJJ9tCN9BZLADhaPuGgJ4m4KwguTCYr9E \
    --nonce E9mhDio83iWTmsfW3Z8SwuPkfQZwBEZocqfjDCwubzke \
    --nonce-authority <authority> --sign-only --url devnet --allow-unfunded-recipient

Blockhash: 7tfvBRBMvnitJJ9tCN9BZLADhaPuGgJ4m4KwguTCYr9E
Signers (Pubkey=Signature):
 35z7X59rtyts557Up1RAwpyYN7x2cFqcDc7RjPuNxFzr=5U2c5RV3TEurNYFeC7r17jK5CWkRgMzwEsxA978M9DLLYhjx38JmUkK1yVG5qiXVqo9z2XPRbesXfgNeuBbQZnj7
```

Note what the second one uses as its blockhash: the nonce account's stored value,
not a network blockhash. That substitution is the entire mechanism.

---

## Both submitted at 12:32:43 UTC — four and a half minutes later

```
########## CONTROL: regular blockhash transaction ##########
Error: Hash has expired 5Thz4e1tYN1XRzcxrs3nKqVt3BHjGjyhi9w85f5hK9in

########## AVAL: durable-nonce transaction ##########
Signature: 5U2c5RV3TEurNYFeC7r17jK5CWkRgMzwEsxA978M9DLLYhjx38JmUkK1yVG5qiXVqo9z2XPRbesXfgNeuBbQZnj7
```

Same signer, same recipient, same amount, same wait. One is refused by the
network. The other settles.

This is the whole argument, reduced to two lines of output. An approval queue
built on the first line cannot hold a human decision. An approval queue built on
the second can hold it indefinitely.

---

## Verification

```
$ solana confirm 5U2c5RV3TEurNYFeC7r17jK5CWkRgMzwEsxA978M9DLLYhjx38JmUkK1yVG5qiXVqo9z2XPRbesXfgNeuBbQZnj7 --url devnet
Finalized
```

```
$ solana balance 3ygUMWcJqQsqte2ypckqXnVhxsCcBgRZxfmBJkPyJrbB --url devnet
0.01 SOL
```

The recipient was created with no funds and never airdropped. Its balance is
entirely the settled refund.

**And the nonce advanced:**

```
$ solana nonce E9mhDio83iWTmsfW3Z8SwuPkfQZwBEZocqfjDCwubzke --url devnet
A8zkZeDL1JosJth3Yg5kMKWWuV76xuMg1Q21HNRHZj1Q
```

Before: `7tfvBRBMvnitJJ9tCN9BZLADhaPuGgJ4m4KwguTCYr9E`
After:  `A8zkZeDL1JosJth3Yg5kMKWWuV76xuMg1Q21HNRHZj1Q`

This matters as much as the settlement. The nonce rolled forward the moment the
transaction landed, which means the signed bytes that just executed can never
execute again. A durable transaction is not a transaction with an unlimited
lifetime — it is a transaction with exactly one use and no deadline. An approval
that sits in a queue for six hours cannot be replayed by anyone who sees it.

It is also the reason the refund SOP runs `max_concurrent = 1`. One nonce
account holds one value, so it backs one in-flight transaction. A second refund
built against this vault before the first settles would be signed against a nonce
that is about to change, and one of the two would fail. Parallel refunds need a
nonce account each, at 0.00144768 SOL of rent apiece.

---

## Explorer links

- Refund: https://explorer.solana.com/tx/5U2c5RV3TEurNYFeC7r17jK5CWkRgMzwEsxA978M9DLLYhjx38JmUkK1yVG5qiXVqo9z2XPRbesXfgNeuBbQZnj7?cluster=devnet
- Nonce account: https://explorer.solana.com/address/E9mhDio83iWTmsfW3Z8SwuPkfQZwBEZocqfjDCwubzke?cluster=devnet
- Recipient: https://explorer.solana.com/address/3ygUMWcJqQsqte2ypckqXnVhxsCcBgRZxfmBJkPyJrbB?cluster=devnet
- Nonce creation: https://explorer.solana.com/tx/JMoAifeQSHzSp4JpZp2EkfGWxzRoDB8dnqGyx4Fuo5VZjihDQxNBzZQXvfPiyJQZ73mPKfmgXhz26tmheyPfjjD?cluster=devnet

---

## What this does and does not establish

Established: the durable-nonce mechanism works on devnet, the transaction
outlives blockhash expiry, funds move, and replay is closed off by the nonce
advancing.

Not established by this test on its own: that the ZeroClaw agent drives it
end to end. That is a separate run against the built host, recorded separately.
This document proves the chain-level claim; it does not stand in for the agent
demo, and it is not presented as one.

Reproduce it with the CLI alone — no plugin build required for this specific
proof, which is deliberate. The mechanism should be checkable by a judge in
about four minutes without compiling anything.
