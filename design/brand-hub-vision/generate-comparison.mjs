import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

// Regenerate from the repository root:
// node design/brand-hub-vision/generate-comparison.mjs
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const base = 'brand-hub-comparison';
const [template, font, heart] = await Promise.all([
  fs.readFile(path.join(here, 'comparison.template.html'), 'utf8'),
  fs.readFile(path.join(root, 'public/fonts/CameraPlainVariable.woff2')),
  fs.readFile(path.join(root, 'public/brand/assets/logomark-black.svg')),
]);
const html = template.replace('__FONT_DATA__', font.toString('base64')).replace('__HEART_DATA__', heart.toString('base64'));
await fs.writeFile(path.join(here, `${base}.html`), html);

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
try {
  const page = await browser.newPage({ viewport: { width: 1760, height: 1440 }, deviceScaleFactor: 2 });
  await page.goto(new URL(`${base}.html`, import.meta.url).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(here, `${base}.png`), fullPage: true });
  const issues = await page.evaluate(() => {
    const errors = [];
    for (const node of document.querySelectorAll('h1,h2,h3,p,text')) {
      const style = getComputedStyle(node);
      if (Number(style.fontWeight) < 600) errors.push('Text weight below 600');
      if (style.textTransform === 'uppercase' || node.textContent.trim() === node.textContent.trim().toUpperCase()) errors.push('All-caps text');
    }
    for (const diagram of document.querySelectorAll('svg.diagram')) {
      for (const node of diagram.querySelectorAll('text')) {
        const box = node.getBBox();
        if (box.x < 0 || box.x + box.width > 664 || box.y < 0 || box.y + box.height > 360) errors.push('Diagram label overflows');
      }
    }
    return errors;
  });
  if (issues.length) throw new Error(issues.join('\n'));
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error(`Horizontal overflow at ${width}px`);
  }
  const previewDirectory = path.join(root, 'output/brand-hub-vision');
  await fs.mkdir(previewDirectory, { recursive: true });
  await page.screenshot({ path: path.join(previewDirectory, 'comparison-mobile.png'), fullPage: true });
  console.log('Created standalone comparison HTML and PNG. Verified typography, diagram bounds and three responsive widths.');
} finally {
  await browser.close();
}
