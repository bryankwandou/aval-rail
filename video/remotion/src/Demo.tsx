import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { BEATS, FPS, TOTAL_SECONDS, type Beat, type Tone } from './beats';

// Colours carried from the till and the deck: receipt amber on a counter-dark
// ground. One accent, spent on the thing being read.
const C = {
  ink: '#0B0C0F',
  panel: '#12141A',
  line: '#242833',
  text: '#E9E5DD',
  muted: '#868B96',
  amber: '#E8A33D',
  teal: '#6FC2A0',
  red: '#D06A5A',
};

const TONE: Record<Tone, string> = {
  p: C.amber,
  ok: C.teal,
  bad: C.red,
  warn: '#E2C089',
  c: C.muted,
  '': C.text,
};

const MONO = 'Cascadia Mono, JetBrains Mono, Consolas, ui-monospace, monospace';
const SANS = 'Segoe UI, Inter, system-ui, sans-serif';

/** Which beat owns this second, and how far into it we are. */
const beatAt = (sec: number): { beat: Beat; index: number; local: number } => {
  let index = 0;
  for (let i = 0; i < BEATS.length; i++) if (sec >= BEATS[i].t) index = i;
  return { beat: BEATS[index], index, local: sec - BEATS[index].t };
};

/**
 * Typewriter by slicing the string, never by animating per-character opacity —
 * per-character fades read as a effect, slicing reads as a terminal.
 *
 * The whole block types across the first 60% of its beat, so every beat ends on
 * a still frame the viewer can actually finish reading.
 */
const Terminal: React.FC<{ beat: Beat; local: number }> = ({ beat, local }) => {
  const body = beat.lines.map((l) => l.s).join('\n');
  const typeWindow = beat.len * 0.6;
  const shown = Math.floor(interpolate(local, [0.4, typeWindow], [0, body.length], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));

  let cut = shown;
  const done = shown >= body.length;

  return (
    <div
      style={{
        flex: 1,
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 16,
        padding: '30px 44px',
        fontFamily: MONO,
        // 25px, not 30. The charge beat is twelve lines and its last four are
        // the URL — the one thing on screen a viewer is meant to read. At 30px
        // they fell off the bottom of the panel, which made the money shot the
        // clipped one.
        fontSize: 25,
        lineHeight: 1.58,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, color: C.muted, fontSize: 22 }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: C.amber, display: 'inline-block' }} />
        {beat.stage}
      </div>

      {beat.lines.map((l, i) => {
        const take = Math.max(0, Math.min(l.s.length, cut));
        const text = l.s.slice(0, take);
        const isCursorLine = !done && take > 0 && take < l.s.length;
        cut -= l.s.length + 1;
        return (
          <div key={i} style={{ color: TONE[l.c], whiteSpace: 'pre', minHeight: 40 }}>
            {text}
            {isCursorLine ? <span style={{ background: C.amber, color: C.amber }}>█</span> : null}
          </div>
        );
      })}
    </div>
  );
};

const Rail: React.FC<{ index: number }> = ({ index }) => (
  <div style={{ width: 460, display: 'flex', flexDirection: 'column', gap: 12 }}>
    {BEATS.map((b, i) => {
      const active = i === index;
      const past = i < index;
      return (
        <div
          key={b.name}
          style={{
            background: active ? '#171A21' : 'transparent',
            border: `1px solid ${active ? C.line : 'transparent'}`,
            borderLeft: `3px solid ${active ? C.amber : 'transparent'}`,
            borderRadius: 10,
            padding: '12px 18px',
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 18, color: active ? C.amber : C.muted }}>
            {String(Math.floor(b.t / 60))}:{String(b.t % 60).padStart(2, '0')}
            {past ? '  ✓' : ''}
          </div>
          <div style={{ fontFamily: SANS, fontSize: 22, color: active ? C.text : C.muted, marginTop: 3 }}>
            {b.name}
          </div>
        </div>
      );
    })}
  </div>
);

export const Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const sec = frame / FPS;
  const { beat, index, local } = beatAt(sec);

  // Entrance for the whole frame, once. Damping 200: no bounce. A payments
  // video that boings has told you something about itself.
  const intro = spring({ frame, fps: FPS, config: { damping: 200 } });

  // The caption is the voiceover line, on screen for anyone watching muted —
  // which is most people.
  const capIn = interpolate(local, [0, 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const capOut = interpolate(local, [beat.len - 0.8, beat.len], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: C.ink, padding: 72, fontFamily: SANS, opacity: intro }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 22, marginBottom: 34 }}>
        <div style={{ fontSize: 40, fontWeight: 650, letterSpacing: '-0.02em', color: C.text }}>Aval</div>
        <div style={{ fontSize: 26, color: C.muted }}>Caixa · the shop till — Solana Pay over ZeroClaw</div>
        <div
          style={{
            marginLeft: 'auto',
            fontFamily: MONO,
            fontSize: 22,
            color: C.muted,
            border: `1px solid ${C.line}`,
            borderRadius: 999,
            padding: '8px 18px',
          }}
        >
          captured output · not a mock-up
        </div>
      </div>

      <div style={{ display: 'flex', gap: 34, flex: 1, minHeight: 0 }}>
        <Terminal beat={beat} local={local} />
        <Rail index={index} />
      </div>

      <div
        style={{
          marginTop: 30,
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 14,
          padding: '30px 40px',
          minHeight: 168,
          opacity: Math.min(capIn, capOut),
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: '0.14em', color: C.muted, marginBottom: 14 }}>
          NARRATION
        </div>
        <div style={{ fontSize: 34, lineHeight: 1.45, color: C.text, textWrap: 'balance' } as React.CSSProperties}>
          {beat.vo}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 26 }}>
        <div style={{ flex: 1, height: 4, background: C.line, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${progress * 100}%`, height: '100%', background: C.amber }} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 22, color: C.muted }}>
          {String(Math.floor(sec / 60))}:{String(Math.floor(sec % 60)).padStart(2, '0')} / {String(Math.floor(TOTAL_SECONDS / 60))}:00
        </div>
      </div>
    </AbsoluteFill>
  );
};
