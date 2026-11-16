import {ambassadorFormats,ambassadorPreview} from '../../../src/ambassadors/catalog.js';
import {renderAmbassador} from '../../../src/ambassadors/render.js';
import {defaultAmbassador,type AmbassadorSettings} from './ambassadorSettings';
import {makeNode,type AssetDocument} from './model';
import {editCommunityBlock} from './communityDocument';
import type {HtmlBlock} from '../studio/htmlEditorModel';
export {renderAmbassador};
export async function createAmbassadorBlock(settings:AmbassadorSettings):Promise<Extract<HtmlBlock,{kind:'image'}>>{
 const preview=await fetch(ambassadorPreview(settings.format));if(!preview.ok)throw Error('The community template could not load. Please try again.');
 const blob=await preview.blob();
 const src=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});
 const format=ambassadorFormats.find(f=>f.id===settings.format)!,scale=Math.min(480/format.width,420/format.height);
 const block={id:crypto.randomUUID(),kind:'image' as const,ambassador:settings,value:{src,alt:format.name,caption:'',alignment:'center' as const,width:100},editor:{widthPx:format.width*scale,height:format.height*scale,appearance:{imageFit:'contain' as const}}};
 return JSON.stringify(settings)===JSON.stringify(defaultAmbassador(settings.format))?block:editCommunityBlock(block,settings);
}
export async function ambassadorAsset(formatId='social',personalization?:AmbassadorSettings):Promise<AssetDocument>{
 const format=ambassadorFormats.find(f=>f.id===formatId);if(!format)throw Error('This community format could not be found.');
 const settings={...(personalization??defaultAmbassador()),format:format.id as AmbassadorSettings['format']};
 const block=await createAmbassadorBlock(settings);
 block.editor={...block.editor,position:'absolute',x:0,y:0,widthPx:format.width,height:format.height};
 const reference=new Image();reference.src=block.value.src;await reference.decode();
 return {version:1,id:crypto.randomUUID(),title:`${format.name} · ${settings.city||'Community'}`,format:format.width===format.height?'square':format.width>format.height?'landscape':'portrait',dimensions:{width:format.width,height:format.height},background:'ink',grid:false,updatedAt:Date.now(),reference:{name:format.name,src:block.value.src,width:reference.naturalWidth,height:reference.naturalHeight},nodes:[makeNode('image',{x:0,y:0,w:Math.min(format.width,1350),h:Math.min(format.height,1350)})],editor:{version:1,pages:[{id:'asset-page',name:format.name,sections:[{id:'asset-board',name:'Canvas',background:'transparent',padding:0,gap:0,blockGap:0,minHeight:format.height,columns:[[block]]}]}]}};
}
