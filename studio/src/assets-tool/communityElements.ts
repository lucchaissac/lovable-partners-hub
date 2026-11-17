import {communityGraphicDefaults} from '../../../shared/techArtwork.mjs';
import {techArtworkSchema} from './techArtworkSettings';
import {COMMUNITY_MARKUP,COMMUNITY_VIEWBOX} from '../../../src/ambassadors/source/brand.mjs';
import {renderAmbassador} from './ambassadorAsset';
import {defaultAmbassador} from './ambassadorSettings';
import type {HtmlBlock} from '../studio/htmlEditorModel';
import {communityMediaLibrary,communityMediaById} from '../../../shared/communityMediaLibrary.mjs';
import {communityMediaSource} from './communityMedia';

const svg=(viewBox:string,markup:string)=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${markup}</svg>`)}`;
export const communityElements=[
 {id:'graphic-motif',name:'Graphic motif',src:'/ambassadors/graphic-motif.svg',transparent:true},
 {id:'globe',name:'Globe',src:'/ambassadors/previews/globe.webp'},
 {id:'community-logo',name:'Community logo',src:svg(COMMUNITY_VIEWBOX,COMMUNITY_MARKUP),transparent:true},
 ...communityMediaLibrary.map(item=>({id:item.id,name:item.name,src:item.thumbnail,category:item.category,transparent:item.transparent})),
];
export async function createCommunityElement(id:string):Promise<Extract<HtmlBlock,{kind:'image'}>>{
 const item=communityElements.find(item=>item.id===id);if(!item)throw Error('This element could not be found.');
 const settings=defaultAmbassador();let src:string,width:number,height:number;
 if(id==='graphic-motif'){return {id:crypto.randomUUID(),kind:'image',techArtwork:techArtworkSchema.parse(communityGraphicDefaults),value:{src:item.src,alt:'Graphic motif',caption:'',alignment:'center',width:100},editor:{widthPx:1000,height:440,appearance:{imageFit:'contain'}}};}
 if(id==='globe'){
  const image=await renderAmbassador(settings,{element:'globe',pixels:1080});src=image.src;width=height=400;
 }else if(communityMediaById.has(id)){
  src=await communityMediaSource(id);
  const image=new Image();image.src=src;await image.decode();
  const scale=480/Math.max(image.naturalWidth,image.naturalHeight);width=image.naturalWidth*scale;height=image.naturalHeight*scale;
 }else{
  const image=new Image();image.src=item.src;await image.decode();
  width=480;height=480*46.1959/470.029;
  const canvas=document.createElement('canvas');canvas.width=Math.round(width*2);canvas.height=Math.round(height*2);
  canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);src=canvas.toDataURL('image/png');
 }
 return {id:crypto.randomUUID(),kind:'image',...(id==='globe'?{ambassador:settings,ambassadorElement:'globe' as const}:{}),value:{src,alt:item.name,caption:'',alignment:'center',width:100},editor:{widthPx:width,height,appearance:{imageFit:'contain'}}};
}
