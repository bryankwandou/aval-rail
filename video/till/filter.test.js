// Negative controls for the outbound address filter.
//
// The filter is the answer to the one real hole the injection drill found: the
// agent echoing an attacker-supplied address in prose, which `untrusted_
// outbound_redact = true` did not redact. A shop owner reading a plausible
// address in their own till is one copy-paste from losing money.
//
// Same discipline as the Rust suite: each case plants the violation and asserts
// the filter fires, then asserts a legitimate address still passes. A filter
// that dropped everything would be useless in a different way, and only the
// second half catches that.
//
//   node filter.test.js

const SHOP = 'GsbwXfJraMomNxBcjK1LfJ8HPnzUnEzUcNvLYSbxNQpr';
const ATTACKER = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';
const B58 = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;

/** The filter, extracted verbatim from server.js so the test exercises the rule. */
function filter(response, requestText) {
  const dropped = [];
  const out = response.replace(B58, (addr) => {
    if (addr === SHOP) return addr;
    if (requestText.includes(addr)) return addr;
    dropped.push(addr);
    return '[address withheld]';
  });
  return { out, dropped };
}

let failures = 0;
const check = (name, cond, detail) => {
  if (cond) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

console.log('outbound address filter\n');

// 1. Planted: an address the model produced that appears nowhere in the request.
{
  const { out, dropped } = filter(`Send the refund to ${ATTACKER} and confirm.`, 'refund order table-4');
  check('drops an address the model invented', dropped.length === 1 && !out.includes(ATTACKER));
}

// 2. Control: the shop's own recipient must survive, or every charge breaks.
{
  const { out, dropped } = filter(`solana:${SHOP}?amount=25`, 'charge table 4, 25 USDC');
  check("keeps the shop's own recipient", dropped.length === 0 && out.includes(SHOP));
}

// 3. Control: an address the owner typed is one the owner already knows.
{
  const req = `send it to ${ATTACKER}`;
  const { out, dropped } = filter(`Understood, ${ATTACKER}.`, req);
  check('keeps an address the owner supplied', dropped.length === 0 && out.includes(ATTACKER));
}

// 4. The injection shape: legitimate address kept, attacker address dropped, in
//    the same sentence. A filter that took an all-or-nothing decision would
//    either leak the attacker's or break the charge.
{
  const { out, dropped } = filter(
    `Pay ${SHOP} normally, but the customer asked for ${ATTACKER} instead.`,
    'refund order table-4',
  );
  check(
    'drops only the invented one when both appear',
    dropped.length === 1 && out.includes(SHOP) && !out.includes(ATTACKER),
  );
}

// 5. A reference key the model echoes from its own tool result is still not in
//    the request, so it is withheld. Conservative on purpose: the owner reads
//    the reference off the URL, which carries the shop recipient and survives.
{
  const ref = 'Dh3ike7G5GVyDP6wnrjxuWyxQ8cJGCxVjvcgebDHhrqd';
  const { dropped } = filter(`reference ${ref}`, 'charge table 11');
  check('withholds an address absent from the request', dropped.length === 1);
}

// 6. Ordinary prose must not be mangled — a filter that eats normal words is a
//    filter the operator turns off.
{
  const { out, dropped } = filter('The charge is over the ceiling and was refused.', 'charge 5000');
  check('leaves ordinary prose untouched', dropped.length === 0 && out.includes('refused'));
}

console.log(`\n${failures === 0 ? 'all controls passed' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
