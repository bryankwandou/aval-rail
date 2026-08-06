'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Scroll-triggered entrance, used everywhere so the page speaks one motion
 * language rather than a different trick per section.
 *
 * Written against IntersectionObserver and a CSS transition rather than an
 * animation library. A landing page does not need a physics engine to move
 * eighteen pixels, and every dependency here is one more thing that can break a
 * deploy the night before it matters.
 *
 * `once` is deliberate: content that re-animates each time it re-enters the
 * viewport fights the reader.
 */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Starts visible, deliberately. If it started hidden, the server-rendered
  // HTML would be a page of invisible sections — blank to a crawler, to reader
  // mode, and to anyone with scripting off. It is hidden only once the client
  // has confirmed it can observe and un-hide it again, and only while it is
  // still below the fold, so nothing visible ever flashes.
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Anyone who has asked for less motion keeps the content as it is.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof IntersectionObserver === 'undefined') return;

    // Already on screen at mount: leave it alone rather than animate it in
    // under the reader's eyes.
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight - 40) return;

    setShown(false);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -60px 0px', threshold: 0.05 },
    );

    io.observe(el);

    // Belt and braces. A full-page screenshot, a print, or any tool that
    // rasterises without scrolling never fires the observer, and the section
    // stays invisible — which is exactly how a page ends up looking blank in
    // someone else's screenshot. After three seconds, show it regardless.
    const failsafe = setTimeout(() => {
      setShown(true);
      io.disconnect();
    }, 3000);

    return () => {
      clearTimeout(failsafe);
      io.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      data-reveal=""
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translate3d(0,0,0)' : `translate3d(0,${y}px,0)`,
        transition: `opacity 620ms cubic-bezier(.2,.7,.2,1) ${delay}s, transform 620ms cubic-bezier(.2,.7,.2,1) ${delay}s`,
        willChange: shown ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
