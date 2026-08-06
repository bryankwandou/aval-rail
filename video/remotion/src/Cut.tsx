import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';

/**
 * The re-cut, after fourteen rejections.
 *
 * What the accepted reference does that the rejected version did not:
 *
 *   - It runs 73 seconds, not 180.
 *   - Every scene is a different composition. Ours repeated one layout seven
 *     times: terminal left, beat rail right, narration box below.
 *   - It leads each scene with a claim in a headline, then supports it. Ours
 *     showed evidence and never made a claim.
 *   - It puts the product on screen, inside browser chrome with a visible URL.
 *     Ours showed terminal text *about* a product that never appeared.
 *   - It has no progress bar, no beat list, no "captured output" badge. Ours
 *     shipped the teleprompter's operator UI as the film — which is why it read
 *     as a screen recording of an internal tool. It was one.
 *
 * So: five scenes, five layouts, 80 seconds, one claim each, the product on
 * screen twice, and none of the instrument.
 */

const FPS = 30;
const s = (n: number) => Math.round(n * FPS);

const C = {
  ink: '#0A0B0E',
  panel: '#14161D',
  line: '#232733',
  bone: '#ECE7DD',
  dim: '#B8B3A9',
  muted: '#7E838F',
  amber: '#E8A33D',
  teal: '#62B898',
  red: '#CF6A58',
};

const SANS = 'IBM Plex Sans, Segoe UI, system-ui, sans-serif';
const MONO = 'IBM Plex Mono, Cascadia Mono, Consolas, monospace';

/** One entrance curve for the whole film, so it reads as one hand. */
const rise = (frame: number, delay = 0) => {
  const t = interpolate(frame - delay, [0, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });
  return { opacity: t, transform: `translateY(${(1 - t) * 16}px)` };
};

const Eyebrow: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      fontFamily: MONO,
      fontSize: 24,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: C.amber,
      ...style,
    }}
  >
    {children}
  </div>
);

const Claim: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <h1
    style={{
      fontFamily: SANS,
      fontSize: 78,
      fontWeight: 600,
      lineHeight: 1.04,
      letterSpacing: '-0.03em',
      margin: '26px 0 0',
      color: C.bone,
      textWrap: 'balance',
      ...style,
    } as React.CSSProperties}
  >
    {children}
  </h1>
);

/** Browser chrome. The URL bar is the point — it says this is a real address. */
const Browser: React.FC<{ url: string; src: string; style?: React.CSSProperties }> = ({
  url,
  src,
  style,
}) => (
  <div
    style={{
      borderRadius: 14,
      overflow: 'hidden',
      border: `1px solid ${C.line}`,
      background: C.panel,
      boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
      ...style,
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 22px',
        borderBottom: `1px solid ${C.line}`,
      }}
    >
      {['#D06A5A', '#E2C089', '#62B898'].map((c) => (
        <span key={c} style={{ width: 13, height: 13, borderRadius: '50%', background: c }} />
      ))}
      <span
        style={{
          marginLeft: 10,
          fontFamily: MONO,
          fontSize: 22,
          color: C.dim,
          background: C.ink,
          border: `1px solid ${C.line}`,
          borderRadius: 999,
          padding: '7px 22px',
        }}
      >
        {url}
      </span>
    </div>
    <Img src={staticFile(src)} style={{ width: '100%', display: 'block' }} />
  </div>
);

/* ---------------------------------------------------------------- scenes -- */

/** 1. The problem, stated once, with the failure underneath it. */
const Problem: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ink, padding: '130px 120px', justifyContent: 'center' }}>
      <div style={rise(f)}>
        <Eyebrow>The structural problem</Eyebrow>
        <Claim style={{ maxWidth: 1300 }}>
          A Solana blockhash lasts ninety seconds. The person approving the payment is
          serving a table.
        </Claim>
      </div>

      <div
        style={{
          ...rise(f, 34),
          marginTop: 64,
          fontFamily: MONO,
          fontSize: 32,
          lineHeight: 1.7,
          color: C.red,
          borderLeft: `3px solid ${C.red}`,
          paddingLeft: 34,
        }}
      >
        $ solana confirm -v 4kR8...control
        <br />
        &nbsp;&nbsp;Result: Error
        <br />
        &nbsp;&nbsp;Hash has expired
      </div>
    </AbsoluteFill>
  );
};

