/** Deterministic vector constructions, inspired by the supplied Tech blog covers. */
export const curvePresets=[{id:'convergence',label:'Convergence'},{id:'rays',label:'Rays'},{id:'rings',label:'Hourglass'},{id:'flow',label:'Flow'}];
export const curveDefaults={kind:'curves',preset:'convergence',count:7,spread:100,rotation:0,stroke:1.12,opacity:30,color:'#ffffff'};
export const gridDefaults={kind:'grid',style:'lines',spacing:28.08,stroke:.37,opacity:8,color:'#ffffff'};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number(n)||0));
const n=v=>Number(v.toFixed(3));
export function techArtworkSvg(settings){
 const s=settings,ink=/^#[0-9a-f]{6}$/i.test(s.color)?s.color:'#ffffff',stroke=clamp(s.stroke,.1,4),opacity=clamp(s.opacity,0,100)/100;
 const start='<svg xmlns="http://www.w3.org/2000/svg" width="674" height="337" viewBox="0 0 674 337">';
 if(s.kind==='grid'){
  const step=clamp(s.spacing,10,84),parts=[];
  if(s.style==='dots'){
   for(let x=step;x<674;x+=step)for(let y=step;y<337;y+=step)parts.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(stroke)}"/>`);
   return start+`<g fill="${ink}" opacity="${opacity}">${parts.join('')}</g></svg>`;
  }
  for(let x=step;x<674;x+=step)parts.push(`M${n(x)} 0V337`);
  for(let y=step;y<337;y+=step)parts.push(`M0 ${n(y)}H674`);
  return start+`<path d="${parts.join('')}" fill="none" stroke="${ink}" stroke-width="${stroke}" opacity="${opacity}"/></svg>`;
 }
 const count=Math.round(clamp(s.count,3,64)),spread=clamp(s.spread,25,160)/100,rotation=clamp(s.rotation,-180,180),cx=519.64,cy=168.785,parts=[];
 if(s.preset==='rays'){
  for(let i=0;i<count;i++){
   const a=i*Math.PI*2/count,r=230;
   parts.push(`<path d="M${n(cx+Math.cos(a)*8*spread)} ${n(cy+Math.sin(a)*8*spread)}L${n(cx+Math.cos(a)*r)} ${n(cy+Math.sin(a)*r)}"/>`);
  }
 }else if(s.preset==='rings'){
  for(let i=0;i<count;i++){
   const t=i/(count-1),rx=(12+112*Math.pow(Math.abs(t*2-1),1.6))*spread;
   parts.push(`<ellipse cx="${cx}" cy="${n(38+t*260)}" rx="${n(rx)}" ry="${n(6+rx*.11)}"/>`);
  }
 }else if(s.preset==='flow'){
  for(let i=0;i<count;i++){
   const y=30.75+i/(count-1)*276.07,end=cy+(y-cy)*(.04+.28*(1-spread/1.6));
   parts.push(`<path d="M393.87 ${n(y)}C${n(455+spread*50)} ${n(y)} 548 ${n(end)} 645.218 ${n(end)}"/>`);
  }
 }else{
  const widths=[87.523,184.92,272.892,336.627,387.794,420.559,440.308];
  for(let i=0;i<count;i++){
   const t=i/(count-1)*6,j=Math.min(5,Math.floor(t)),w=(widths[j]+(widths[j+1]-widths[j])*(t-j))*spread;
   for(const side of [-1,1])parts.push(`<ellipse cx="${n(cx+side*w/2)}" cy="${cy}" rx="${n(w/2-stroke/2)}" ry="${n(138.035-stroke/2)}"/>`);
  }
 }
 return start+'<defs><clipPath id="tech-crop"><rect x="393.87" y="28.08" width="251.348" height="280.834"/></clipPath></defs>'+`<g clip-path="url(#tech-crop)"><g fill="none" stroke="${ink}" stroke-width="${stroke}" opacity="${opacity}" transform="rotate(${rotation} ${cx} ${cy})">${parts.join('')}</g></g></svg>`;
}
export const techArtworkDataUrl=settings=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(techArtworkSvg(settings));
