const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  const r = await p.evaluate(() => {
    const g = (el) => {
      const s = getComputedStyle(el);
      return { tag: el.tagName, w: Math.round(el.getBoundingClientRect().width),
               minW: s.minWidth, display: s.display, flexBasis: s.flexBasis, maxW: s.maxWidth };
    };
    const main = document.querySelector('main');
    const hero = main.querySelector('section');
    const till = document.querySelector('.grain');
    return {
      html: g(document.documentElement), body: g(document.body), main: g(main),
      hero: g(hero), heroCols: getComputedStyle(hero).gridTemplateColumns,
      till: till ? g(till) : null,
      tillScrollW: till ? till.scrollWidth : null,
    };
  });
  console.log(JSON.stringify(r, null, 2));
  await b.close();
})();
