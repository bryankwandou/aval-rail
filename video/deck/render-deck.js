// Renders the deck to a PDF and to one PNG per slide.
//
// Ten fixed 1920x1080 sections rather than a slide framework: the deck is shown
// as images or a PDF, never navigated, so a runtime would only add a dependency
// and a way for a slide to render half-loaded.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PAGE = 'file:///' + path.join(__dirname, 'deck.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, 'out');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(PAGE, { waitUntil: 'networkidle' });

  // print background, or every slide comes out white with white text on it
  await page.pdf({
    path: path.join(OUT, 'aval-pitch-deck.pdf'),
    width: '1920px',
    height: '1080px',
    printBackground: true,
    pageRanges: '1-10',
  });

  const slides = await page.$$('.slide');
  for (let i = 0; i < slides.length; i++) {
    await slides[i].screenshot({ path: path.join(OUT, `slide-${String(i + 1).padStart(2, '0')}.png`) });
  }

  await browser.close();
  console.log(`wrote pdf + ${slides.length} slides`);
})();
