'use client';

import { useEffect, useState } from 'react';
import { Mark } from './Mark';

/**
 * The nav, rewritten.
 *
 * The previous one used a roll-on-hover text component built for display sizes:
 * it stacks two copies of the label and reveals one by clipping, with
 * `line-height: 0.75`. At 14px both copies land inside the same box and render
 * on top of each other, which is why the live site reads "Bullreauest" instead
 * of "Pull request". A nav label is not a place for that effect.
 *
 * What replaced it: a colour transition and a rule that grows from the left.
 * One layer, so there is nothing to overlap.
 */
const LINKS = [
  { href: '#problem', label: 'The problem' },
  { href: '#proof', label: 'On-chain proof' },
  { href: '#custody', label: 'Custody' },
  { href: '#failures', label: 'What broke' },
  { href: '#run', label: 'Run it' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      // Not `transition-all`. Three properties change here and naming them
      // keeps the browser off everything else — `all` also animates layout
      // properties nobody asked it to.
      className="fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-300 ease-[cubic-bezier(.2,.7,.2,1)]"
      style={{
        background: scrolled ? 'rgba(10,11,14,0.82)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: `1px solid ${scrolled ? 'var(--line)' : 'transparent'}`,
      }}
    >
      <nav className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-4">
        <a href="#top" className="group flex items-center gap-2.5 text-bone">
          <span className="text-amber transition-transform duration-300 group-hover:-translate-y-0.5">
            <Mark size={26} />
          </span>
          <span className="text-[17px] font-semibold tracking-tight">Aval</span>
        </a>

        <ul className="ml-auto hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="group relative block py-1 text-[14.5px] text-muted transition-colors duration-200 hover:text-bone"
              >
                {l.label}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-amber transition-[width] duration-300 group-hover:w-full" />
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#run"
          className="ml-auto rounded-full border border-line-2 px-4 py-2 text-[14px] text-bone transition-colors duration-200 hover:border-amber hover:text-amber md:ml-0"
        >
          Set it up
        </a>
      </nav>
    </header>
  );
}
