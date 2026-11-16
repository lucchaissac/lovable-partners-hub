import {z} from 'zod';
import {chatPlanSchema,chatRequestSchema,validateChatPlan} from '../../../shared/communityChat.mjs';
import {COMMUNITY_MARKUP,COMMUNITY_VIEWBOX} from '../../../src/ambassadors/source/brand.mjs';
import {renderAmbassador} from '../../../src/ambassadors/render.js';
import {defaultAmbassador} from './ambassadorSettings';
import {assetDimensions,assetSchema,makeNode,type AssetDocument} from './model';
import {nativeDocument} from './nativeDocument';
import {htmlEditorSchema,type HtmlBlock,type HtmlEditorState,type HtmlIconName} from '../studio/htmlEditorModel';
import type {StudioSource} from '../studio/sources';

export type ChatPlan=z.infer<typeof chatPlanSchema>;
type ChatElement=ChatPlan['edits'][number];
export const localCommunityChatAvailable=import.meta.env.DEV&&['localhost','127.0.0.1','[::1]'].includes(window.location.hostname);
export async function localChatStatus(signal?:AbortSignal):Promise<{enabled:boolean;reason?:string}>{
 if(!localCommunityChatAvailable)return {enabled:false};
 try{const response=await fetch('/api/community-chat',{signal});if(!response.ok)return {enabled:false,reason:'The local chat is unavailable.'};return await response.json();}catch{return {enabled:false,reason:'The local chat is unavailable.'};}
}
const blocksOf=(editor:HtmlEditorState)=>editor.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat()));
export function localChatRequest(document:AssetDocument,prompt:string,sources:StudioSource[],context?:string,preview?:string){
 const {width,height}=assetDimensions(document);
 return chatRequestSchema.parse({prompt,title:document.title,width,height,context,preview,
  blocks:blocksOf(nativeDocument(document)).map(block=>({id:block.id,kind:block.kind,frame:block.editor,...(block.kind==='text'?{text:block.value.runs.map(run=>run.text).join(''),style:block.value}:{}),...(block.kind==='image'?{alt:block.value.alt,asset:block.ambassadorElement??(block.value.alt==='Lovable Community'?'community-logo':'image')}:{}),...(block.kind==='shape'?{asset:block.icon??block.shape}: {})})),
  conversation:(document.messages??[]).slice(-16).map(message=>({user:message.user,text:message.text.slice(0,8000)})),
  sources:sources.map((source,index)=>({id:`attachment-${index}`,name:source.name,kind:source.kind,...(source.kind==='image'?{image:source.image}:{text:source.kind==='link'?`${source.url}\n${source.text}`.slice(0,20000):source.encoding?'Compressed HTML attachment omitted; use an image or plain text reference.':source.text.slice(0,20000)})})),
 });
}
export async function requestLocalDesign(request:ReturnType<typeof localChatRequest>,signal:AbortSignal):Promise<ChatPlan>{
 if(!localCommunityChatAvailable)throw Error('Chat is available in the local Community demo only.');
 const response=await fetch('/api/community-chat',{method:'POST',signal,headers:{'Content-Type':'application/json','X-Lovable-Local':'1'},body:JSON.stringify(request)});
 const value=await response.json();if(!response.ok)throw Error(value.error||'Could not create this design.');return validateChatPlan(value,request);
}
const frameOf=(frame:NonNullable<ChatElement['frame']>)=>({position:'absolute' as const,x:frame.x,y:frame.y,widthPx:frame.width,height:frame.height,rotation:frame.rotation,opacity:frame.opacity});
const brandSvg=(heart:boolean,dark:boolean)=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${heart?'0 12.3906 35.0398 35.6303':COMMUNITY_VIEWBOX}">${dark?COMMUNITY_MARKUP.replaceAll('#F7F4ED','#1b1b1b'):COMMUNITY_MARKUP}</svg>`)}`;
async function brandImage(heart:boolean,dark:boolean,width:number){
 const image=new Image();image.src=brandSvg(heart,dark);await image.decode();
 const canvas=document.createElement('canvas');canvas.width=Math.min(2400,Math.max(960,Math.ceil(width*2)));canvas.height=Math.round(canvas.width*(heart?35.6303/35.0398:46.1959/470.029));
 canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png');
}
function sentenceCase(text:string){return /[a-zà-ÿ]/.test(text)||!/[A-Z]/.test(text)?text:text.charAt(0)+text.slice(1).toLowerCase();}
function fitText(text:string,size:number,width:number,height:number,leading:number,weight:number){
 const ctx=document.createElement('canvas').getContext('2d')!;
 while(size>12){ctx.font=`${weight} ${size}px "Camera Plain"`;let lines=0,tooWide=false;
  for(const paragraph of text.split('\n')){let line='';lines++;for(const word of paragraph.split(/\s+/)){if(ctx.measureText(word).width>width)tooWide=true;const next=line?`${line} ${word}`:word;if(line&&ctx.measureText(next).width>width){lines++;line=word;}else line=next;}}
  if(!tooWide&&lines*size*leading/100<=height+.1)return size;size-=1;
 }return size;
}
async function nativeElement(spec:ChatElement,existing:Map<string,HtmlBlock>,images:Map<string,string>,signal:AbortSignal):Promise<HtmlBlock>{
 signal.throwIfAborted();const old=existing.get(spec.id);
 if(spec.kind==='reuse'){
  const source=existing.get(spec.sourceId);if(!source)throw Error('The selected element no longer exists.');
  return {...structuredClone(source),id:spec.id,editor:{...source.editor,...(spec.frame?frameOf(spec.frame):{})}} as HtmlBlock;
 }
 const editor=frameOf(spec.frame);
 if(spec.kind==='text'){
  const text=sentenceCase(spec.text),fontSize=fitText(text,spec.fontSize,spec.frame.width,spec.frame.height,spec.lineHeight,spec.weight);
  return {id:spec.id,kind:'text',value:{runs:[{text}],style:'Text',size:fontSize,align:spec.align,color:spec.color},editor:{...old?.editor,...editor,appearance:{fontFamily:'Camera Plain',fontSize,fontWeight:spec.weight,lineHeight:spec.lineHeight,letterSpacing:0}}};
 }
 if(spec.kind==='shape')return {id:spec.id,kind:'shape',shape:spec.shape,editor:{...editor,appearance:{fill:spec.fill,background:spec.fill,borderColor:spec.stroke,borderWidth:spec.strokeWidth,radius:spec.radius,lineStyle:'solid',lineWidth:Math.max(1,spec.strokeWidth)}}};
 if(spec.kind==='icon')return {id:spec.id,kind:'shape',shape:'rectangle',icon:spec.name as HtmlIconName,filled:spec.filled,editor:{...editor,appearance:{fill:spec.color}}};
 let src='',alt='',ambassador:ReturnType<typeof defaultAmbassador>|undefined,ambassadorElement:'globe'|undefined,fit:'contain'|'cover'='contain',radius=0;
 if(spec.kind==='image'){
  const source=existing.get(spec.sourceId);src=images.get(spec.sourceId)??(source?.kind==='image'?source.value.src:'');alt=source?.kind==='image'?source.value.alt:'Attached image';fit=spec.fit;radius=spec.radius;
  if(!src)throw Error('The requested image is no longer available.');
 }else{
  alt=spec.asset;
  if(spec.asset==='community-logo'||spec.asset==='heart')src=await brandImage(spec.asset==='heart',spec.color==='dark',spec.frame.width);
  if(spec.asset==='community-photo'){src='/ambassadors/community-montreal-1600.webp';fit='cover';}
  if(spec.asset==='gradient')src='/ambassadors/assets/heart-overlay.png';
  if(spec.asset==='globe'){ambassador={...defaultAmbassador(),city:spec.city||'Paris'};ambassadorElement='globe';src=(await renderAmbassador(ambassador,{element:'globe',pixels:1600,signal})).src;}
 }
 return {id:spec.id,kind:'image',...(ambassador?{ambassador,ambassadorElement}:{}),value:{src,alt,caption:'',alignment:'center',width:100},editor:{...editor,appearance:{imageFit:fit,radius}}};
}
export async function materializeLocalPlan(plan:ChatPlan,base:AssetDocument,sources:StudioSource[],signal:AbortSignal):Promise<AssetDocument[]>{
 await document.fonts.ready;
 const existing=new Map(blocksOf(nativeDocument(base)).map(block=>[block.id,block])),images=new Map(sources.flatMap((s,i)=>s.kind==='image'?[[`attachment-${i}`,s.image] as const]:[]));
 if(!plan.designs.length){
  const editor=structuredClone(nativeDocument(base));
  for(const id of [...plan.removeIds,...plan.edits.map(e=>e.id)])if(existing.get(id)?.editor?.locked)throw Error('Unlock the selected element before editing it with chat.');
  const edits=new Map<string,HtmlBlock>();for(const spec of plan.edits)edits.set(spec.id,await nativeElement(spec,existing,images,signal));
  for(const page of editor.pages)for(const section of page.sections)section.columns=section.columns.map(column=>column.flatMap(block=>{if(plan.removeIds.includes(block.id))return [];const edited=edits.get(block.id);if(edited){edits.delete(block.id);return [edited];}return [block];}));
  editor.pages[0].sections[0].columns[0].push(...edits.values());signal.throwIfAborted();
  return [assetSchema.parse({...base,editor:htmlEditorSchema.parse(editor),updatedAt:Date.now()})];
 }
 const results:AssetDocument[]=[];
 for(const design of plan.designs){
  const blocks:HtmlBlock[]=[];for(const spec of design.elements)blocks.push(await nativeElement(spec,existing,images,signal));signal.throwIfAborted();
  const format=design.width===design.height?'square':design.width>design.height?'landscape':'portrait';
  results.push(assetSchema.parse({...base,id:crypto.randomUUID(),title:sentenceCase(design.title),format,dimensions:{width:design.width,height:design.height},background:design.background,grid:false,community:undefined,series:undefined,layouts:undefined,updatedAt:Date.now(),nodes:[makeNode('image',{x:0,y:0,w:100,h:100})],editor:{version:1,pages:[{id:'asset-page',name:design.title,sections:[{id:'asset-board',name:'Canvas',background:'transparent',padding:0,gap:0,blockGap:0,minHeight:design.height,columns:[blocks]}]}]}}));
 }
 if(results.length>1){const series=results.map(asset=>({id:asset.id,title:asset.title}));for(const result of results)result.series=series;}
 return results;
}
