import fs from 'node:fs';
// Original orange, coral, pink, lilac and blue anchors, from left to right. Export samples interpolate in OKLCH
// so SVG/image exports match the CSS gradient without relying on SVG color-space support.
const colors=[[255,143,27],[250,39,51],[253,73,168],[206,175,251],[79,136,255]];
const positions=[0,6/21,10/21,14/21,1];
const linear=v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4;
function toLch(rgb){const [r,g,b]=rgb.map(linear);const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);const L=.2104542553*l+.793617785*m-.0040720468*s,a=1.9779984951*l-2.428592205*m+.4505937099*s,bb=.0259040371*l+.7827717662*m-.808675766*s;return [L,Math.hypot(a,bb),Math.atan2(bb,a)];}
function toRgb([L,C,h]){const a=C*Math.cos(h),b=C*Math.sin(h),l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;return [4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s].map(v=>Math.round(255*Math.max(0,Math.min(1,v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055))));}
const lch=colors.map(toLch);
for(let i=1;i<lch.length;i++){
 while(lch[i][2]-lch[i-1][2]>Math.PI)lch[i][2]-=2*Math.PI;
 while(lch[i][2]-lch[i-1][2]<-Math.PI)lch[i][2]+=2*Math.PI;
}
// Shape-preserving cubic interpolation keeps a continuous color velocity without
// overshooting the source anchors or leaving visible joins between color bands.
function curve(channel){
 const values=lch.map(c=>c[channel]);
 const widths=positions.slice(1).map((x,i)=>x-positions[i]);
 const slopes=widths.map((w,i)=>(values[i+1]-values[i])/w);
 const tangents=values.map((_,i)=>{
  if(i===0)return slopes[0];if(i===values.length-1)return slopes.at(-1);
  if(slopes[i-1]*slopes[i]<=0)return 0;
  const a=2*widths[i]+widths[i-1],b=widths[i]+2*widths[i-1];
  return (a+b)/(a/slopes[i-1]+b/slopes[i]);
 });
 return x=>{
  const i=Math.min(positions.length-2,Math.max(0,positions.findLastIndex(v=>v<=x)));
  const t=(x-positions[i])/widths[i],t2=t*t,t3=t2*t;
  return (2*t3-3*t2+1)*values[i]+(t3-2*t2+t)*widths[i]*tangents[i]+(-2*t3+3*t2)*values[i+1]+(t3-t2)*widths[i]*tangents[i+1];
 };
}
const channels=[0,1,2].map(curve);
const samples=Array.from({length:257},(_,i)=>({offset:i/256,rgb:toRgb(channels.map(sample=>sample(i/256)))}));
const stops=samples.map(({offset,rgb})=>`<stop offset="${(offset*100).toFixed(4)}%" stop-color="rgb(${rgb.join(',')})"/>`);
for(const rgb of colors){if(toRgb(toLch(rgb)).some((v,i)=>Math.abs(v-rgb[i])>1))throw Error('Color anchor round-trip failed');}
const height=13.541*1044/2048;
fs.writeFileSync('public/tech-blog/color-field.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="34.051" height="${height}" viewBox="0 0 34.051 ${height}"><desc>Original Lovable color anchors with smooth, shape-preserving OKLCH interpolation.</desc><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0" color-interpolation="sRGB">${stops.join('')}</linearGradient></defs><rect width="34.051" height="${height}" rx="2.119" fill="url(#g)"/></svg>\n`);
fs.writeFileSync('src/tech-blog/color-field.css',`:root { --tech-color-gradient: linear-gradient(90deg in oklch shorter hue, ${samples.map(({offset,rgb})=>`rgb(${rgb.join(' ')}) ${(offset*100).toFixed(4)}%`).join(', ')}); }\n`);
console.log(`Built ${stops.length} OKLCH samples; original anchors verified.`);
