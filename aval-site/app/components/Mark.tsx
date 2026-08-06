/**
 * The Aval mark.
 *
 * An aval is a surety: you guarantee someone else's obligation by signing
 * across it, historically on the back of a bill of exchange. So the A is the
 * obligation and its crossbar is the endorsement — one stroke laid over the
 * note, overshooting the letterform and lifting off at the end the way a pen
 * does. The overshoot is the idea: the guarantee is wider than the thing it
 * guarantees.
 *
 * Two strokes, one weight, no container shape, `currentColor` throughout. It
 * has to read at 16px in a browser tab, which is the only size a logo is
 * guaranteed to be seen at.
 */
export function Mark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Aval"
      className={className}
    >
      <path
        d="M18 51 L32 15 L46 51"
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 40 H53 l5 -7"
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
