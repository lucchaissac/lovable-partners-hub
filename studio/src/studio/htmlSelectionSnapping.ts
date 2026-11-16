import type { Rect } from './htmlSelectionOperations';
export type Guide = {axis:'x'|'y';value:number;start:number;end:number};
/** Keep every visible segment inside its section, including the stroke. */
export function clipHtmlGuides(guides:Guide[],regions:Rect[]):Guide[] {
  const result:Guide[]=[];
  for(const guide of guides)for(const region of regions){
    const low=guide.axis==='x'?region.left:region.top,extent=guide.axis==='x'?region.width:region.height;
    if(guide.value<low-.01||guide.value>low+extent+.01||extent<1)continue;
    const cross=guide.axis==='x'?region.top:region.left,length=guide.axis==='x'?region.height:region.width;
    const start=Math.max(guide.start,cross+.5),end=Math.min(guide.end,cross+length-.5);
    if(end<=start)continue;
    const segment={...guide,value:Math.max(low+.5,Math.min(low+extent-.5,guide.value)),start,end};
    if(!result.some(g=>g.axis===segment.axis&&g.value===segment.value&&g.start===start&&g.end===end))result.push(segment);
  }
  return result;
}
/** Centered section resizing snaps to the width of the nearest matching section. */
export function snapHtmlSectionResize(bounds:Rect, width:number, targets:Rect[], threshold=12) {
  let best:{target:Rect;distance:number;proximity:number}|undefined;
  for(const target of targets){
    const distance=Math.abs(target.width-width),proximity=Math.abs(target.top-bounds.top);
    if(target.width>0&&distance<=threshold&&(!best||distance<best.distance||distance===best.distance&&proximity<best.proximity))best={target,distance,proximity};
  }
  if(!best)return {width,guides:[] as Guide[],matched:false};
  const target=best.target,center=bounds.left+bounds.width/2;
  const aligned=Math.abs(center-(target.left+target.width/2))<1;
  const start=Math.min(bounds.top,target.top)-12,end=Math.max(bounds.top+bounds.height,target.top+target.height)+12;
  const guides:Guide[]=aligned?[target.left,target.left+target.width].map(value=>({axis:'x',value,start,end})):[];
  return {width:target.width,guides,matched:true};
}
/** Match edge/center anchors in viewport pixels, independent of page scroll/zoom. */
export function snapHtmlMove(bounds:Rect, delta:{x:number;y:number}, targets:Rect[], threshold=6) {
  const moved={...bounds,left:bounds.left+delta.x,top:bounds.top+delta.y},guides:Guide[]=[];
  const result={...delta};
  for(const axis of ['x','y'] as const){
    const pos=axis==='x'?'left':'top',size=axis==='x'?'width':'height',cross=axis==='x'?'top':'left',crossSize=axis==='x'?'height':'width';
    let best:{distance:number;offset:number;value:number;target:Rect}|null=null;
    for(const target of targets)for(const fraction of [0,.5,1])for(const ownFraction of [0,.5,1]){
      const value=target[pos]+target[size]*fraction,offset=value-(moved[pos]+moved[size]*ownFraction),distance=Math.abs(offset);
      if(distance<=threshold&&(!best||distance<best.distance))best={distance,offset,value,target};
    }
    if(best){result[axis]+=best.offset;guides.push({axis,value:best.value,start:Math.min(moved[cross],best.target[cross])-12,end:Math.max(moved[cross]+moved[crossSize],best.target[cross]+best.target[crossSize])+12});}
  }
  return {delta:result,guides};
}
