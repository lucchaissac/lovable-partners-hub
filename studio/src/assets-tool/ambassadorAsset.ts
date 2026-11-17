import {ambassadorDefaultFormat,ambassadorDefaultTemplate,ambassadorFormats,ambassadorPreview} from '../../../src/ambassadors/catalog.js';
import {defaultAmbassador,type AmbassadorSettings} from './ambassadorSettings';
import {makeNode,type AssetDocument} from './model';
import {createCommunityLayers} from './communityLayers';
import {communityBlocks} from './communityDocument';
export {renderAmbassador} from '../../../src/ambassadors/render.js';

export async function ambassadorAsset(formatId=ambassadorDefaultFormat,personalization?:AmbassadorSettings):Promise<AssetDocument>{
 const squareEvent=formatId===ambassadorDefaultFormat;
 const format=squareEvent?ambassadorDefaultTemplate:ambassadorFormats.find(f=>f.id===formatId);if(!format)throw Error('This community format could not be found.');
 const settings={...(personalization??defaultAmbassador()),format:(squareEvent?ambassadorDefaultTemplate.source:format.id) as AmbassadorSettings['format']};
 const preview=await fetch(ambassadorPreview(format.id));if(!preview.ok)throw Error('The community template could not load.');
 const blob=await preview.blob(),src=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});
 const reference=new Image();reference.src=src;await reference.decode();
 const {blocks,bindings}=await createCommunityLayers(settings,squareEvent);
 return {version:1,id:crypto.randomUUID(),title:`${format.name} · ${settings.city||'Community'}`,format:format.width===format.height?'square':format.width>format.height?'landscape':'portrait',dimensions:{width:format.width,height:format.height},background:'ink',grid:false,updatedAt:Date.now(),reference:{name:format.name,src,width:reference.naturalWidth,height:reference.naturalHeight},community:{settings,bindings},nodes:[makeNode('image',{x:0,y:0,w:Math.min(format.width,1350),h:Math.min(format.height,1350)})],editor:{version:1,pages:[{id:'asset-page',name:format.name,sections:[{id:'asset-board',name:'Canvas',background:'transparent',padding:0,gap:0,blockGap:0,minHeight:format.height,columns:[blocks]}]}]}};
}

// Upgrade earlier flattened Community documents without discarding their content or canvas placement.
export async function migrateCommunityAsset(asset:AssetDocument):Promise<AssetDocument>{
 const legacy=communityBlocks(asset).filter(block=>!block.ambassadorElement);if(!legacy.length)return asset;
 let next=structuredClone(asset);
 for(const block of legacy){
  const format=ambassadorFormats.find(format=>format.id===block.ambassador.format)!;
  const {blocks,bindings}=await createCommunityLayers(block.ambassador);
  const sx=(block.editor?.widthPx??format.width)/format.width,sy=(block.editor?.height??format.height)/format.height,angle=(block.editor?.rotation??0)*Math.PI/180;
  const originX=block.editor?.x??0,originY=block.editor?.y??0,cx=format.width*sx/2,cy=format.height*sy/2;
  const placed=blocks.map(layer=>{const frame=layer.editor!,width=frame.widthPx!*sx,height=frame.height!*sy,dx=frame.x!*sx+width/2-cx,dy=frame.y!*sy+height/2-cy;return {...layer,editor:{...frame,x:originX+cx+dx*Math.cos(angle)-dy*Math.sin(angle)-width/2,y:originY+cy+dx*Math.sin(angle)+dy*Math.cos(angle)-height/2,widthPx:width,height,rotation:(frame.rotation??0)+(block.editor?.rotation??0),appearance:{...frame.appearance,...(layer.kind==='text'?{fontSize:frame.appearance!.fontSize!*sx,letterSpacing:frame.appearance!.letterSpacing!*sx}:{})}}};});
  for(const page of next.editor!.pages)for(const section of page.sections)section.columns=section.columns.map(column=>column.flatMap(item=>item.id===block.id?placed:[item]));
  next.community??={settings:block.ambassador,bindings};
 }
 return next;
}
