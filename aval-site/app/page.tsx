import { Nav } from './components/Nav';
import { Till } from './components/Till';
import { Reveal } from './components/Reveal';
import { Mark } from './components/Mark';
import { Endorsement } from './components/Endorsement';

/*
  Copy rules for this page, since copy was one of the things that failed review:
  no emoji, no "unlock / leverage / seamless / empower / revolutionise", and no
  sentence that could sit unchanged on another product's site. Numbers a reader
  can go and re-check beat adjectives, so the numbers do the work.
*/

const LADDER = [
  {
    tier: 'T0',
    name: 'Reading',
    body: 'Balances, signatures, whether a reference key has been used. The worst case is a wrong answer, and the operator holds an RPC key at most.',
    used: 'settlement-poll runs here.',
  },
  {
    tier: 'T1',
    name: 'Building',
    body: 'An unsigned transaction anchored to a durable nonce. It can sit in a queue for hours without going stale. A person signs it, or nobody does.',
    used: 'Refunds run here.',
    accent: true,
  },
  {
    tier: 'T2',
    name: 'Signing',
    body: 'Holding a key and submitting. Aval does this on no path at all, so there is no key to steal and no session wallet to drain.',
    used: 'Deliberately unused.',
    off: true,
  },
];

const FAILURES = [
  {
    n: '01',
    claim: 'Invented an endpoint to mint a key',
    detail:
      'Asked for a reference key with no tool that could make one, it reached for HTTP and produced example.com/generate-reference-key.',
    fix: 'Key generation moved into a Rust component that has no network permission at all.',
  },
  {
    n: '02',
    claim: 'Invented an endpoint to check a token',
    detail: 'Same shape, different sentence: api.example.com/shop/token/verify. Neither address exists.',
    fix: 'The allowlist is compared inside the component, against the operator’s own config.',
  },
  {
    n: '03',
    claim: '“Table 4 has been charged”',
    detail: 'Confident, formatted, and behind it native_tool_calls: 0. No charge existed.',
    fix: 'The till reads the tool result, never the sentence. No URL means no charge.',
  },
  {
    n: '04',
    claim: 'Wrote a fake tool result under attack',
    detail:
      'An injected message asked for a refund elsewhere. The model composed a <tool_result> block as prose to make it look finished.',
    fix: 'Nothing ran. The counter read zero, and a refund destination is read from the paying transaction.',
  },
];

const TRAPS: [string, string][] = [
  ['schema_version missing', 'The whole provider block is discarded. No warning anywhere.'],
  ['[channels.telegram]', 'Must be [channels.telegram.default] under v3. Binds nothing otherwise.'],
  ['allowed_users', 'A v2 field. It takes the sender allowlist with it when it goes.'],
  ['execution_mode', 'The key is default_execution_mode. The wrong one is accepted in silence.'],
  ['deterministic mode', 'Runs headless with no agent turn, so ordinary steps fail closed.'],
  ['wit/v0 drift', 'One enum variant apart. Compiles, installs, lists, then refuses to instantiate.'],
];

