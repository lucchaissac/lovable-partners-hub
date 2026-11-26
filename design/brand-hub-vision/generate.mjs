import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import opentype from 'opentype.js';
import { chromium } from 'playwright-core';

// A standalone vision diagram. It does not change the product or its routes.
// Regenerate from the repository root: node design/brand-hub-vision/generate.mjs
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'brand-hub-vision-'));
const fontSource = path.join(root, 'public/fonts/CameraPlainVariable.woff2');
const width = 1760;
const height = 1440;
const outerPadding = 80;
const diagramOffsetY = 32;
const ink = '#1b1b1b';
const background = '#f7f4ed';
const secondary = '#65635f';
const connector = ink;
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

try {
  // Native text stays editable in one SVG; exact font outlines make the other portable.
  execFileSync('python3', ['-c', `
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
import sys
for weight in [600,700]:
    font = TTFont(sys.argv[1])
    font = instantiateVariableFont(font, {"wght": weight}, inplace=True)
    font.flavor = None
    font.save(sys.argv[2] + "/camera-" + str(weight) + ".ttf")
`, fontSource, temp], { stdio: 'pipe' });
  const fonts = Object.fromEntries(await Promise.all([600, 700].map(async weight => [weight, opentype.parse(await fs.readFile(path.join(temp, `camera-${weight}.ttf`)))])));
  const fontData = (await fs.readFile(fontSource)).toString('base64');
  const elements = [];
  const labels = [];
  const raw = value => elements.push({ raw: value });
  const text = (id, x, y, value, size = 22, options = {}) => {
    const { weight = 600, fill = ink, align = 'start' } = options;
    const label = { id, x, y, value, size, weight, fill, align };
    labels.push(label);
    elements.push(label);
  };
  const line = (id, d, options = {}) => {
    const { start = false, end = true } = options;
    raw(`<path id="${id}" d="${d}" fill="none" stroke="${connector}" stroke-width="1.5" stroke-linecap="round"${start ? ' marker-start="url(#arrow)"' : ''}${end ? ' marker-end="url(#arrow)"' : ''}/>`);
  };
  const originalSvg = async (name, id, x, y, w, h) => {
    let source = await fs.readFile(path.join(root, `public/brand/assets/${name}.svg`), 'utf8');
    source = source.replace(/\bid="([^"]+)"/g, (_, value) => `id="${id}-${value}"`).replace(/url\(#([^)]+)\)/g, (_, value) => `url(#${id}-${value})`);
    source = source.replace(/<svg\b[^>]*>/, opening => {
      const viewBox = opening.match(/viewBox="([^"]+)"/)[1];
      return `<svg id="${id}" x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${viewBox}" fill="none">`;
    });
    raw(source);
  };

  raw(`<rect width="${width}" height="${height}" fill="${background}"/>`);
  raw(`<g id="composition" transform="translate(${outerPadding} ${outerPadding})">`);
  text('headline-1', 800, 126, 'A shared brand brain', 66, { weight: 700, align: 'middle' });
  text('headline-2', 800, 196, 'for our team and agents.', 66, { weight: 700, align: 'middle' });
  text('ambition', 800, 250, 'One source of truth. A brand factory at scale.', 26, { fill: secondary, align: 'middle' });
  text('access-anywhere', 800, 292, 'Access from anywhere: Lovable · Web · Slack · MCP · Your tools', 23, { align: 'middle' });

  raw(`<g id="diagram" transform="translate(0 ${diagramOffsetY})">`);
  text('people', 800, 342, 'Lovable teams & external partners', 28, { align: 'middle', weight: 700 });
  text('permissions', 800, 380, 'Design team: full control · Others: granular permissions', 21, { align: 'middle', fill: secondary });
  line('direct-access', 'M800 407 L800 432', { start: true });
  text('direct-access-label', 824, 427, 'Direct access', 18, { fill: secondary });

  text('designers', 88, 562, 'Designers', 32, { weight: 700 });
  text('design-tools', 88, 603, 'Figma · Paper · After Effects', 21, { fill: secondary });
  text('any-creative-tool', 88, 634, 'Or any creative tool', 21, { fill: secondary });
  text('handoff-content', 88, 682, 'Rules, assets & playbooks', 21, { fill: secondary });
  line('design-handoff', 'M418 608 L588 608');
  text('handoff-label', 503, 587, 'Publish', 18, { align: 'middle', fill: secondary });

  raw('<rect id="brand-hub" x="608" y="452" width="384" height="384" rx="40" fill="#ffffff"/>');
  await originalSvg('logomark-black', 'hub-heart', 782, 487, 36, 36.7);
  text('hub-name', 800, 579, 'Brand Hub', 40, { weight: 700, align: 'middle' });
  text('hub-purpose', 800, 622, 'Brand intelligence', 23, { align: 'middle' });
  text('hub-purpose-execution', 800, 652, '& creative execution', 23, { align: 'middle' });
  text('hub-resources', 800, 710, 'Gallery · Guidelines · Assets', 19, { fill: secondary, align: 'middle' });
  text('hub-execution', 800, 740, 'Makers · Specialized agents', 19, { fill: secondary, align: 'middle' });
  text('hub-scope', 800, 786, 'Per brand & sub-brand', 18, { fill: secondary, align: 'middle' });

  line('hue-calls-agents', 'M1216 582 L1012 582');
  text('hue-call-label', 1114, 561, 'Call brand agents', 18, { align: 'middle', fill: secondary });
  line('hue-receives-link', 'M1012 590 L1216 590');
  text('hue-return-label', 1114, 624, 'Asset or playbook link', 18, { align: 'middle', fill: secondary });
  text('hue-name', 1240, 565, 'Hue', 32, { weight: 700 });
  text('hue-role', 1240, 599, 'Creative OS orchestrator', 20, { fill: secondary });

  line('other-entry-points', 'M1012 732 L1216 732', { start: true });
  text('other-agents', 1240, 742, 'Other agents & tools', 27, { weight: 700 });
  text('shared-intelligence', 1240, 776, 'The same brand intelligence', 19, { fill: secondary });

  line('campaign-output', 'M800 852 L800 876');
  text('campaigns', 800, 918, 'Campaigns & playbooks', 32, { weight: 700, align: 'middle' });
  text('production', 800, 955, 'Bulk upload & creation · Edit · Export · Share', 23, { fill: secondary, align: 'middle' });
  raw('</g>');

  raw(`<line x1="88" y1="1046" x2="1512" y2="1046" stroke="${ink}" stroke-opacity=".16"/>`);
  text('project-status', 88, 1090, 'Project status', 23, { weight: 700 });
  raw(`<circle cx="97" cy="1135" r="9" fill="${ink}"/><path d="M93 1135 L96 1138 L101 1132" fill="none" stroke="${background}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`);
  text('done-label', 120, 1142, 'Achieved', 21, { fill: secondary });
  text('done-title', 88, 1184, 'Core primitives', 29, { weight: 700 });

  raw(`<circle cx="601" cy="1135" r="8.5" fill="none" stroke="${ink}"/><path d="M601 1126.5 A8.5 8.5 0 0 0 601 1143.5 Z" fill="${ink}"/>`);
  text('progress-label', 624, 1142, 'In progress', 21, { fill: secondary });
  text('progress-title', 592, 1184, 'Agents & sub-agents', 29, { weight: 700 });

  raw(`<circle cx="1105" cy="1135" r="8.5" fill="none" stroke="${ink}"/>`);
  text('next-label', 1128, 1142, 'Next', 21, { fill: secondary });
  text('next-permissions', 1096, 1184, 'Roles & permissions', 29, { weight: 700 });
  text('next-integrations', 1096, 1220, 'Connect all our tools', 23, { fill: secondary });
  raw('</g>');

  const description = 'Vision for the Lovable Brand Hub: designers publish from any creative tool to a central source of truth and brand execution layer. Lovable teams and external partners have direct access, with full design-team control and granular permissions for others. Hue is the Creative OS orchestrator: it calls specialized Brand Hub agents and receives a link to an individual asset or a multi-asset playbook. Other agents and tools use the same brand intelligence. The Hub hosts campaigns, playbooks, gallery, guidelines, assets, Makers and specialized agents per brand or sub-brand, with bulk upload and creation, direct editing, exports and sharing. Access is available through Lovable, Web, Slack, MCP and other tools. Project status supplied by Luc: core primitives achieved; agents and sub-agents in progress; roles, permissions and tool integrations next. The diagram describes the target vision, not a claim that planned integrations or permissions already ship.';
  const makeSvg = outlined => {
    const content = elements.map(item => {
      if (item.raw) return item.raw;
      const { id, x, y, value, size, weight, fill, align } = item;
      if (!outlined) return `<text id="${id}" x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" text-anchor="${align}">${escape(value)}</text>`;
      const font = fonts[weight];
      const advance = font.getAdvanceWidth(value, size);
      const left = align === 'middle' ? x - advance / 2 : x;
      const d = font.getPath(value, left, y, size).toPathData(3);
      return `<g id="${id}" aria-label="${escape(value)}"><path d="${d}" fill="${fill}"/></g>`;
    }).join('\n');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">
<title id="title">A shared brand brain for our team and agents</title>
<desc id="description">${escape(description)}</desc>
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M2 1 L8 5 L2 9" fill="none" stroke="${connector}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></marker>
</defs>
${outlined ? '' : `<style>@font-face{font-family:'Camera Plain';src:url(data:font/woff2;base64,${fontData}) format('woff2');font-weight:100 900}text{font-family:'Camera Plain',sans-serif}</style>`}
${content}
</svg>\n`;
  };
  const editable = makeSvg(false);
  const outlined = makeSvg(true);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="The Brand Hub vision: a shared brand brain for our team and agents.">
  <title>Brand Hub — A shared brand brain</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; background: ${background}; }
    main { max-width: ${width}px; margin-inline: auto; }
    main > svg { display: block; width: 100%; height: auto; }
  </style>
</head>
<body>
  <main aria-label="Brand Hub vision and project status">
${editable}
  </main>
</body>
</html>
`;
  await fs.writeFile(path.join(here, 'brand-hub-vision.editable.svg'), editable);
  await fs.writeFile(path.join(here, 'brand-hub-vision.svg'), outlined);
  await fs.writeFile(path.join(here, 'brand-hub-vision.html'), html);
  await fs.writeFile(path.join(here, 'content.json'), `${JSON.stringify({ title: 'A shared brand brain for our team and agents', date: '2026-11-26', intent: 'Target vision and user-supplied project status', width, height, outerPadding, diagramOffsetY, description, labels }, null, 2)}\n`);

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    await page.setContent(`<html><head><meta charset="utf-8"/></head><body style="margin:0">${outlined}</body></html>`);
    await page.screenshot({ path: path.join(here, 'brand-hub-vision.png') });
    await page.goto(new URL('brand-hub-vision.html', import.meta.url).href);
    await page.evaluate(() => document.fonts.ready);
    const violations = await page.evaluate(() => [...document.querySelectorAll('text')].flatMap(node => {
      const box = node.getBBox();
      const errors = [];
      if (box.x < 70 || box.x + box.width > 1530 || box.y < 0 || box.y + box.height > 1280) errors.push(`${node.id}: outside safe bounds`);
      if (getComputedStyle(node).fontWeight < 600) errors.push(`${node.id}: weight below 600`);
      if (node.textContent === node.textContent.toUpperCase()) errors.push(`${node.id}: all-caps label`);
      return errors;
    }));
    if (violations.length) throw new Error(violations.join('\n'));
    for (const viewportWidth of [1440, 680, 390]) {
      await page.setViewportSize({ width: viewportWidth, height: 1000 });
      const fits = await page.evaluate(() => document.documentElement.scrollWidth === window.innerWidth);
      if (!fits) throw new Error(`HTML overflows at ${viewportWidth}px`);
    }
    console.log(`Created ${width * 2} × ${height * 2} PNG, two self-contained SVGs and standalone HTML. Checked ${labels.length} text labels and HTML at three viewport widths.`);
  } finally {
    await browser.close();
  }
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
