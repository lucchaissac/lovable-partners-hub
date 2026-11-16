import { defaultPartnerBadge, legacyBadgeFormat } from './partnerBadgeSettings';
import { htmlEditorSchema, type HtmlBlock, type HtmlEditorState } from '../studio/htmlEditorModel.js';
import { assetColor, assetDimensions, type AssetDocument } from './model.js';

export const REFERENCE_IMAGE = '/__asset-asset-reference__';
const textWidth=(text:string,size:number,weight=500)=>{
  if(typeof document!=='undefined'){const ctx=document.createElement('canvas').getContext('2d');if(ctx){ctx.font=`${weight} ${size}px Camera Plain`;return ctx.measureText(text).width;}}
  return text.length*size*.5;
};
/** A call-to-action in artwork is three native primitives, never a live button/widget. */
function primitives(block:Extract<HtmlBlock,{kind:'cta'}>,badge=false):HtmlBlock[]{
  const frame=block.editor??{},a=frame.appearance??{},x=frame.x??0,y=frame.y??0,w=frame.widthPx??320,h=frame.height??72,size=a.fontSize??24;
  const groupId=block.id,fill=block.color??'#ffffff',weight=a.fontWeight??500,labelW=textWidth(block.label,size,weight),labelH=size*1.25;
  const pill=badge||String(a.background??a.fill).includes('media-control');
  const width=pill?Math.max(w,labelW+(block.leadingIcon?size+8:0)+32):w;
  const labelX=pill?x+16+(block.leadingIcon?size+8:0):x;
  const labelWidth=pill?width-32-(block.leadingIcon?size+8:0):w;
  const common={...frame,groupId};
  return [
    {id:block.id,kind:'shape',shape:'rectangle',editor:{...common,widthPx:width,appearance:{background:a.background??a.fill,fill:a.background??a.fill,radius:a.radius??16}}},
    {id:`${block.id}-label`,kind:'text',value:{runs:[{text:block.label}],style:'Text',size,align:pill?'left':'center',color:fill},editor:{...common,x:labelX,y:y+(h-labelH)/2,widthPx:labelWidth,height:labelH,appearance:{fontFamily:'Camera Plain',fontSize:size,fontWeight:weight,lineHeight:125}}},
    ...(block.leadingIcon?[{id:`${block.id}-icon`,kind:'shape' as const,shape:'rectangle' as const,icon:block.leadingIcon,filled:block.leadingIcon==='play',editor:{...common,x:pill?x+16:x+(w-labelW)/2-12-size,y:y+(h-size)/2,widthPx:size,height:size,appearance:{fill}}}]:[]),
  ];
}
function upgradeBadge(block:HtmlBlock,referenceSrc:string):HtmlBlock {
  if(block.kind!=='image')return block;
  const format=block.badge?.format||legacyBadgeFormat(block.value.src,block.value.alt);
  return format?{...block,badge:block.badge||defaultPartnerBadge(format),value:{...block.value,src:block.value.src===REFERENCE_IMAGE?referenceSrc:block.value.src}}:block;
}
export function nativeDocument(asset:AssetDocument):HtmlEditorState {
  if(asset.editor)return {...asset.editor,pages:asset.editor.pages.map(page=>({...page,sections:page.sections.map(section=>({...section,...(section.shadow?{shadow:'none' as const}:{}),columns:section.columns.map(column=>column.flatMap(block=>block.kind==='cta'?primitives(block):[upgradeBadge(block,asset.reference.src)]))}))}))};
  const blocks:HtmlBlock[]=asset.nodes.flatMap((node,index):HtmlBlock[]=>{
    const id=`a${index}-${node.id.replaceAll('_','-')}`;
    const appearance={radius:node.radius,fontFamily:'Camera Plain' as const,fontSize:node.fontSize,fontWeight:Number(node.weight),lineHeight:125,...(node.fill!=='none'?{background:assetColor(node.fill),fill:assetColor(node.fill)}:{})};
    const editor={position:'absolute' as const,x:node.x,y:node.y,widthPx:node.w,height:Math.max(12,node.h),appearance};
    if(node.kind==='image')return [{id,kind:'image',editor,value:{src:REFERENCE_IMAGE,alt:node.name,caption:'',alignment:'center',width:100,crop:{x:node.crop.x*asset.reference.width,y:node.crop.y*asset.reference.height,width:node.crop.w*asset.reference.width,height:node.crop.h*asset.reference.height,sourceWidth:asset.reference.width,sourceHeight:asset.reference.height}}}];
    if(node.kind==='text')return [{id,kind:'text',editor,value:{runs:[{text:node.text}],style:'Text',size:node.fontSize,align:node.align,color:assetColor(node.color)}}];
    if(node.kind==='button'||node.kind==='badge')return primitives({id,kind:'cta',editor:{...editor,appearance:{...appearance,...(node.kind==='badge'?{radius:node.h/2}:{})}},label:node.text.slice(0,100)||'Learn more',href:'#asset',color:assetColor(node.color),...(node.icon!=='none'?{leadingIcon:node.icon}:{})},node.kind==='badge');
    if(node.kind==='icon')return [{id,kind:'shape',shape:'rectangle',...(node.icon!=='none'?{icon:node.icon}:{}),filled:node.icon==='play',editor:{...editor,appearance:{fill:assetColor(node.color)}}}];
    if(node.kind==='rule')return [{id,kind:'divider',editor:{...editor,y:node.y-12,height:24,appearance:{}}}];
    return [{id,kind:'shape',shape:'rectangle',editor:{...editor,appearance:{...appearance,borderWidth:.5,borderColor:assetColor('border'),shadow:'soft'}}}];
  });
  return htmlEditorSchema.parse({version:1,pages:[{id:'asset-page',name:asset.title,sections:[{id:'asset-board',name:'Canvas',background:'transparent',padding:0,gap:0,blockGap:0,minHeight:assetDimensions(asset).height,columns:[blocks.map(block=>upgradeBadge(block,asset.reference.src))]}]}]});
}
export function previewDocument(editor:HtmlEditorState,prefix:string):HtmlEditorState {
  return {...editor,pages:editor.pages.map(page=>({...page,id:`${prefix}-${page.id}`,sections:page.sections.map(section=>({...section,id:`${prefix}-${section.id}`,columns:section.columns.map(column=>column.map(block=>({...block,id:`${prefix}-${block.id}`})))}))}))};
}
