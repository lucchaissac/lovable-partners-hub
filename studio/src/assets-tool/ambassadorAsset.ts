import {ambassadorFormats,ambassadorPreview} from '../../../src/ambassadors/catalog.js';
import {renderAmbassador} from '../../../src/ambassadors/render.js';
import {defaultAmbassador,type AmbassadorSettings} from './ambassadorSettings';
import {makeNode,type AssetDocument} from './model';
import type {HtmlBlock} from '../studio/htmlEditorModel';
export {renderAmbassador};
// New library insertions start from the prepared default image. Edits render from the original template.
export async function createAmbassadorBlock(settings:AmbassadorSettings):Promise<Extract<HtmlBlock,{kind:'image'}>>{
 const preview=await fetch(ambassadorPreview(settings.format));if(!preview.ok)throw Error('The community template could not load. Please try again.');
 const src=await new Promise<string>(async(resolve,reject)=>{try{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(await preview.blob());}catch(error){reject(error);}}),format=ambassadorFormats.find(f=>f.id===settings.format)!;
 const image={src,width:format.width,height:format.height},scale=Math.min(480/image.width,420/image.height);
 return {id:crypto.randomUUID(),kind:'image',ambassador:settings,value:{src:image.src,alt:ambassadorFormats.find(f=>f.id===settings.format)!.name,caption:'',alignment:'center',width:100},editor:{widthPx:image.width*scale,height:image.height*scale,appearance:{imageFit:'contain'}}};
}
export async function ambassadorAsset(formatId='social'):Promise<AssetDocument>{
 const format=ambassadorFormats.find(f=>f.id===formatId);if(!format)throw Error('This community format could not be found.');
 const block=await createAmbassadorBlock(defaultAmbassador(format.id as AmbassadorSettings['format']));
 block.editor={...block.editor,position:'absolute',x:0,y:0,widthPx:format.width,height:format.height};
 return {version:1,id:crypto.randomUUID(),title:`${format.name} · Paris`,format:format.width===format.height?'square':format.width>format.height?'landscape':'portrait',dimensions:{width:format.width,height:format.height},background:'ink',grid:false,updatedAt:Date.now(),reference:{name:format.name,src:block.value.src,width:format.width,height:format.height},nodes:[makeNode('image',{x:0,y:0,w:Math.min(format.width,1350),h:Math.min(format.height,1350)})],editor:{version:1,pages:[{id:'asset-page',name:format.name,sections:[{id:'asset-board',name:'Canvas',background:'transparent',padding:0,gap:0,blockGap:0,minHeight:format.height,columns:[[block]]}]}]}};
}
