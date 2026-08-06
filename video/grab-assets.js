// Assets for the re-cut: the product, on screen, as a judge would see it.
//
// The rejected video never showed the product — only terminal text about it.
// These are the two surfaces that actually exist and answer "real agent, real
// channel": the till talking to the running daemon, and the public site.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, 'remotion', 'public');

(async () => {
  const b = await chromium.launch();

  // 1. The till, mid-charge, against the live daemon.
  const till = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await till.goto('http://127.0.0.1:8099/', { waitUntil: 'networkidle' });
  await till.waitForTimeout(2500);
  await till.screenshot({ path: path.join(OUT, 'till-idle.png') });

  // 2. The public site hero.
  const site = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await site.goto('https://aval-site.vercel.app/', { waitUntil: 'networkidle' });
  await site.waitForTimeout(3000);
  await site.screenshot({ path: path.join(OUT, 'site-hero.png') });

  // 3. The failures section — the original claim, on the public record.
  await site.evaluate(() => document.querySelector('#failures')?.scrollIntoView());
  await site.waitForTimeout(1500);
  await site.screenshot({ path: path.join(OUT, 'site-failures.png') });

  await b.close();
  console.log('assets written');
})();
