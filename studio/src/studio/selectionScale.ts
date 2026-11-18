import type {HtmlBlock,HtmlEditorState} from './htmlEditorModel';
import type {ElementFrame,Rect} from './htmlSelectionOperations';

export type ScaleOrigin=[number,number];
type ScaleItem={id:string;frame:ElementFrame;box:Rect;width:number;height:number;parentWidth:number;minWidth?:number};
const dimensions={padding:[0,160],paddingTop:[0,160],paddingRight:[0,160],paddingBottom:[0,160],paddingLeft:[0,160],radius:[0,1500],radiusTopLeft:[0,1500],radiusTopRight:[0,1500],radiusBottomLeft:[0,1500],radiusBottomRight:[0,1500],borderWidth:[0,24],lineWidth:[1,24],fontSize:[1,1000],letterSpacing:[-20,100]} as const;

/** One factor for geometry and ink. Clamp the factor for the whole selection,
 * never individual children, so limits cannot distort the group or its pivot. */
export function scaleSelection(items:ScaleItem[],blocks:HtmlBlock[],bounds:Rect,requested:number,origin:ScaleOrigin=[.5,.5],content=true){
 const pivot={x:bounds.left+bounds.width*origin[0],y:bounds.top+bounds.height*origin[1]};
 let min=0.001,max=1000;
 const limit=(value:number,low:number,high:number)=>{
  if(!value)return;
  const a=low/value,b=high/value;min=Math.max(min,Math.min(a,b));max=Math.min(max,Math.max(a,b));
 };
 const appearance=(item:ScaleItem)=>{
  const block=blocks.find(block=>block.id===item.id),value={...item.frame.appearance};
  if(block?.kind==='text')value.fontSize??=block.value.size;
  if(block?.kind==='shape'&&block.shape==='line')value.lineWidth??=2;
  return value;
 };
 for(const item of items){
  limit(item.width,Math.max(1,item.minWidth??0),item.frame.widthPx!==undefined?4000:item.parentWidth*5);
  limit(item.height,1,4000);
  for(const [axis,start,dimension,center] of [['x',item.frame.x??0,item.width,item.box.left+item.box.width/2],['y',item.frame.y??0,item.height,item.box.top+item.box.height/2]] as const){
   const slope=center-pivot[axis]-dimension/2;
   if(slope){const a=1+(-4000-start)/slope,b=1+(4000-start)/slope;min=Math.max(min,Math.min(a,b));max=Math.min(max,Math.max(a,b));}
  }
  if(content){
   const value=appearance(item);
   for(const [key,[low,high]] of Object.entries(dimensions)){const n=value[key as keyof typeof dimensions];if(n!==undefined)limit(n,low,high);}
   if(item.frame.radius!==undefined)limit(item.frame.radius,0,160);
   if(item.frame.spacingAfter!==undefined)limit(item.frame.spacingAfter,0,400);
  }
 }
 const factor=Math.max(min,Math.min(max,Number.isFinite(requested)?requested:1));
 const frames=Object.fromEntries(items.map(item=>{
  const {frame,width,height,box}=item;
  const value=appearance(item);
  if(content)for(const key of Object.keys(dimensions) as (keyof typeof dimensions)[])if(value[key]!==undefined)value[key]=value[key]!*factor;
  return [item.id,{...frame,
   ...(frame.widthPx!==undefined?{widthPx:width*factor}:{width:width*factor/item.parentWidth*100}),height:height*factor,
   x:(frame.x??0)+(box.left+box.width/2-pivot.x-width/2)*(factor-1),
   y:(frame.y??0)+(box.top+box.height/2-pivot.y-height/2)*(factor-1),
   ...(frame.groupId?{groupScale:(frame.groupScale??1)*factor}:{}),
   ...(content?{appearance:value,...(frame.radius!==undefined?{radius:frame.radius*factor}:{}),...(frame.spacingAfter!==undefined?{spacingAfter:frame.spacingAfter*factor}:{})}:{}),
  }];
 }));
 return {frames,factor};
}

/** Project pointer motion onto the active handle's ray from the fixed pivot. */
export function selectionResizeFactor(bounds:Rect,delta:{x:number;y:number},handle:string,origin:ScaleOrigin){
 const x=handle.includes('w')?0:handle.includes('e')?1:.5,y=handle.includes('n')?0:handle.includes('s')?1:.5;
 const vx=(x-origin[0])*bounds.width,vy=(y-origin[1])*bounds.height,denominator=vx*vx+vy*vy;
 return denominator?1+(delta.x*vx+delta.y*vy)/denominator:1;
}

export function patchScaledSelection(state:HtmlEditorState,frames:Record<string,ElementFrame>):HtmlEditorState{
 return {...state,pages:state.pages.map(page=>({...page,sections:page.sections.map(section=>({...section,columns:section.columns.map(column=>column.map(block=>{
  const frame=frames[block.id];if(!frame)return block;
  return {...block,...(block.kind==='text'&&frame.appearance?.fontSize!==undefined?{value:{...block.value,size:frame.appearance.fontSize}}:{}),editor:{...block.editor,...frame}} as HtmlBlock;
 }))}))}))};
}
