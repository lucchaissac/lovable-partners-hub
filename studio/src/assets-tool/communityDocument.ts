import type {AssetDocument} from './model';
import type {HtmlBlock} from '../studio/htmlEditorModel';
import type {AmbassadorSettings} from './ambassadorSettings';
import {emptyPortrait} from '../../../src/ambassadors/portrait.js';

export type CommunityBlock = Extract<HtmlBlock,{kind:'image'}> & {ambassador:AmbassadorSettings};
export const communityBlocks = (asset?:AssetDocument):CommunityBlock[] =>
  (asset?.editor?.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat()))??[])
    .filter((block):block is CommunityBlock=>block.kind==='image'&&!!block.ambassador);
export const communityTemplate = (asset?:AssetDocument) => communityBlocks(asset).find(block=>!block.ambassadorElement);
export const needsCommunityRender = (block:CommunityBlock) => !!block.ambassadorRender && block.ambassadorRender.revision!==block.ambassadorRender.rendered;

// Persist text immediately. Rendering is a separate, replaceable job, never owned by the inspector.
export function editCommunityBlock(block:CommunityBlock,settings:AmbassadorSettings):CommunityBlock {
  return {...block,ambassador:settings,ambassadorRender:{revision:crypto.randomUUID(),rendered:block.ambassadorRender?.rendered??''}};
}
export function applyCommunityRender(asset:AssetDocument,documentId:string,blockId:string,revision:string,src:string):AssetDocument {
  const block=communityBlocks(asset).find(block=>block.id===blockId);
  // A late result must not overwrite a newer edit, undo, deletion, or another document.
  if(asset.id!==documentId||!block||block.ambassadorRender?.revision!==revision)return asset;
  return {...asset,editor:{...asset.editor!,pages:asset.editor!.pages.map(page=>({...page,sections:page.sections.map(section=>({...section,columns:section.columns.map(column=>column.map(item=>item.id!==blockId?item:{...block,value:{...block.value,src},ambassadorRender:{revision,rendered:revision}}))}))}))}};
}

export const communitySettings=(asset?:AssetDocument):AmbassadorSettings|undefined=>asset?.community?.settings??communityTemplate(asset)?.ambassador;
export function syncCommunityDocument(asset:AssetDocument,previous?:AssetDocument):AssetDocument{
 if(!asset.community||!asset.editor)return asset;
 const next=structuredClone(asset),community=next.community!,settings=community.settings,bindings=community.bindings;
 const blocks=next.editor!.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat()));
 const byKey=(key:string)=>blocks.find(block=>block.id===bindings[key]);
 const previousBlocks=previous?.editor?.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat()))??[];
 for(const block of blocks){
  const old=previousBlocks.find(old=>old.id===block.id);
  if(block.kind==='text'&&old?.kind==='text'&&block.value.size!==old.value.size)block.editor={...block.editor,appearance:{...block.editor?.appearance,fontSize:block.value.size}};
 }
 const photo=(key:string)=>{const block=byKey(key);return block?.kind==='image'&&/^data:image\/(png|jpeg|webp);base64,/.test(block.value.src)?(block.value.src===emptyPortrait?'':block.value.src):undefined;};
 const portrait=photo('photo');if(portrait!==undefined)settings.photo=portrait;
 for(let i=0;i<settings.count;i++){const portrait=photo(`photo-${i}`);if(portrait!==undefined)settings.speakers[i].photo=portrait;}

 const limits={city:45,url:300,headline:120,intro:100,cta:70,title:90,date:48,venue:65,eventFooter:90,name:48,role:55};
 for(const [key,limit] of Object.entries(limits)){const block=byKey(key);if(block?.kind==='text')(settings as unknown as Record<string,unknown>)[key]=block.value.runs.map(run=>run.text).join('').slice(0,limit);}
 const details=byKey('event-details');if(details?.kind==='text'){const text=details.value.runs.map(run=>run.text).join('');if(text!==[settings.date,settings.venue].filter(Boolean).join('  ·  ')){settings.date=text.slice(0,48);settings.venue='';}}
 for(let i=0;i<settings.count;i++)for(const key of ['name','role'] as const){const block=byKey(`speaker-${key}-${i}`);if(block?.kind==='text')settings.speakers[i][key]=block.value.runs.map(run=>run.text).join('').slice(0,key==='name'?48:55);}
 // The city label and the globe are independent canvas objects.
 const qr=byKey('url');if(qr?.kind==='image'&&qr.ambassador)settings.url=qr.ambassador.url;
 return next;
}