/** 2. The answer, as a comparison. Two outcomes, one moment of signing. */
const Proof: React.FC = () => {
  const f = useCurrentFrame();
  const Col: React.FC<{
    label: string;
    tone: string;
    head: string;
    body: string;
    delay: number;
  }> = ({ label, tone, head, body, delay }) => (
    <div
      style={{
        ...rise(f, delay),
        flex: 1,
        background: C.panel,
        border: `1px solid ${tone === C.teal ? 'rgba(98,184,152,.4)' : C.line}`,
        borderRadius: 14,
        padding: '46px 44px',
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: '.14em', color: tone }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: SANS,
          fontSize: 54,
          fontWeight: 600,
          color: tone,
          marginTop: 20,
          letterSpacing: '-0.02em',
        }}
      >
        {head}
      </div>
      <div style={{ fontFamily: SANS, fontSize: 28, color: C.dim, marginTop: 16, lineHeight: 1.5 }}>
        {body}
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{ background: C.ink, padding: '120px 120px', justifyContent: 'center' }}>
      <div style={rise(f)}>
        <Eyebrow>Devnet · both signed at the same moment</Eyebrow>
        <Claim style={{ fontSize: 66, maxWidth: 1250 }}>
          A durable nonce outlived the approval by four and a half hours.
        </Claim>
      </div>

      <div style={{ display: 'flex', gap: 30, marginTop: 62 }}>
        <Col
          label="ORDINARY BLOCKHASH"
          tone={C.red}
          head="Hash has expired"
          body="Dead before anyone answered."
          delay={30}
        />
        <Col
          label="DURABLE NONCE"
          tone={C.teal}
          head="Finalized"
          body="Submitted 4h 29m after signing."
          delay={44}
        />
      </div>

      <div
        style={{
          ...rise(f, 62),
          marginTop: 40,
          fontFamily: MONO,
          fontSize: 23,
          color: C.muted,
        }}
      >
        5U2c5RV3TEurNYFeC7r17jK5CWkRgMzwEsxA978M9DLLYhjx38JmUkK1yVG5qiXVqo9z2XPRbesXfgNeuBbQZnj7
        <br />
        the recipient was generated unfunded and never airdropped
      </div>
    </AbsoluteFill>
  );
};

/** 3. The product, on screen, with its address visible. */
const Product: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ink, padding: '90px 110px' }}>
      <div style={rise(f)}>
        <Eyebrow>The till, against the running daemon</Eyebrow>
        <Claim style={{ fontSize: 60, maxWidth: 1150 }}>
          The owner types it the way they would tell a waiter.
        </Claim>
      </div>
      <Browser
        url="127.0.0.1:8099"
        src="till-idle.png"
        style={{ ...rise(f, 30), marginTop: 46, maxHeight: 620 }}
      />
    </AbsoluteFill>
  );
};

/** 4. The refusal. The one thing a safety judge is looking for. */
const Ceiling: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ink, padding: '130px 120px', justifyContent: 'center' }}>
      <div style={rise(f)}>
        <Eyebrow>Enforced in Rust, not in the prompt</Eyebrow>
        <Claim style={{ maxWidth: 1240 }}>
          The model could not have raised this limit. It is not one of its arguments.
        </Claim>
      </div>

      <div
        style={{
          ...rise(f, 32),
          marginTop: 58,
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 14,
          padding: '44px 48px',
          fontFamily: MONO,
          fontSize: 31,
          lineHeight: 1.72,
        }}
      >
        <span style={{ color: C.amber }}>solana_pay_build</span>
        <span style={{ color: C.dim }}> · amount 5000</span>
        <br />
        <span style={{ color: C.red }}>
          amount 5000 is over the shop&rsquo;s per-charge ceiling of 500
        </span>
        <br />
        <br />
        <span style={{ color: C.muted }}>permissions = [&quot;config_read&quot;] — no http_client</span>
      </div>
    </AbsoluteFill>
  );
};

/** 5. Where to go, and what it is honest about. */
const End: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ink, padding: '90px 110px' }}>
      <div style={rise(f)}>
        <Eyebrow>Custody tier T0 — no keys held on the charge path</Eyebrow>
        <Claim style={{ fontSize: 64 }}>aval-site.vercel.app</Claim>
      </div>
      <Browser
        url="aval-site.vercel.app"
        src="site-hero.png"
        style={{ ...rise(f, 26), marginTop: 44, maxHeight: 600 }}
      />
      <div
        style={{
          ...rise(f, 52),
          marginTop: 34,
          fontFamily: SANS,
          fontSize: 30,
          color: C.dim,
        }}
      >
        The build log publishes what failed, including four times the model reported work
        it had not done.
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------- cut -- */

const SCENES = [
  { C: Problem, len: s(14) },
  { C: Proof, len: s(19) },
  { C: Product, len: s(15) },
  { C: Ceiling, len: s(16) },
  { C: End, len: s(16) },
];

export const TOTAL = SCENES.reduce((a, b) => a + b.len, 0);

export const Cut: React.FC = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {SCENES.map(({ C: Scene, len }, i) => {
        const from = at;
        at += len;
        return (
          <Sequence key={i} from={from} durationInFrames={len} premountFor={FPS}>
            <Scene />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
