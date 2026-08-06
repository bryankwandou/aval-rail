// Renders the three-minute demo to a video file.
//
// There is no screen-capture tool on this machine and no way to add one, so the
// demo is not recorded off a screen — it is rendered. Playwright drives the
// teleprompter page in a real Chromium at a fixed 1920x1080 and writes the
// frames out itself. The page replays terminal output captured from actual runs
// (the durable-nonce transactions, the plugin build, the heartbeat, the
// injection attempt), so what lands in the file is the same evidence that is in
// evidence/, played back on a clock.
//
//   node record.js
//
// Output: out/aval-demo.webm, converted to mp4 by make-video.ps1.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PAGE = 'file:///' + path.join(__dirname, 'teleprompter.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, 'out');
const DURATION_MS = 3 * 60 * 1000 + 6000; // 3:00 of content plus a hold on the end card

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    args: ['--force-color-profile=srgb', '--font-render-hinting=none'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
  });

  const page = await context.newPage();
  await page.goto(PAGE, { waitUntil: 'load' });

  // The page is also a teleprompter a person can read from, so it carries
  // furniture the video should not: the how-to-record notes and the transport
  // buttons. The progress bar and clock stay — they tell a viewer how much is
  // left, which is the one thing a demo video owes them.
  await page.addStyleTag({
    content: `
      .note { display: none !important; }
      #play, #reset { visibility: hidden !important; }
      body { padding-bottom: 24px; }
    `,
  });

  // A beat of stillness before anything moves. A video that opens mid-motion
  // reads as a clip of something else.
  await page.waitForTimeout(2000);

  // .click() rather than page.click(), because the button is hidden by now and
  // Playwright rightly refuses to click what a user could not see.
  await page.evaluate(() => document.getElementById('play').click());
  console.log('playing…');

  // Progress on stdout so a three-minute render is not a blank terminal.
  const started = Date.now();
  while (Date.now() - started < DURATION_MS) {
    await page.waitForTimeout(15000);
    const clock = await page.textContent('#clock').catch(() => '');
    console.log(`  ${Math.round((Date.now() - started) / 1000)}s  ${clock.replace(/\s+/g, ' ').trim()}`);
  }

  await context.close(); // flushes the video; must come before browser.close()
  await browser.close();

  const file = fs.readdirSync(OUT).find((f) => f.endsWith('.webm'));
  fs.renameSync(path.join(OUT, file), path.join(OUT, 'aval-demo.webm'));
  console.log('wrote out/aval-demo.webm');
})();