export default function Page() {
  return (
    <>
      {/*
        A keyboard user landing here should not have to tab through five nav
        links to reach the page. Visually hidden until focused, which is the
        only time it is useful.
      */}
      <a
        href="#problem"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:r-key focus:bg-amber focus:px-4 focus:py-2 focus:text-[14px] focus:font-semibold focus:text-[#1a1204]"
      >
        Skip to content
      </a>

      <Nav />

      <main id="top" className="mx-auto max-w-6xl px-6">
        {/*
          The track is minmax(0,1fr), not 1fr. A default `auto` track takes its
          min-content contribution from the widest thing inside it, and the
          terminal holds a 56-character base58 mint — which resolved the single
          column to 596px inside a 390px phone and pushed the whole document
          sideways. `minmax(0, …)` lets the track shrink and hands the scrolling
          to the panel that actually needs it.
        */}
        <section className="relative grid grid-cols-[minmax(0,1fr)] items-center gap-14 pb-28 pt-36 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:pt-44">
          <Endorsement />
          <div>
            <Reveal>
              <p className="mb-5 font-mono text-[12.5px] uppercase tracking-[0.19em] text-amber">
                Solana Pay · durable nonce · ZeroClaw
              </p>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 className="text-balance text-[46px] font-semibold leading-[1.04] tracking-[-0.03em] sm:text-[60px]">
                An agent’s payment dies in ninety seconds. The person approving it is
                serving a table.
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mt-7 max-w-[54ch] text-[18.5px] leading-[1.62] text-bone-dim">
                That is why agent payment designs quietly drop the human. A Solana
                blockhash expires while the approval sits unread, so the transaction is
                rubbish by the time anyone answers. Aval anchors it to a durable nonce
                instead, and the request waits as long as the shop does.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a
                  href="#proof"
                  className="rounded-full bg-amber px-6 py-3 text-[15px] font-semibold text-[#1a1204] transition-transform duration-200 hover:-translate-y-0.5"
                >
                  See the on-chain proof
                </a>
                <a
                  href="#failures"
                  className="rounded-full border border-line-2 px-6 py-3 text-[15px] text-bone transition-colors duration-200 hover:border-amber hover:text-amber"
                >
                  Read what went wrong
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <Till />
          </Reveal>
        </section>

        {/*
          Section rhythm is deliberately uneven from here down: 16 / 28 / 20 /
          24 / 18 / 26. Equal padding on every section is the loudest tell that
          nobody made a decision — the page should breathe differently where the
          argument changes pace.
        */}
        <section id="problem" className="border-t border-line py-16">
          <Reveal>
            <h2 className="max-w-[22ch] text-[34px] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[42px]">
              The gate is not the problem. The clock behind it is.
            </h2>
          </Reveal>

          {/*
            Not a matched pair. The failing case is recessed — no panel fill, a
            dimmer border — and the working one carries the weight. Two equal
            cards would present them as alternatives of equal standing, and they
            are not: one of them is the thing that does not work.
          */}
          <div className="mt-12 grid gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)]">
            <Reveal delay={0.05}>
              <article className="r-sheet h-full border border-line/70 p-7">
                <p className="font-mono text-[12.5px] uppercase tracking-[0.16em] text-red">
                  Ordinary blockhash
                </p>
                <p className="mt-4 text-[17px] leading-[1.6] text-bone-dim">
                  Signed at midday, queued for approval, answered four and a half hours
                  later. By then the hash was long dead.
                </p>
                <pre className="mt-6 overflow-x-auto r-key border border-line bg-ink-2 p-4 font-mono text-[13px] leading-[1.7] text-red">
{`$ solana confirm -v 4kR8...control
  Result: Error
  Hash has expired`}
                </pre>
              </article>
            </Reveal>

            <Reveal delay={0.11}>
              <article className="r-sheet h-full border p-7" style={{ borderColor: 'rgba(232,163,61,0.35)', background: 'var(--panel)' }}>
                <p className="font-mono text-[12.5px] uppercase tracking-[0.16em] text-amber">
                  Durable nonce
                </p>
                <p className="mt-4 text-[17px] leading-[1.6] text-bone-dim">
                  Same wait, same moment of signing. The nonce keeps its value in an
                  account, so the transaction is still good whenever the answer comes.
                </p>
                <pre className="mt-6 overflow-x-auto r-key border border-line bg-ink-2 p-4 font-mono text-[13px] leading-[1.7] text-teal">
{`$ solana confirm -v 5U2c5RV3...QZnj7
  Result: Finalized
  AdvanceNonceAccount (instruction 0)`}
                </pre>
              </article>
            </Reveal>
          </div>
        </section>

        <section id="proof" className="border-t border-line py-28">
          <Reveal>
            <p className="font-mono text-[12.5px] uppercase tracking-[0.19em] text-amber">
              Devnet, checkable by anyone
            </p>
            <h2 className="mt-4 max-w-[24ch] text-[34px] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[42px]">
              The receiving wallet was never funded by an airdrop.
            </h2>
            <p className="mt-6 max-w-[62ch] text-[18px] leading-[1.6] text-bone-dim">
              It was generated empty and left alone. Its balance came from that one
              transfer and from nothing else, which is the difference between a proof
              and a screenshot.
            </p>
          </Reveal>

          {/*
            A strip, not three marketing tiles. These are readings off a system,
            so they get the treatment a system gives them: hairline dividers,
            tabular figures that line up, no container. Three equal cards would
            say "features"; this says "measurements".
          */}
          <div className="mt-12 grid divide-y divide-line border-y border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              { k: '4h 29m', v: 'between signing and landing' },
              { k: '0.01 SOL', v: 'the whole balance, from that transfer' },
              { k: '9.9 h', v: 'daemon uptime, unattended, at last check' },
            ].map((s, i) => (
              <Reveal key={s.k} delay={i * 0.07}>
                <div className="px-1 py-6 sm:px-7 sm:first:pl-0">
                  <p className="font-mono text-[34px] leading-none tracking-tight text-amber tabular-nums">
                    {s.k}
                  </p>
                  <p className="mt-3 text-[14.5px] leading-[1.45] text-muted">{s.v}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <pre className="mt-6 overflow-x-auto r-housing border border-line bg-ink-2 p-6 font-mono text-[12.5px] leading-[1.75] text-bone-dim">
{`signature   5U2c5RV3TEurNYFeC7r17jK5CWkRgMzwEsxA978M9DLL
            Yhjx38JmUkK1yVG5qiXVqo9z2XPRbesXfgNeuBbQZnj7

nonce advanced after use — the same transaction cannot land twice
  7tfvBRBMvnitJJ9tCN9BZLADhaPuGgJ4m4KwguTCYr9E  →  A8zkZeDL...`}
            </pre>
          </Reveal>
        </section>

        <section id="custody" className="border-t border-line py-20">
          <Reveal>
            <h2 className="max-w-[26ch] text-[34px] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[42px]">
              The limits live in Rust. The model never sees a field it could raise.
            </h2>
            <p className="mt-6 max-w-[62ch] text-[18px] leading-[1.6] text-bone-dim">
              A ceiling written into a prompt is a suggestion. This one is read from the
              operator’s own config inside the sandbox, and it is not among the
              arguments the model can pass, so no message arriving in the shop can move
              it.
            </p>
          </Reveal>

          {/*
            Not three equal columns. T1 is the tier this product lives on, so it
            gets the width — the layout should carry the same claim the copy
            does. Equal thirds would say all three matter equally, which is the
            opposite of the argument.
          */}
          <div className="mt-12 grid gap-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)_minmax(0,0.85fr)]">
            {LADDER.map((t, i) => (
              <Reveal key={t.tier} delay={i * 0.07}>
                <article
                  className={`h-full border bg-panel transition-transform duration-300 hover:-translate-y-1 ${
                    t.accent ? 'r-housing p-8' : 'r-sheet p-7'
                  }`}
                  style={{
                    borderColor: t.accent ? 'rgba(232,163,61,0.4)' : 'var(--line)',
                    opacity: t.off ? 0.62 : 1,
                  }}
                >
                  <p
                    className="font-mono text-[13px] tracking-[0.16em]"
                    style={{ color: t.accent ? 'var(--amber)' : 'var(--muted)' }}
                  >
                    {t.tier}
                  </p>
                  <h3 className="mt-2 text-[22px] font-semibold tracking-tight">{t.name}</h3>
                  <p className="mt-3 text-[15.5px] leading-[1.55] text-bone-dim">{t.body}</p>
                  <p className="mt-5 font-mono text-[12.5px] text-muted">{t.used}</p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.24}>
            <pre className="mt-6 overflow-x-auto r-housing border border-line bg-ink-2 p-6 font-mono text-[13px] leading-[1.75] text-bone-dim">
{`# the component's entire permission grant
permissions = ["config_read"]     # no http_client

# and what came back when a charge went over the ceiling
amount 5000 is over the shop's per-charge ceiling of 500`}
            </pre>
          </Reveal>
        </section>

        <section id="failures" className="border-t border-line py-24">
          <Reveal>
            <p className="font-mono text-[12.5px] uppercase tracking-[0.19em] text-amber">
              Published because it is the useful part
            </p>
            <h2 className="mt-4 max-w-[26ch] text-[34px] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[42px]">
              Four times, the model reported work it had not done.
            </h2>
            <p className="mt-6 max-w-[62ch] text-[18px] leading-[1.6] text-bone-dim">
              None of it was fixed by better wording. Every fix was the same move: take
              the decision off the model and put it in code that cannot be talked round.
            </p>
          </Reveal>

          {/*
            A ledger of incidents rather than four matching cards. Each entry is
            a row: the number holds its own column at display size, the claim and
            the evidence sit in the reading column, and the fix is set apart by a
            rule rather than by another box. Four identical sheets said "feature
            grid"; this says "log".
          */}
          <ol className="mt-12 border-t border-line">
            {FAILURES.map((f, i) => (
              <Reveal key={f.n} delay={i * 0.06}>
                <li className="group grid gap-x-8 gap-y-4 border-b border-line py-9 md:grid-cols-[5rem_minmax(0,1fr)_minmax(0,22rem)]">
                  <span className="font-mono text-[30px] leading-none text-line-2 tabular-nums transition-colors duration-300 group-hover:text-amber">
                    {f.n}
                  </span>

                  <div>
                    <h3 className="text-[20px] font-semibold leading-snug tracking-tight text-red">
                      {f.claim}
                    </h3>
                    <p className="mt-3 text-[15.5px] leading-[1.55] text-bone-dim">{f.detail}</p>
                  </div>

                  <p className="border-l-2 border-teal pl-5 text-[15px] leading-[1.5] text-teal md:self-center">
                    {f.fix}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        <section className="border-t border-line py-18">
          <Reveal>
            <h2 className="max-w-[28ch] text-[34px] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[42px]">
              Six settings that start the daemon cleanly and do nothing at all.
            </h2>
            <p className="mt-6 max-w-[62ch] text-[18px] leading-[1.6] text-bone-dim">
              Each of these cost an evening. They are written down so the next operator
              loses an hour instead.
            </p>
          </Reveal>

          {/*
            Deliberately not a card. Every other block on this page is a panel
            with the same radius and the same border, and six more of them in a
            row is the point where a layout stops having rhythm. This is a
            ledger: hairlines, no container, the code column holding its own
            width so the eye can run down it.
          */}
          <div className="mt-10 border-t border-line">
            {TRAPS.map(([k, v], i) => (
              <Reveal key={k} delay={i * 0.045}>
                <div className="grid gap-2 border-b border-line py-5 sm:grid-cols-[minmax(0,20rem)_1fr] sm:items-baseline sm:gap-8">
                  <code className="font-mono text-[14px] text-amber">{k}</code>
                  <p className="text-[15.5px] leading-[1.5] text-bone-dim">{v}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="run" className="border-t border-line py-26">
          <Reveal>
            <h2 className="max-w-[24ch] text-[34px] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[42px]">
              Set it up in an evening, on your own machine.
            </h2>
            <p className="mt-6 max-w-[62ch] text-[18px] leading-[1.6] text-bone-dim">
              Plugins are not in the release binary, so the host is built from source.
              After that it is three procedures, one skill and one config file.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <pre className="mt-9 overflow-x-auto r-housing border border-line bg-ink-2 p-6 font-mono text-[13px] leading-[1.85] text-bone-dim">
{`cargo build --release --features plugins-wasm-cranelift
zeroclaw --config-dir ./runtime sop validate
zeroclaw --config-dir ./runtime daemon

curl http://127.0.0.1:42617/health     # the daemon answers for itself`}
            </pre>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="mt-8 max-w-[62ch] text-[15.5px] leading-[1.6] text-muted">
              The terminal in the hero replays a recorded run rather than holding a live
              connection. The daemon runs on the operator’s own machine, which is the
              point of the thing, and a public page cannot reach it.
            </p>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-10">
          <span className="text-amber">
            <Mark size={22} />
          </span>
          <p className="text-[14.5px] text-muted">
            Aval — the co-sign rail. Caixa is the till it runs.
          </p>
          <p className="ml-auto font-mono text-[12.5px] text-muted">
            Custody tier T0 on the charge path. No keys held.
          </p>
        </div>
      </footer>
    </>
  );
}
