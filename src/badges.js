// The eight Figma compositions share a relative construction system.
// Luc's corrections take priority over the master: transparent logo blocks,
// equal visible text padding on all four sides, and measurements expressed in x.
export const FIGMA_FILE='sUeZcAIPXpjFAuHnPigkNm';
export const FORMATS=[
 {id:'solution-horizontal',name:'Solution · Horizontal',family:'solution',layout:'horizontal',node:'1:523',description:'Wordmark, partnership and tier.'},
 {id:'solution-compact',name:'Solution · Compact',family:'solution',layout:'compact',node:'1:940',description:'Symbol, partnership and tier.'},
 {id:'solution-stacked',name:'Solution · Stacked',family:'solution',layout:'stacked',node:'1:713',description:'A vertical, co-branded signature.'},
 {id:'solution-symbol',name:'Solution · Symbol',family:'solution',layout:'symbol',node:'1:827',description:'A symbol-led partner badge.'},
 {id:'expert-horizontal',name:'Expert · Horizontal',family:'expert',layout:'horizontal',node:'1:67',description:'Wordmark and Expert status.'},
 {id:'expert-compact',name:'Expert · Compact',family:'expert',layout:'compact',node:'1:332',description:'Symbol and Expert status.'},
 {id:'expert-stacked',name:'Expert · Stacked',family:'expert',layout:'stacked',node:'1:177',description:'A two-row, co-branded signature.'},
 {id:'expert-symbol',name:'Expert · Symbol',family:'expert',layout:'symbol',node:'1:275',description:'A symbol-led Expert badge.'},
];
export const TIERS=['Select','Premier','Elite'];
export const METRICS=Object.freeze({unit:32,module:5,text:3,radius:1.125,stroke:.125});
let font,instance=0;
const cache=new Map();
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const n=v=>Number(v.toFixed(4));
export async function prepareTypography(){
 const [module,response]=await Promise.all([import('opentype.js'),fetch('/fonts/CameraPlain-Bold.ttf')]);
 if(!response.ok)throw new Error('The badge font could not load.');
 font=(module.parse||module.default.parse)(await response.arrayBuffer());
}
function shape(lines,height){
 const key=lines.join('|')+height;if(cache.has(key))return cache.get(key);
 const paths=lines.map((line,i)=>font.getPath(line,0,i*58.508,61.229,{kerning:true,letterSpacing:-.03}));
 const boxes=paths.map(p=>p.getBoundingBox());
 const bounds={x1:Math.min(...boxes.map(b=>b.x1)),y1:Math.min(...boxes.map(b=>b.y1)),x2:Math.max(...boxes.map(b=>b.x2)),y2:Math.max(...boxes.map(b=>b.y2))};
 const scale=height/(bounds.y2-bounds.y1),result={width:(bounds.x2-bounds.x1)*scale,height,scale,bounds,paths:paths.map(p=>p.toPathData(4))};cache.set(key,result);return result;
}
function drawShape(s,x,y){return `<g fill="white" transform="translate(${n(x-s.bounds.x1*s.scale)} ${n(y-s.bounds.y1*s.scale)}) scale(${n(s.scale)})">${s.paths.map(d=>`<path d="${d}"/>`).join('')}</g>`;}
const image=(name,x,y,w,h,scale=1)=>`<g transform="translate(${n(x)} ${n(y)}) scale(${n(scale)})"><image href="/brand/outlined/${name}.svg" width="${w}" height="${h}" /></g>`;
function outline(x,y,w,h,u){const stroke=u/8;return `<rect class="module-outline" x="${n(x+stroke/2)}" y="${n(y+stroke/2)}" width="${n(w-stroke)}" height="${n(h-stroke)}" rx="${n(u*1.125-stroke/2)}" fill="none" stroke="white" stroke-width="${n(stroke)}" />`;}
function model(formatId,tier='Select',options={}){
 const format=FORMATS.find(f=>f.id===formatId)||FORMATS[0],solution=format.family==='solution',u=format.layout==='symbol'?21:32,h=5*u;
 const year=options.year||'2026';
 const role=shape(solution?['Solution','Partner']:['Expert',year],3*u),level=solution?shape([tier,year],3*u):null;
 const roleWidth=role.width+2*u,tierWidth=level?level.width+2*u:0;const wordmarkWidth=582.295/105.276*(3*u)+2*u;
 const stroke=u/8;
 let width,height,topHeight;
 if(format.layout==='horizontal'||format.layout==='compact'){width=(format.layout==='horizontal'?wordmarkWidth:h)+roleWidth+tierWidth-stroke*(solution?2:1);height=h;topHeight=h;}
 if(format.layout==='stacked'){width=solution?roleWidth+tierWidth-stroke:wordmarkWidth;topHeight=solution?(width-2*u)/(461.0845/83.3618)+2*u:h;height=topHeight+(solution?2:1)*(h-stroke);}
 if(format.layout==='symbol'){width=h+roleWidth+tierWidth-stroke*(solution?2:1);topHeight=h;height=2*h-stroke;}
 return {format,solution,u,h,width,height,topHeight,role,level,roleWidth,tierWidth,wordmarkWidth,stroke,moduleHeight:h};
}
export function badgeGeometry(formatId,tier='Select',options={}){return model(formatId,tier,options);}
export function badgeSvg(formatId,options={}){
 const {tier='Select',year='2026',partnerName='Logo',partnerImage='',symbolSize='large',guides=false,clearSpace=false,treatment='white'}=options;
 const m=model(formatId,tier,options),{format,solution,u,h,width,height,role,level,roleWidth,tierWidth,wordmarkWidth,topHeight,stroke}=m;
 const parts=[],id=`badge-${++instance}`,pad=clearSpace?u:0;
 const wrap=(start,type)=>{const content=parts.splice(start);parts.push(`<g data-module="${type}">${content.join('')}</g>`);};
 const cell=(s,x,y,w)=>{parts.push(`<g data-module="text">${outline(x,y,w,s.height+2*u,u)}${drawShape(s,x+u,y+u)}</g>`);};
 const symbol=(x,y,w,boxH=h,tower=false)=>{
  const start=parts.length;
  parts.push(outline(x,y,w,boxH,u));
  const logoH=(boxH-2*u)*(tower&&symbolSize==='small'?.75:1);
  const scale=logoH/83.3616,logoW=82.2357*scale;
  parts.push(image('1-713-imgVector1',x+(w-logoW)/2,y+(boxH-logoH)/2,82.2357,83.3616,scale));wrap(start,'identity');
 };
 const wordmark=(w,boxH,node)=>{
  const start=parts.length;
  parts.push(outline(0,0,w,boxH,u));
  if(node==='1-713'){
   const scale=Math.min((w-2*u)/461.0845,(boxH-2*u)/83.3618),x=(w-461.0845*scale)/2,y=(boxH-83.3618*scale)/2;
   const glyphs=[[1,0,0,82.2357,83.3616],[2,406.3149,24.5415,54.7701,58.8192],[3,385.4131,6.0453,16.0943,75.7837],[4,325.824,6.0453,54.8219,77.3159],[5,267.0823,24.5415,53.7612,58.8192],[6,212.3364,26.075,57.4265,55.7544],[7,159.3981,24.5415,55.5138,58.8192],[8,112.3485,6.0453,48.5384,75.7837]];
   parts.push(`<g transform="translate(${n(x)} ${n(y)}) scale(${n(scale)})">${glyphs.map(([i,gx,gy,gw,gh])=>image(`1-713-imgVector${i}`,gx,gy,gw,gh)).join('')}</g>`);
  }else{const scale=(boxH-2*u)/105.276;parts.push(image(`${node}-imgGroup1`,(w-582.295*scale)/2,u,582.295,105.276,scale));}wrap(start,'identity');
 };
 const partner=(x,y,w)=>{
  const start=parts.length;
  parts.push(outline(x,y,w,h,u));
  if(partnerImage)parts.push(`<image href="${esc(partnerImage)}" x="${n(x+u)}" y="${n(y+u)}" width="${n(w-2*u)}" height="${n(h-2*u)}" preserveAspectRatio="xMidYMid meet" />`);
  else{const s=shape([(partnerName||'Logo').trim()||'Logo'],u*1.4);const fit=Math.min(1,(w-2*u)/s.width);parts.push(`<g transform="translate(${n(x+w/2-s.width*fit/2)} ${n(y+h/2-s.height*fit/2)}) scale(${n(fit)})">${drawShape(s,0,0)}</g>`);}wrap(start,'partner');
 };
 if(format.layout==='horizontal'||format.layout==='compact'){
  const start=(format.layout==='horizontal'?wordmarkWidth:h)-stroke;
  if(format.layout==='horizontal')wordmark(wordmarkWidth,h,solution?'1-523':'1-67');else symbol(0,0,h);
  cell(role,start,0,roleWidth);if(solution)cell(level,start+roleWidth-stroke,0,tierWidth);
 }else if(format.layout==='stacked'){
  wordmark(width,topHeight,solution?'1-713':'1-177');cell(role,0,topHeight-stroke,roleWidth);
  if(solution){cell(level,roleWidth-stroke,topHeight-stroke,tierWidth);partner(0,topHeight+h-2*stroke,width);}else partner(roleWidth-stroke,topHeight-stroke,width-roleWidth+stroke);
 }else{
  symbol(0,0,h,h,true);cell(role,h-stroke,0,roleWidth);
  if(solution)cell(level,h+roleWidth-2*stroke,0,tierWidth);
  partner(0,h-stroke,width);
 }
 if(guides){
  const ink='rgba(255,255,255,.38)',x0=['compact','symbol'].includes(format.layout)?h-stroke:format.layout==='horizontal'?wordmarkWidth-stroke:0,y0=format.layout==='stacked'?topHeight-stroke:0;
  parts.push(`<g fill="none" stroke="${ink}" stroke-width="1"><rect x="${x0+u}" y="${y0+u}" width="${role.width}" height="${role.height}"/><path d="M ${x0} ${y0+u} H ${x0+roleWidth} M ${x0+u} ${y0} V ${y0+role.height+2*u}"/></g>`);
  if(clearSpace)parts.push(`<g fill="none" stroke="${ink}" stroke-width="1"><rect x="${-u}" y="${-u}" width="${width+2*u}" height="${height+2*u}"/><path d="M 0 ${-u} V ${height+u} M ${width} ${-u} V ${height+u} M ${-u} 0 H ${width+u} M ${-u} ${height} H ${width+u}"/></g><g fill="${ink}" font-family="Camera Plain" font-size="${u*.45}" text-anchor="middle"><text x="${width/2}" y="${-u*.35}">x</text><text x="${-u*.5}" y="${height/2+u*.15}">x</text><text x="${width+u*.5}" y="${height/2+u*.15}">x</text><text x="${width/2}" y="${height+u*.68}">x</text></g>`);
 }
 let artwork=parts.join('');
 if(treatment==='dark-outline'){
  artwork=artwork.replaceAll('fill="white"','fill="#1b1b1b"').replaceAll('stroke="white"','stroke="#1b1b1b"').replaceAll('<image ',`<image filter="url(#${id}-dark)" `);
  artwork=`<defs><filter id="${id}-dark" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 .105882 0 0 0 0 .105882 0 0 0 0 .105882 0 0 0 1 0"/></filter></defs>${artwork}`;
 }
 if(treatment==='dark-filled')artwork=artwork.replaceAll('fill="none" stroke="white"','fill="#1b1b1b" stroke="#1b1b1b"');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${n(width+pad*2)} ${n(height+pad*2)}" class="badge-graphic" role="img" aria-labelledby="${id}-title" data-format="${format.id}" data-figma-node="${format.node}"><title id="${id}-title">${esc(format.name)}${solution?` · ${tier}`:''} · ${esc(year)}</title>${artwork}</svg>`;
}

