/**
 * The endorsement stroke, drawn once across the hero on load.
 *
 * This is the page's one deliberate risk. An aval is a guarantee written across
 * someone else's obligation, and the mark encodes that as a stroke laid over an
 * A. Here the same stroke is drawn full-width behind the headline: it starts
 * left of the text, crosses it, overshoots on the right and lifts, exactly as
 * it does at 26px in the nav.
 *
 * It happens once. Something that repeats is decoration, and this is meant to
 * be an argument.
 *
 * `pathLength={1}` normalises the dash maths so the CSS can animate a
 * dashoffset from 1 to 0 without knowing the path's real length.
 */
export function Endorsement() {
  return (
    <svg
      // z-0, not -z-10. A negative index pushes it behind the root stacking
      // context and the page background paints straight over it — the stroke
      // was drawing itself where nobody could see it. At z-0 it sits under the
      // text purely by document order, which is what was wanted.
      className="pointer-events-none absolute inset-x-0 top-[38%] z-0 h-24 w-full"
      viewBox="0 0 1200 60"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="endorse-path"
        d="M8 44 H1090 l70 -34"
        pathLength={1}
        fill="none"
        stroke="var(--amber)"
        strokeOpacity={0.28}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
