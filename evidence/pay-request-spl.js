// The SPL half of the settlement proof.
//
// `pay-request.js` closed the loop in native SOL. This does the same thing for
// a token, which is the case a shop actually cares about — the brief asks for
// USDC reconciliation, and a merchant is not invoicing in SOL.
//
// The mechanism under test is unchanged and that is the point: the reference is
// the same read-only, non-signer account in the same position, and settlement
// is still one getSignaturesForAddress call. What changes is the transfer
// instruction and the two token accounts it moves between.
//
// The agent holds no key here either. This is the customer's wallet paying the
// customer's way.
//
//   node pay-request-spl.js "solana:<recipient>?amount=..&spl-token=..&reference=.."

const fs = require('fs');

const W3 = 'E:/000VSCODE PROJECT MULAI DARI DESEMBER 2025/ATLAS-QUANT/node_modules/@solana/web3.js';
// ATLAS-QUANT carries web3.js but not spl-token; bb-frontend has both.
const SPL = 'E:/000VSCODE PROJECT MULAI DARI DESEMBER 2025/bb-frontend/node_modules/@solana/spl-token';

const { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } = require(W3);
const {
  getAssociatedTokenAddress,
  getAccount,
  getMint,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
} = require(SPL);

const RPC = 'https://api.devnet.solana.com';
const KEYPAIR = 'C:/Users/arche/.config/solana/veztra-deploy.json';

const url = process.argv[2];
if (!url || !url.startsWith('solana:')) {
  console.error('usage: node pay-request-spl.js "solana:<recipient>?amount=..&spl-token=..&reference=.."');
  process.exit(1);
}

const [recipientPart, query] = url.slice('solana:'.length).split('?');
const p = new URLSearchParams(query || '');
const recipient = new PublicKey(recipientPart);
const reference = new PublicKey(p.get('reference'));
const mint = new PublicKey(p.get('spl-token'));
const amount = p.get('amount');
const label = p.get('label');

(async () => {
  const connection = new Connection(RPC, 'confirmed');
  const customer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR, 'utf8'))),
  );

  // Decimals come from the mint itself, never from a constant. A hard-coded 6
  // against a 9-decimal mint undercharges by a factor of a thousand, and the
  // wallet will not warn anyone.
  const info = await getMint(connection, mint);
  const factor = 10n ** BigInt(info.decimals);
  const [whole, frac = ''] = String(amount).split('.');
  const base =
    BigInt(whole) * factor +
    BigInt((frac + '0'.repeat(info.decimals)).slice(0, info.decimals) || '0');

  const from = await getAssociatedTokenAddress(mint, customer.publicKey);
  const to = await getAssociatedTokenAddress(mint, recipient);

  console.log(`paying   ${amount} of ${mint.toBase58()}`);
  console.log(`order    ${label}`);
  console.log(`from     ${customer.publicKey.toBase58()}  (the customer, not the agent)`);
  console.log(`ref      ${reference.toBase58()}`);
  console.log(`decimals ${info.decimals}  →  ${base} base units`);

  const tx = new Transaction();

  // The shop may never have received this mint before. The customer's wallet
  // creates the destination account, which is how a real wallet behaves.
  let needsAta = false;
  try {
    await getAccount(connection, to);
  } catch {
    needsAta = true;
  }
  if (needsAta) {
    console.log('recipient has no token account for this mint — creating it');
    tx.add(createAssociatedTokenAccountInstruction(customer.publicKey, to, recipient, mint));
  }

  // transferChecked, not transfer: it re-verifies decimals on chain, so a
  // client that computed base units wrongly fails loudly instead of moving the
  // wrong amount.
  const ix = createTransferCheckedInstruction(
    from,
    mint,
    to,
    customer.publicKey,
    base,
    info.decimals,
  );

  // The reference, per the Solana Pay spec: read-only, non-signer, moves
  // nothing. It exists so one RPC call finds this payment and no other.
  ix.keys.push({ pubkey: reference, isSigner: false, isWritable: false });
  tx.add(ix);

  const sig = await sendAndConfirmTransaction(connection, tx, [customer], {
    commitment: 'confirmed',
  });
  console.log(`\nsignature  ${sig}`);

  const found = await connection.getSignaturesForAddress(reference, { limit: 5 });
  console.log(`\ngetSignaturesForAddress(reference) → ${found.length} result(s)`);
  for (const f of found) console.log(`  ${f.signature}  slot ${f.slot}  err ${JSON.stringify(f.err)}`);

  const ok = found.some((f) => f.signature === sig);
  console.log(ok ? '\nSETTLED: the reference found the SPL payment.' : '\nNOT FOUND — investigate.');
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error('failed:', e.message);
  process.exit(1);
});