export function paddingDiagram(){
 const u=32,s=shape(['Solution','Partner'],96),w=s.width+64,h=160,left=48,top=42;
 return `<svg class="padding-diagram" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w+96} 244" role="img" aria-label="The visible text has equal x padding on all four sides"><g transform="translate(${left} ${top})">${outline(0,0,w,h,u)}${drawShape(s,u,u)}<g fill="none" stroke="white" stroke-opacity=".28" stroke-width=".8"><rect x="${u}" y="${u}" width="${s.width}" height="96"/><path d="M ${u} 0 V ${h} M ${w-u} 0 V ${h} M 0 ${u} H ${w} M 0 ${h-u} H ${w}"/></g><g fill="white" fill-opacity=".6" font-family="Camera Plain" font-size="12" text-anchor="middle"><text x="${w/2}" y="20">x</text><text x="${w/2}" y="149">x</text><text x="16" y="84">x</text><text x="${w-16}" y="84">x</text></g></g></svg>`;
}

// Separate HTML panels allow a real perspective hinge around each left edge.
export function badgeAssembly(options={}){
 const svg=new DOMParser().parseFromString(badgeSvg('solution-compact',options),'image/svg+xml').documentElement;
 const [,,w,h]=svg.getAttribute('viewBox').split(' ').map(Number);
 return `<div class="assembly-badge" style="aspect-ratio:${w}/${h}">${[...svg.querySelectorAll('[data-module]')].map((module,i)=>{
  const rect=module.querySelector('rect'),stroke=Number(rect.getAttribute('stroke-width'));
  const x=Number(rect.getAttribute('x'))-stroke/2,width=Number(rect.getAttribute('width'))+stroke;
  module.removeAttribute('data-module');
  return `<div class="assembly-module" data-module="${i===0?'identity':'text'}" style="left:${x/w*100}%;width:${width/w*100}%"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} 0 ${width} ${h}" aria-hidden="true">${module.outerHTML}</svg></div>`;
 }).join('')}</div>`;
}
export function symbolClearSpace(){
 const u=32,h=96,w=82.2357/83.3616*h;
 return `<svg class="symbol-space-diagram" viewBox="0 0 ${w+2*u} ${h+2*u}" role="img" aria-label="Leave x on every side of the Lovable heart, with the symbol itself three x high">${image('1-713-imgVector1',u,u,82.2357,83.3616,h/83.3616)}<g fill="none" stroke="white" stroke-opacity=".28" stroke-width=".7"><rect x=".5" y=".5" width="${w+2*u-1}" height="${h+2*u-1}"/><path d="M32 0V160M${w+u} 0V160M0 32H${w+2*u}M0 128H${w+2*u}"/></g><g fill="white" fill-opacity=".6" font-family="Camera Plain" font-size="12" font-weight="600" text-anchor="middle"><text x="${u+w/2}" y="20">x</text><text x="${u+w/2}" y="149">x</text><text x="16" y="84">x</text><text x="${w+u*1.5}" y="84">x</text></g></svg>`;
}
