// Closes the loop the submission has been missing: a customer actually paying
// one of the agent's requests, on devnet, and the reference key proving it.
//
// Until now `settlement-poll` was proven only as a mechanism — the happy path
// had never once run, which is the largest honest gap in the write-up. This
// script is the customer's side of the exchange, and nothing else: it holds the
// customer's key, the agent holds none.
//
// Solana Pay puts the reference in the instruction as a read-only, non-signer
// account. It moves no lamports and signs nothing; it exists so that
// getSignaturesForAddress(reference) finds exactly the transaction that paid
// this order and no other. That is what makes settlement detectable when many
// orders share one shop wallet.
//
//   node pay-request.js "solana:<recipient>?amount=..&reference=..&label=.."

const path = require('path');
const fs = require('fs');

const WEB3 = 'E:/000VSCODE PROJECT MULAI DARI DESEMBER 2025/ATLAS-QUANT/node_modules/@solana/web3.js';
const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} = require(WEB3);

const RPC = 'https://api.devnet.solana.com';
const KEYPAIR = 'C:/Users/arche/.config/solana/veztra-deploy.json';

const url = process.argv[2];
if (!url || !url.startsWith('solana:')) {
  console.error('usage: node pay-request.js "solana:<recipient>?amount=...&reference=..."');
  process.exit(1);
}

// Parse the request the agent built. Deliberately not re-derived from anything
// local: whatever the tool returned is what gets paid, character for character.
const [recipientPart, query] = url.slice('solana:'.length).split('?');
const params = new URLSearchParams(query || '');
const recipient = new PublicKey(recipientPart);
const reference = new PublicKey(params.get('reference'));
const amount = params.get('amount');
const label = params.get('label');

if (params.get('spl-token')) {
  console.error(
    'This pays native SOL only. An SPL request needs the mint\'s token accounts on both\n' +
    'sides, and the customer wallet is the one that should create them — out of scope\n' +
    'for a script whose job is to prove the reference is detectable.',
  );
  process.exit(1);
}

(async () => {
  const connection = new Connection(RPC, 'confirmed');
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR, 'utf8')));
  const customer = Keypair.fromSecretKey(secret);

  const lamports = Math.round(Number(amount) * LAMPORTS_PER_SOL);

  console.log(`paying   ${amount} SOL  →  ${recipient.toBase58()}`);
  console.log(`order    ${label}`);
  console.log(`from     ${customer.publicKey.toBase58()}  (the customer, not the agent)`);
  console.log(`ref      ${reference.toBase58()}`);

  const ix = SystemProgram.transfer({
    fromPubkey: customer.publicKey,
    toPubkey: recipient,
    lamports,
  });

  // The reference, exactly as the spec requires: read-only, non-signer.
  ix.keys.push({ pubkey: reference, isSigner: false, isWritable: false });

  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [customer], {
    commitment: 'confirmed',
  });

  console.log(`\nsignature  ${sig}`);

  // The settlement check itself — one RPC call against the reference key, which
  // is precisely what the cron SOP does every five minutes.
  const found = await connection.getSignaturesForAddress(reference, { limit: 5 });
  console.log(`\ngetSignaturesForAddress(reference) → ${found.length} result(s)`);
  for (const f of found) {
    console.log(`  ${f.signature}  slot ${f.slot}  err ${JSON.stringify(f.err)}`);
  }

  const matched = found.some((f) => f.signature === sig);
  console.log(matched ? '\nSETTLED: the reference found the payment.' : '\nNOT FOUND — investigate.');
  process.exit(matched ? 0 : 1);
})().catch((e) => {
  console.error('failed:', e.message);
  process.exit(1);
});
