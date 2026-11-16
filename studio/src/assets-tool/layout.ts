import {z} from 'zod';
import type {HtmlBlock,HtmlEditorState} from '../studio/htmlEditorModel.js';

const dimensions=z.object({width:z.number().positive().max(1350),height:z.number().positive().max(1350)}).strict();
const geometry=z.object({id:z.string().max(80),x:z.number(),y:z.number(),w:z.number().positive(),h:z.number().positive(),fontSize:z.number().optional(),textSize:z.number().optional(),radius:z.number().optional()}).strict();
export const assetLayoutSchema=z.object({reflowVersion:z.literal(2).optional(),contentKey:z.string().max(24).optional(),dimensions,nodes:z.array(geometry).max(40),blocks:z.array(geometry).max(240)}).strict();
export const assetLayoutsSchema=z.object({landscape:assetLayoutSchema.optional(),square:assetLayoutSchema.optional(),portrait:assetLayoutSchema.optional()}).strict();
type Box={x:number;y:number;w:number;h:number};
type Dimensions={width:number;height:number};
type Geometry=z.infer<typeof geometry>;
export type AssetLayout=z.infer<typeof assetLayoutSchema>;

/** Geometry can be reused until content or grouping changes and needs measuring again. */
export function layoutContentKey(editor?:HtmlEditorState) {
  const text=JSON.stringify(editor?.pages.flatMap(p=>p.sections.flatMap(s=>s.columns.flat().map(b=>[b.id,b.kind,b.editor?.groupId,b.kind==='text'?b.value.runs:undefined])))??[]);
  let hash=2166136261;
  for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
  return (hash>>>0).toString(36);
}

