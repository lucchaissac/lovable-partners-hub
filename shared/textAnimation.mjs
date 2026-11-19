export const textAnimationModes=/** @type {const} */ (['none','words','characters','typing']);
export const textAnimationItems=[{id:'words',label:'Word by word'},{id:'characters',label:'Character by character'},{id:'typing',label:'Natural typing'}];

/** A deterministic timeline: scrubbing and exported frames use identical reveals. */
export function textAnimationTimeline(text,mode){
 if(mode==='none'||!text)return [];
 const segments=mode==='words'?[...text.matchAll(/\s+|\S+/gu)].map(match=>({segment:match[0],index:match.index})):[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)];
 const weights=segments.map(({segment},index)=>mode!=='typing'?1:/\s/u.test(segment)?.4:/[.,!?;:…]/u.test(segment)?2.7:.7+((segment.codePointAt(0)+index*17)%13)/20);
 const total=weights.reduce((sum,weight)=>sum+weight,0);let elapsed=0;
 return segments.map(({segment,index},i)=>{
  const at=elapsed/total*.85;elapsed+=weights[i];
  return {start:index,end:index+segment.length,at:mode==='typing'?elapsed/total*.85:at,fade:mode==='typing'?0:Math.min(.15,.85/Math.max(1,segments.length)*1.5)};
 });
}
export function textAnimationOpacity(unit,progress){
 if(progress>=1)return 1;if(progress<=0)return 0;
 return unit.fade?Math.max(0,Math.min(1,(progress-unit.at)/unit.fade)):Number(progress>=unit.at);
}
