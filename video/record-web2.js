// Records the till doing real work against the running daemon.
//
// Nothing here is staged. The page posts to a local server, that server forwards
// to the daemon's gateway on 127.0.0.1:42617, the agent calls the
// `solana_pay_build` component, and whatever comes back is what lands on screen
// â€” including the refusals. If the daemon were down, this recording would show
// a red status light and an error, which is the correct outcome for a video
// about a till that is supposed to be up.
//
// Preconditions: the daemon is running, and `till/server.js` is up on :8099.
//
//   node record-web.js      -> out-web/aval-web.webm

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const URL = 'http://127.0.0.1:8099/';
const OUT = path.join(__dirname, 'out-web2');

// Typing at a human speed rather than setting .value, because the point of the
// recording is that a person can operate this.
const type = (page, sel, text) => page.fill(sel, '').then(() => page.type(sel, text, { delay: 90 }));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();

  await page.goto(URL, { waitUntil: 'networkidle' });

  // Let the status light resolve on camera. It polls /status, which reads the
  // daemon's own /health â€” so the uptime on screen is the process's, not a badge.
  await page.waitForTimeout(6000);

  // 1. An ordinary charge.
  await type(page, '#label', 'table-12');
  await type(page, '#amount', '18');
  await page.waitForTimeout(800);
  await page.click('#go');
  await page.waitForSelector('#out.on', { timeout: 120000 });
  await page.waitForTimeout(9000); // long enough to read the reference and the URL

  // 2. Over the shop's ceiling. The refusal is written in Rust and the model
  //    cannot override it, because the ceiling is not one of its arguments.
  await type(page, '#label', 'table-12');
  await type(page, '#amount', '5000');
  await page.waitForTimeout(800);
  await page.click('#go');
  await page.waitForTimeout(1000);
  await page.waitForSelector('#out.on', { timeout: 120000 });
  await page.waitForTimeout(9000);

  // 3. Native SOL, to show the request shape changes rather than the amount.
  await type(page, '#label', 'counter');
  await type(page, '#amount', '0.25');
  await page.selectOption('#token', 'SOL');
  await page.waitForTimeout(800);
  await page.click('#go');
  await page.waitForSelector('#out.on', { timeout: 120000 });
  await page.waitForTimeout(10000);

  await context.close();
  await browser.close();

  const file = fs.readdirSync(OUT).find((f) => f.endsWith('.webm'));
  fs.renameSync(path.join(OUT, file), path.join(OUT, 'aval-web.webm'));
  console.log('wrote out-web/aval-web.webm');
})();

