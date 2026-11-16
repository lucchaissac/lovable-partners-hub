import {COMMUNITY_MARKUP,COMMUNITY_VIEWBOX} from '../../../src/ambassadors/source/brand.mjs';
import {renderAmbassador} from './ambassadorAsset';
import {defaultAmbassador} from './ambassadorSettings';
import type {HtmlBlock} from '../studio/htmlEditorModel';

const svg=(viewBox:string,markup:string)=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${markup}</svg>`)}`;
export const communityElements=[
 {id:'globe',name:'Globe',src:'/ambassadors/previews/globe.webp'},
 {id:'community-logo',name:'Community logo',src:svg(COMMUNITY_VIEWBOX,COMMUNITY_MARKUP)},
 {id:'community-heart',name:'Heart',src:svg('0 12.3906 35.0398 35.6303',COMMUNITY_MARKUP)},
];
export async function createCommunityElement(id:string):Promise<Extract<HtmlBlock,{kind:'image'}>>{
 const item=communityElements.find(item=>item.id===id);if(!item)throw Error('This element could not be found.');
 const settings=defaultAmbassador();let src:string,width:number,height:number;
 if(id==='globe'){
  const image=await renderAmbassador(settings,{element:'globe',pixels:1080});src=image.src;width=height=400;
 }else{
  const image=new Image();image.src=item.src;await image.decode();
  width=id==='community-logo'?480:120;height=id==='community-logo'?480*46.1959/470.029:120*35.6303/35.0398;
  const canvas=document.createElement('canvas');canvas.width=Math.round(width*2);canvas.height=Math.round(height*2);
  canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);src=canvas.toDataURL('image/png');
 }
 return {id:crypto.randomUUID(),kind:'image',...(id==='globe'?{ambassador:settings,ambassadorElement:'globe' as const}:{}),value:{src,alt:item.name,caption:'',alignment:'center',width:100},editor:{widthPx:width,height,appearance:{imageFit:'contain'}}};
}
