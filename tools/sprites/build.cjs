// Builds sprites.png (the battle sprite atlas) from draw.js using a headless Chromium (Playwright).
// Usage: node tools/sprites/build.cjs   (needs Playwright and Python with Pillow; prints the atlas
// metadata that game.js uses)
const { chromium } = require('playwright');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');

(async () => {
  const out = join(__dirname, '..', '..', 'sprites.png');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => { console.error(e); process.exitCode = 1; });
  await page.setContent('<!doctype html><body></body>');
  await page.addScriptTag({ content: readFileSync(join(__dirname, 'draw.js'), 'utf8') });
  const { url, meta } = await page.evaluate(() => { const { atlas, meta } = window.buildAtlas(); return { url: atlas.toDataURL('image/png'), meta }; });
  writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  // Shrink to a 256-colour palette PNG (about 8x smaller, no visible loss at game scale).
  execFileSync('python3', ['-c', "import sys\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert('RGBA')\nim.quantize(256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).save(sys.argv[1],optimize=True)", out]);
  console.log(JSON.stringify(meta));
  await browser.close();
})();
