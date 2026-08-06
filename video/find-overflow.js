// Names the elements wider than the viewport, instead of guessing at CSS.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  const wide = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 1 || r.right > vw + 1) {
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 70),
          w: Math.round(r.width),
          right: Math.round(r.right),
        });
      }
    });
    return { vw, scrollW: document.documentElement.scrollWidth, wide: out.slice(0, 12) };
  });
  console.log(JSON.stringify(wide, null, 2));
  await b.close();
})();
