'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * The hero is the product doing its job, replayed.
 *
 * The owner's sentence types itself, the tool call appears, and the transfer
 * request resolves line by line. Every string below was printed by a real run —
 * the recipient, the mint and the reference are the ones from the recorded
 * charge, not placeholders.
 *
 * It replays rather than calling the daemon, because the daemon lives on the
 * operator's own machine and a landing page cannot reach it. That distinction
 * is stated on the page rather than hidden.
 */
const SCRIPT: { s: string; tone: 'cmd' | 'meta' | 'call' | 'url' | 'dim'; pause?: number }[] = [
  { s: 'charge table 4 for 25 USDC', tone: 'cmd', pause: 620 },
  { s: '', tone: 'dim' },
  { s: '{"discovered":1,"registered":1}   "retained":4', tone: 'meta', pause: 240 },
  { s: '', tone: 'dim' },
  { s: 'agent wants to execute: solana_pay_build', tone: 'call', pause: 420 },
  { s: '   amount: 25, label: table-4', tone: 'dim', pause: 300 },
  { s: '', tone: 'dim' },
  { s: 'solana:GsbwXfJraMomNxBcjK1LfJ8HPnzUnEzUcNvLYSbxNQpr', tone: 'url' },
  { s: '  ?amount=25', tone: 'url' },
  { s: '  &spl-token=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', tone: 'url' },
  { s: '  &reference=AXZnTMLRrQWznLgkGd8fqhaJFHiZv1BXufnG6s5P1eKx', tone: 'url' },
  { s: '  &label=table-4', tone: 'url', pause: 2600 },
];

const COLOUR = {
  cmd: 'var(--amber)',
  meta: 'var(--muted)',
  call: '#e2c089',
  url: 'var(--teal)',
  dim: 'var(--bone-dim)',
} as const;

export function Till() {
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced.current) {
      setLine(SCRIPT.length);
      return;
    }
  }, []);

  useEffect(() => {
    if (reduced.current) return;
    if (line >= SCRIPT.length) {
      const restart = setTimeout(() => {
        setLine(0);
        setChars(0);
      }, 3200);
      return () => clearTimeout(restart);
    }
    const current = SCRIPT[line];
    if (chars < current.s.length) {
      const t = setTimeout(() => setChars((c) => c + 1), current.tone === 'cmd' ? 46 : 12);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setLine((l) => l + 1);
      setChars(0);
    }, current.pause ?? 90);
    return () => clearTimeout(t);
  }, [line, chars]);

  // Every line is rendered from the start; the ones that have not been typed
  // yet are transparent. That reserves the exact height the finished replay
  // needs — no guessed `min-height` leaving dead space under two lines of text,
  // and no layout jumping as each line lands.
  const rendered = useMemo(
    () =>
      SCRIPT.map((l, i) => ({
        ...l,
        text: i < line ? l.s : i === line ? l.s.slice(0, chars) : '',
        typing: i === line && chars < l.s.length,
        pending: i > line,
      })),
    [line, chars],
  );

  return (
    <div className="grain relative overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex items-center gap-3 border-b border-line px-6 py-3.5">
        <span className="live-dot inline-block h-2 w-2 rounded-full bg-teal" />
        <span className="font-mono text-[12.5px] tracking-wide text-muted">
          the owner’s channel · replay of a recorded run
        </span>
      </div>

      <div className="px-6 py-5 font-mono text-[13.5px] leading-[1.75] sm:text-[14.5px]">
        {rendered.map((l, i) => (
          <div
            key={i}
            aria-hidden={l.pending || undefined}
            style={{
              color: COLOUR[l.tone],
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              // an empty line still has to occupy its row, or the panel grows
              minHeight: '1.75em',
            }}
          >
            {l.tone === 'cmd' && l.text ? <span className="text-muted">owner ▸ </span> : null}
            {l.text}
            {l.typing ? <span className="caret" /> : null}
          </div>
        ))}
      </div>

      <div className="rule-sweep h-px w-full" />
    </div>
  );
}