export const blockBox=(block:HtmlBlock):Box=>({x:block.editor?.x??0,y:block.editor?.y??0,w:block.editor?.widthPx??200,h:block.editor?.height??40});
const union=(boxes:Box[]):Box=>{
  const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
  return {x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x,h:Math.max(...boxes.map(b=>b.y+b.h))-y};
};
const contains=(a:Box,b:Box)=>b.x>=a.x-1&&b.y>=a.y-1&&b.x+b.w<=a.x+a.w+1&&b.y+b.h<=a.y+a.h+1;
export const captureBlocks=(editor?:HtmlEditorState):Geometry[]=>editor?.pages.flatMap(p=>p.sections.flatMap(s=>s.columns.flat().map(b=>({id:b.id,...blockBox(b),fontSize:b.editor?.appearance?.fontSize,radius:b.editor?.appearance?.radius,...(b.kind==='text'?{textSize:b.value.size}:{})}))))??[];
function apply(block:HtmlBlock,box:Box,scale=1) {
  const f=block.editor??={},a=f.appearance;
  Object.assign(f,{x:box.x,y:box.y,widthPx:Math.max(1,box.w),height:Math.max(12,box.h)});
  if(a?.fontSize!==undefined)a.fontSize*=scale;
  if(a?.radius!==undefined)a.radius*=scale;
  if(block.kind==='text')block.value.size*=scale;
}
export function restoreBlocks(editor:HtmlEditorState,items:Geometry[]) {
  const saved=new Map(items.map(item=>[item.id,item]));
  for(const p of editor.pages)for(const s of p.sections)for(const block of s.columns.flat()){
    const g=saved.get(block.id);if(!g)continue;
    apply(block,g);
    const a=block.editor!.appearance;
    if(a){if(g.fontSize===undefined)delete a.fontSize;else a.fontSize=g.fontSize;if(g.radius===undefined)delete a.radius;else a.radius=g.radius;}
    if(block.kind==='text'&&g.textSize!==undefined)block.value.size=g.textSize;
  }
}
/** Fit the artwork bounds, never the previously padded canvas. Repeated changes cannot compound shrinkage. */
export function fitBoxes(boxes:Box[],to:Dimensions) {
  const b=union(boxes),margin=Math.min(to.width,to.height)*.06;
  const scale=Math.min((to.width-margin*2)/b.w,(to.height-margin*2)/b.h);
  return {scale,boxes:boxes.map(item=>({x:(to.width-b.w*scale)/2+(item.x-b.x)*scale,y:(to.height-b.h*scale)/2+(item.y-b.y)*scale,w:item.w*scale,h:item.h*scale}))};
}
function textHeight(block:HtmlBlock,width:number,scale:number) {
  if(block.kind!=='text')return blockBox(block).h*scale;
  const size=(block.editor?.appearance?.fontSize??block.value.size)*scale,line=(block.editor?.appearance?.lineHeight??125)/100;
  const text=block.value.runs.map(r=>r.text).join('');
  let measure=(word:string)=>word.length*size*.53;
  if(typeof document!=='undefined'){
    const ctx=document.createElement('canvas').getContext('2d');
    if(ctx){ctx.font=`${block.editor?.appearance?.fontWeight??400} ${size}px Arial`;measure=word=>ctx.measureText(word).width;}
  }
  let lines=0;
  for(const paragraph of text.split('\n')){
    let used=0;lines++;
    for(const word of paragraph.split(/\s+/)){const w=measure(word+' ');if(used&&used+w>width){lines++;used=0;}used+=w;}
  }
  return Math.max(1,lines)*size*line;
}
/** Reflow a media/content card using its actual spatial groups, without recreating any objects. */
function reflowCard(blocks:HtmlBlock[],to:Dimensions):boolean {
  if(blocks.length<3)return false;
  const panel=blocks.filter(b=>b.kind==='shape'&&!b.icon&&b.shape==='rectangle').sort((a,b)=>blockBox(b).w*blockBox(b).h-blockBox(a).w*blockBox(a).h)[0];
  if(!panel)return false;
  const pb=blockBox(panel),others=blocks.filter(b=>b!==panel);
  if(!others.every(b=>contains(pb,blockBox(b))))return false;
  const media=others.filter(b=>b.kind==='image').sort((a,b)=>blockBox(b).w*blockBox(b).h-blockBox(a).w*blockBox(a).h)[0];
  if(!media)return false;
  const mb=blockBox(media),overlays=others.filter(b=>b!==media&&contains(mb,blockBox(b))),content=others.filter(b=>b!==media&&!overlays.includes(b));
  if(!content.some(b=>b.kind==='text'))return false;
  const cb=union(content.map(blockBox));
  if(!(cb.x>=mb.x+mb.w-1||cb.y>=mb.y+mb.h-1))return false;
  const margin=Math.min(to.width,to.height)*.06,padding=Math.min(to.width,to.height)*.03,gap=padding;
  const card={x:margin,y:margin,w:to.width-margin*2,h:to.height-margin*2};
  const inner={x:card.x+padding,y:card.y+padding,w:card.w-padding*2,h:card.h-padding*2};
  const stacked=to.width/to.height<1.3;
  const mediaWidth=stacked?inner.w:(inner.w-gap)*mb.w/(mb.w+cb.w);
  const contentWidth=stacked?inner.w:inner.w-mediaWidth-gap;
  // Reorganize the content, not its typography. Font sizes must not depend on the
  // previous column width (a portrait-to-landscape switch used to halve them).
  const typeScale=1;
  // Keep explicit groups together, then join vertically overlapping icon/text rows.
  const groups=new Map<string,HtmlBlock[]>();
  for(const b of content){const key=b.editor?.groupId??b.id;groups.set(key,[...(groups.get(key)??[]),b]);}
  const grouped=[...groups.values()].map(items=>({items,box:union(items.map(blockBox))}));
  const ornaments=grouped.filter(row=>row.items.every(b=>b.kind==='shape'&&b.icon)&&row.box.h>64&&row.box.w>64);
  const hasText=(row:typeof grouped[number])=>row.items.some(b=>b.kind==='text');
  const columnRank=(row:typeof grouped[number])=>row.box.w>cb.w*.8?2:row.box.x>=cb.x+cb.w*.3?1:0;
  const sourceColumns=grouped.some(row=>hasText(row)&&row.box.x+row.box.w<=cb.x+cb.w*.55)&&grouped.some(row=>hasText(row)&&columnRank(row)===1);
  const rows=grouped.filter(row=>!ornaments.includes(row)).sort((a,b)=>(sourceColumns?columnRank(a)-columnRank(b):0)||a.box.y-b.box.y);
  for(let i=1;i<rows.length;){
    if((!sourceColumns||columnRank(rows[i])===columnRank(rows[i-1]))&&rows[i].box.y<rows[i-1].box.y+rows[i-1].box.h-1){rows[i-1].items.push(...rows[i].items);rows[i-1].box=union(rows[i-1].items.map(blockBox));rows.splice(i,1);}else i++;
  }
  // Large standalone decorative icons get their own space after the nearby text.
  // They must not make overlapping title/eyebrow boxes into one unreadable row.
  for(const ornament of ornaments){
    let anchor=-1,largest=0;
    for(let i=0;i<rows.length;i++)for(const b of rows[i].items)if(b.kind==='text'){
      const size=b.editor?.appearance?.fontSize??b.value.size;
      if(size>largest){largest=size;anchor=i;}
    }
    if(!stacked&&anchor>=0&&rows[anchor].items.some(b=>b.kind==='text')){
      rows[anchor].items.push(...ornament.items);rows[anchor].box=union(rows[anchor].items.map(blockBox));
    }else rows.splice(anchor+1,0,ornament);
  }
  const layoutRow=(row:typeof rows[number],contentWidth:number,typeScale:number)=>{
    const backing=row.items.find(b=>b.kind==='shape'&&!b.icon&&blockBox(b).w>=row.box.w*.9);
    const sideDecoration=!stacked&&!backing&&row.items.some(b=>b.kind==='text')?row.items.find(b=>b.kind==='shape'&&b.icon&&blockBox(b).w>64&&blockBox(b).h>64):undefined;
    const boxes=row.items.map(block=>{
      const b=blockBox(block),wide=b.w>=row.box.w*.8;
      let x=(b.x-row.box.x)*typeScale,w=b.w*typeScale,h=b.h*typeScale,y=(b.y-row.box.y)*typeScale;
      if(backing){
        if(wide)w=contentWidth-x;
        else x=contentWidth/2+(b.x-row.box.x-row.box.w/2)*typeScale;
        if(block.kind==='text'){h=textHeight(block,w,typeScale);y=(row.box.h*typeScale-h)/2;}
        if(block.kind==='shape'&&block.icon){h=w;y=(row.box.h*typeScale-h)/2;}
      }else if(block.kind==='text'){w=contentWidth-x-(sideDecoration?blockBox(sideDecoration).w*typeScale+16:0);h=textHeight(block,w,typeScale);}
      else if(block.kind==='divider'){w=contentWidth;h=12;y=0;}
      else if(w>contentWidth){h*=contentWidth/w;w=contentWidth;x=0;}
      if(block===sideDecoration){x=contentWidth-w;y=0;}
      return {block,box:{x,y,w,h}};
    });
    return {boxes,height:Math.max(...boxes.map(item=>item.box.y+item.box.h))};
  };
  // Compact canvases can put the heading beside the details below the media.
  // Taller canvases have enough height for a single reading column.
  const action=rows.at(-1),hasAction=action?.items.some(b=>b.kind==='shape'&&!b.icon&&blockBox(b).w>=action.box.w*.9);
  const candidates=hasAction?rows.slice(0,-1):rows;
  const titleIndex=candidates.reduce((best,row,index)=>{
    const size=Math.max(0,...row.items.filter(b=>b.kind==='text').map(b=>b.editor?.appearance?.fontSize??(b.kind==='text'?b.value.size:0)));
    const previous=candidates[best];const largest=Math.max(0,...previous.items.filter(b=>b.kind==='text').map(b=>b.editor?.appearance?.fontSize??(b.kind==='text'?b.value.size:0)));
    return size>largest?index:best;
  },0);
  let split=titleIndex+1;
  while(split<candidates.length&&(candidates[split].items.every(b=>b.kind==='divider')||ornaments.includes(candidates[split])))split++;
  const layouts=rows.map(row=>layoutRow(row,contentWidth,typeScale));
  const textHeightTotal=layouts.reduce((sum,row)=>sum+row.height,0)+Math.max(0,layouts.length-1)*12;
  const splitDetails=stacked&&hasAction&&split<candidates.length&&candidates.length>=3&&(to.width/to.height>=.9||textHeightTotal>inner.h*.45);
  const readableScale=typeScale;
  const leftWidth=(inner.w-gap)*.4,rightWidth=inner.w-gap-leftWidth;
  const headingLayouts=splitDetails?candidates.slice(0,split).map(row=>layoutRow(row,leftWidth,readableScale)):[];
  const detailLayouts=splitDetails?candidates.slice(split).map(row=>layoutRow(row,rightWidth,readableScale)):[];
  const footer=splitDetails?layoutRow(action!,inner.w,readableScale):undefined;
  const rowGap=12*readableScale;
  const stackHeight=(items:typeof layouts)=>items.reduce((sum,row)=>sum+row.height,0)+Math.max(0,items.length-1)*rowGap;
  const splitHeight=Math.max(stackHeight(headingLayouts),stackHeight(detailLayouts));
  const mediaHeight=splitDetails?inner.h-splitHeight-footer!.height-gap*2:stacked?inner.h-gap-textHeightTotal:inner.h;
  if(mediaHeight<inner.h*.3||(!splitDetails&&textHeightTotal>inner.h))return false;
  const targetMedia={x:inner.x,y:inner.y,w:mediaWidth,h:mediaHeight};
  apply(panel,card);apply(media,targetMedia,readableScale);
  if(panel.editor?.appearance)panel.editor.appearance.radius=(media.editor?.appearance?.radius??16)+padding;
  // Anchor badges to their nearest photo edges; their text/icons retain the same scale.
  const overlayGroups=new Map<string,HtmlBlock[]>();
  for(const b of overlays){const key=b.editor?.groupId??b.id;overlayGroups.set(key,[...(overlayGroups.get(key)??[]),b]);}
  for(const items of overlayGroups.values()){
    const b=union(items.map(blockBox)),right=b.x+b.w/2>mb.x+mb.w/2,bottom=b.y+b.h/2>mb.y+mb.h/2;
    const x=right?targetMedia.x+targetMedia.w-(mb.x+mb.w-b.x)*readableScale:targetMedia.x+(b.x-mb.x)*readableScale;
    const y=bottom?targetMedia.y+targetMedia.h-(mb.y+mb.h-b.y)*readableScale:targetMedia.y+(b.y-mb.y)*readableScale;
    for(const block of items){const f=blockBox(block);apply(block,{x:x+(f.x-b.x)*readableScale,y:y+(f.y-b.y)*readableScale,w:f.w*readableScale,h:f.h*readableScale},readableScale);}
  }
  if(splitDetails){
    const y=targetMedia.y+targetMedia.h+gap;
    const place=(items:typeof layouts,x:number,start:number)=>{let top=start;for(const row of items){for(const {block,box} of row.boxes)apply(block,{...box,x:x+box.x,y:top+box.y},readableScale);top+=row.height+rowGap;}};
    place(headingLayouts,inner.x,y);place(detailLayouts,inner.x+leftWidth+gap,y);
    place([footer!],inner.x,inner.y+inner.h-footer!.height);
    return true;
  }
  const x=stacked?inner.x:inner.x+mediaWidth+gap;
  let y=stacked?inner.y+mediaHeight+gap:inner.y;
  const extraGap=!stacked&&layouts.length>1?(inner.h-textHeightTotal)/(layouts.length-1):0;
  for(const row of layouts){for(const {block,box} of row.boxes)apply(block,{...box,x:x+box.x,y:y+box.y},typeScale);y+=row.height+rowGap+extraGap;}
  return true;
}
export function resizeEditor(editor:HtmlEditorState,to:Dimensions) {
  for(const page of editor.pages)for(const section of page.sections){
    section.minHeight=to.height;
    const blocks=section.columns.flat();if(!blocks.length)continue;
    if(reflowCard(blocks,to))continue;
    const fit=fitBoxes(blocks.map(blockBox),to);
    blocks.forEach((block,i)=>apply(block,fit.boxes[i],fit.scale));
  }
}

/** Recover files already reduced by the old cumulative resize, when the user changes format. */
export function repairEditorScale(editor:HtmlEditorState,size:Dimensions) {
  const blocks=editor.pages.flatMap(p=>p.sections.flatMap(s=>s.columns.flat()));
  if(!blocks.length||!blocks.some(b=>b.kind==='image')||!blocks.some(b=>b.kind==='text'))return false;
  const bounds=union(blocks.map(blockBox));
  if(bounds.w>=size.width*.45||bounds.h>=size.height*.45)return false;
  resizeEditor(editor,size);
  return true;
}
