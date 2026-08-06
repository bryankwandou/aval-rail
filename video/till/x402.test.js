// Negative controls for the co-sign threshold. Same discipline as the others:
// plant the violation, prove the boundary fires, then prove the ordinary case
// still passes — a threshold that refuses everything is broken differently.
const { classify, decimalGt } = require('./x402-cosign');
let f = 0;
const ok = (n, c) => { if (c) console.log(`  ok    ${n}`); else { f++; console.log(`  FAIL  ${n}`); } };

console.log('x402 co-sign threshold\n');
ok('small payment resolves inline, as x402 expects', classify('5').tier === 'auto');
ok('at the threshold is still auto (boundary is >, not >=)', classify('100').tier === 'auto');
ok('one cent over the threshold needs a human',  classify('100.01').tier === 'cosign');
ok('over the ceiling is refused, not co-signed', classify('501').tier === 'refused');
ok('ceiling beats threshold — approval cannot buy past it', classify('5000').tier === 'refused');
ok('a non-decimal amount is refused, never coerced', classify('1e3').tier === 'refused');
ok('decimals compare numerically, not lexicographically', decimalGt('9', '100') === false);
ok('and the other direction', decimalGt('100.01', '100') === true);
ok('trailing zeros do not change the verdict', classify('100.00').tier === 'auto');
console.log(`\n${f === 0 ? 'all controls passed' : f + ' FAILED'}`);
process.exit(f ? 1 : 0);
