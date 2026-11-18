import {readFileSync,writeFileSync} from 'node:fs';

// Figma 38:3, downloaded unchanged. Split only at the requested globe plane;
// preserve every path, filter region, Gaussian deviation and painting order.
const directory = new URL('../public/demos/1000-opportunities/',import.meta.url);
const source = readFileSync(new URL('heart-glow-source.svg',directory),'utf8');
const opening = source.match(/^<svg[^>]*>/)[0];
const groups = [...source.matchAll(/<g id="heart_\d+"[\s\S]*?<\/g>/g)].map(match => match[0]);
const filters = [...source.matchAll(/<filter\b[\s\S]*?<\/filter>/g)].map(match => match[0]);
if (groups.length !== 6 || filters.length !== 6) throw Error('Unexpected Figma glow structure');

function oklch(hex) {
  const [r,g,b] = hex.match(/[\da-f]{2}/gi).map(value => {
    const channel = parseInt(value,16)/255;
    return channel <= 0.04045 ? channel/12.92 : ((channel+0.055)/1.055)**2.4;
  });
  const l = Math.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*b);
  const m = Math.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*b);
  const s = Math.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*b);
  const lightness = 0.2104542553*l+0.7936177850*m-0.0040720468*s;
  const a = 1.9779984951*l-2.4285922050*m+0.4505937099*s;
  const bb = 0.0259040371*l+0.7827717662*m-0.8086757660*s;
  const hue = (Math.atan2(bb,a)*180/Math.PI+360)%360;
  return `oklch(${lightness.toFixed(10)} ${Math.hypot(a,bb).toFixed(10)} ${hue.toFixed(8)})`;
}

for (const [name,start,end] of [['back',0,3],['front',3,6]]) {
  const paths = groups.slice(start,end).join('\n').replace(/fill="(#[\da-f]{6})"/gi,(_,hex) => `fill="${hex}" style="fill:${oklch(hex)}"`);
  // sRGB filter compositing is intentionally retained from Figma. Changing the
  // blur's colour space would alter its appearance, even with identical fills.
  writeFileSync(new URL(`heart-glow-${name}.svg`,directory),`${opening}\n<!-- Generated from Figma 38:3 by scripts/build-opportunities-glow.mjs. -->\n${paths}\n<defs>\n${filters.slice(start,end).join('\n')}\n</defs>\n</svg>\n`);
}
