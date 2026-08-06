// x402 co-sign: the tier above the threshold.
//
// x402 assumes a payment completes inside one HTTP round trip. That holds for a
// $0.002 API call and breaks for anything a person needs to look at, because a
// Solana blockhash expires in about ninety seconds and the approval does not.
// So agentic payment stacks have no answer for "this one needs a human" other
// than to lower the amount until nobody cares.
//
// This is that answer. Below the operator's threshold, the payment resolves the
// way x402 expects. Above it, the server returns 402 with a co-sign challenge
// whose transaction is anchored to a durable nonce — so it stays valid while a
// person decides, and the same reference key settles it afterwards.
//
// The threshold is read from the operator's config. It is not a field the
// caller can set, which is the whole point: a client that could choose its own
// threshold has no threshold.

const POLICY = {
  // Decimal strings end to end. A binary float cannot represent 25.10 exactly,
  // and a policy boundary that re-renders the amount it is comparing is worse
  // than no boundary.
  cosign_above: '100',
  ceiling: '500',
  currency: 'USDC',
};

/** Compares two decimal strings numerically without parsing either as a number. */
function decimalGt(a, b) {
  const norm = (s) => {
    const [w = '0', f = ''] = String(s).trim().split('.');
    return [w.replace(/^0+(?=\d)/, ''), f.replace(/0+$/, '')];
  };
  const [aw, af] = norm(a);
  const [bw, bf] = norm(b);
  if (aw.length !== bw.length) return aw.length > bw.length;
  if (aw !== bw) return aw > bw;
  const len = Math.max(af.length, bf.length);
  return af.padEnd(len, '0') > bf.padEnd(len, '0');
}

/**
 * The policy decision, and nothing else. No network, no keys, no model.
 *
 * Returns one of three shapes:
 *   { tier: 'auto' }     — settle inline, x402 as usual
 *   { tier: 'cosign' }   — 402 with a challenge; a human approves, then it settles
 *   { tier: 'refused' }  — over the shop's ceiling; no amount of approval helps
 */
function classify(amount, policy = POLICY) {
  if (!/^\d+(\.\d+)?$/.test(String(amount).trim())) {
    return { tier: 'refused', reason: 'amount is not a plain decimal' };
  }
  if (decimalGt(amount, policy.ceiling)) {
    return {
      tier: 'refused',
      reason: `amount ${amount} is over the shop's per-charge ceiling of ${policy.ceiling}`,
    };
  }
  if (decimalGt(amount, policy.cosign_above)) {
    return {
      tier: 'cosign',
      reason: `amount ${amount} is over the co-sign threshold of ${policy.cosign_above}`,
    };
  }
  return { tier: 'auto' };
}

/**
 * The 402 body. Deliberately shaped like an x402 payment-required response with
 * one field added: `cosign`, which tells the caller this will not resolve in
 * this round trip and how long it stays valid.
 *
 * `expires: null` is the load-bearing part. Every other payment challenge on
 * this surface carries a deadline because a blockhash forces one. A
 * nonce-anchored transaction does not expire until the nonce advances, so there
 * is nothing honest to put here — and saying so is the product.
 */
function challenge(order, amount, reference, policy = POLICY) {
  return {
    x402Version: 1,
    error: 'payment requires human co-signature',
    accepts: [
      {
        scheme: 'solana-cosign',
        network: 'solana-devnet',
        maxAmountRequired: amount,
        asset: policy.currency,
        resource: order,
        payTo: null,
        extra: {
          cosign: {
            reason: `over the operator's threshold of ${policy.cosign_above} ${policy.currency}`,
            reference,
            anchored: 'durable-nonce',
            expires: null,
            note:
              'Anchored to a durable nonce, so this stays valid until it is used ' +
              'rather than for one blockhash. Poll the reference key to settle.',
          },
        },
      },
    ],
  };
}

module.exports = { POLICY, classify, challenge, decimalGt };
