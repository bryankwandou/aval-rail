// Proves the site works rather than asserting it.
//
// Three things are being checked, and each one failed on the deployed site
// before: the nav renders one layer per label (the old one stacked two and
// clipped, which is why it read "Bullreauest"), the hero actually animates, and
// the scroll reveals fire instead of leaving sections at opacity 0.
//
// The nav check is programmatic, not visual: it counts the text nodes inside
// each link. A screenshot can be squinted at; a count cannot.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const URL = 'http://127.0.0.1:3000/';
const OUT = path.join(__dirname, 'site-shots');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto(URL, { waitUntil: 'networkidle' });

  // 1. Nav: one text layer per label, and the labels are the real words.
  const nav = await page.$$eval('header nav ul a', (links) =>
    links.map((a) => ({
      text: a.textContent.trim(),
      // the old component rendered the label twice inside one anchor
      textNodes: [...a.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).length,
      fontSize: getComputedStyle(a).fontSize,
    })),
  );

  // 2. Hero is mid-typing: catch it before the replay completes.
  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(OUT, '01-hero-typing.png') });

  // 3. Reveals: a section below the fold must be invisible before scroll and
  //    visible after. Measured, not eyeballed.
  //    The wrapper is the [data-reveal] div inside the section, not the section
  //    itself — the section is never hidden, only its contents are.
  const sel = '#failures [data-reveal]';
  const beforeScroll = await page.$eval(sel, (el) => getComputedStyle(el).opacity);
  await page.evaluate(() => document.querySelector('#failures')?.scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(1400);
  const afterScroll = await page.$eval(sel, (el) => getComputedStyle(el).opacity);
  await page.screenshot({ path: path.join(OUT, '02-failures-revealed.png') });

  // 4. The scrolled nav state, where the garbling used to be visible.
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, '03-nav-scrolled.png'), clip: { x: 0, y: 0, width: 1600, height: 90 } });

  // 5. Full page, for the record.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '04-full.png'), fullPage: true });

  // 6. Mobile, because a till's owner is on a phone.
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(URL, { waitUntil: 'networkidle' });
  await phone.waitForTimeout(2000);
  const overflow = await phone.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  await phone.screenshot({ path: path.join(OUT, '05-mobile.png'), fullPage: true });

  await browser.close();

  console.log(JSON.stringify({ nav, beforeScroll, afterScroll, horizontalOverflow: overflow, errors }, null, 2));
})();
