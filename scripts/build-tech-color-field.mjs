import fs from 'node:fs';
// Original color anchors, from left to right. Export samples interpolate in OKLCH
// so SVG/image exports match the CSS gradient without relying on SVG color-space support.
const colors=[[255,143,27],[255,134,27],[254,119,29],[254,106,30],[252,84,31],[251,61,38],[250,39,51],[250,31,65],[252,26,88],[253,41,128],[253,73,168],[251,101,194],[243,136,222],[226,165,242],[206,175,251],[176,172,254],[145,160,255],[116,145,255],[98,137,255],[88,133,255],[81,133,255],[79,136,255]];
const linear=v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4;
function toLch(rgb){const [r,g,b]=rgb.map(linear);const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);const L=.2104542553*l+.793617785*m-.0040720468*s,a=1.9779984951*l-2.428592205*m+.4505937099*s,bb=.0259040371*l+.7827717662*m-.808675766*s;return [L,Math.hypot(a,bb),Math.atan2(bb,a)];}
function toRgb([L,C,h]){const a=C*Math.cos(h),b=C*Math.sin(h),l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;return [4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s].map(v=>Math.round(255*Math.max(0,Math.min(1,v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055))));}
const lch=colors.map(toLch),steps=8,stops=[];
for(let i=0;i<(colors.length-1)*steps+1;i++){const segment=Math.min(colors.length-2,Math.floor(i/steps)),t=i/steps-segment,a=lch[segment],b=lch[segment+1];let hue=b[2]-a[2];if(hue>Math.PI)hue-=2*Math.PI;if(hue< -Math.PI)hue+=2*Math.PI;const rgb=toRgb([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+hue*t]);stops.push(`<stop offset="${(i/((colors.length-1)*steps)*100).toFixed(4)}%" stop-color="rgb(${rgb.join(',')})"/>`);}
for(const rgb of colors){if(toRgb(toLch(rgb)).some((v,i)=>Math.abs(v-rgb[i])>1))throw Error('Color anchor round-trip failed');}
const height=13.541*1044/2048;
fs.writeFileSync('public/tech-blog/color-field.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="34.051" height="${height}" viewBox="0 0 34.051 ${height}"><desc>Original Lovable color anchors interpolated in OKLCH, shorter hue.</desc><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0" color-interpolation="sRGB">${stops.join('')}</linearGradient></defs><rect width="34.051" height="${height}" rx="2.119" fill="url(#g)"/></svg>\n`);
fs.writeFileSync('src/tech-blog/color-field.css',`:root { --tech-color-gradient: linear-gradient(90deg in oklch shorter hue, ${colors.map((c,i)=>`rgb(${c.join(' ')}) ${(i/(colors.length-1)*100).toFixed(4)}%`).join(', ')}); }\n`);
console.log(`Built ${stops.length} OKLCH samples; original anchors verified.`);
