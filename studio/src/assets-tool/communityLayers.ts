import type {HtmlBlock} from '../studio/htmlEditorModel';
import type {AmbassadorSettings} from './ambassadorSettings';
import {emptyPortrait} from '../../../src/ambassadors/portrait.js';
import {communityLayout,renderAmbassador} from '../../../src/ambassadors/render.js';
import {squareEventLayers} from '../../../shared/communityStarter.mjs';

export type CommunityLayer={kind:'text'|'logo'|'globe'|'glow'|'qr'|'portrait';key:string;x:number;y:number;w:number;h:number;rotation?:number;src?:string;text?:string;size?:number;leading?:number;weight?:string;tracking?:number;align?:'left'|'center'|'right'};

// The Spotlight kit uses canvas font metrics. Keep that same layout and its original coordinates.
function spotlightLayers(settings:AmbassadorSettings):CommunityLayer[]{
 const measure=document.createElement('canvas').getContext('2d')!,width=952;
 let size=96,lines:string[]=[];
 const wrap=()=>{measure.font=`700 ${size}px "Camera Plain"`;measure.letterSpacing=`${-size/100}px`;const result:string[]=[];let line='';for(const word of settings.name.split(/\s+/)){if(measure.measureText(word).width>width){if(line){result.push(line);line='';}for(const char of Array.from(word)){if(line&&measure.measureText(line+char).width>width){result.push(line);line='';}line+=char;}}else{const next=line?`${line} ${word}`:word;if(line&&measure.measureText(next).width>width){result.push(line);line=word;}else line=next;}}if(line)result.push(line);return result;};
 lines=wrap();while(lines.length>2&&size>24){size-=2;lines=wrap();}
 let citySize=60;measure.font=`500 ${citySize}px "Camera Plain"`;measure.letterSpacing=`${-citySize/100}px`;
 while(measure.measureText(settings.city).width>width&&citySize>18){citySize--;measure.font=`500 ${citySize}px "Camera Plain"`;measure.letterSpacing=`${-citySize/100}px`;}
 let typeSize=36;measure.font=`500 ${typeSize}px "Camera Plain"`;while(measure.measureText(settings.role).width>width&&typeSize>18){typeSize--;measure.font=`500 ${typeSize}px "Camera Plain"`;}
 const leading=size*1.05,cityHeight=citySize*1.1,typeHeight=settings.role?typeSize*1.1:0,typeTop=1016-typeHeight,cityTop=typeTop-(typeHeight?12:0)-cityHeight,nameTop=cityTop-16-lines.length*leading,avatarTop=nameTop-600;
 const angle=-9.91*Math.PI/180,dy=3699.1*.004;
 const text=(key:string,value:string,y:number,size:number,leading:number,weight='bold',tracking=-.01):CommunityLayer=>({kind:'text',key,text:value,x:64,y,w:952,h:Math.max(leading,value.split('\n').length*leading),size,leading,weight,tracking,align:'left'});
 return [
  {kind:'globe',key:'globe',x:258,y:-62,w:1404,h:1404},
  {kind:'glow',key:'glow',x:409.35-dy*Math.sin(angle)-3698.9/2,y:1354.45+dy*Math.cos(angle)-3699.1*1.008/2,w:3698.9,h:3699.1*1.008,rotation:-9.91},
  {kind:'logo',key:'logo',x:64,y:64,w:470.029,h:46.1959},
  text('name',lines.join('\n'),nameTop,size,leading),text('city',settings.city,cityTop,citySize,cityHeight,'medium'),text('role',settings.role,typeTop,typeSize,typeSize*1.1,'medium',0),
  {kind:'portrait',key:'photo',src:settings.photo,x:64,y:avatarTop,w:560,h:560},
 ];
}
export function communityLayerBlock(layer:CommunityLayer,settings:AmbassadorSettings,artwork:Record<string,string>):HtmlBlock{
 const id=`community-${layer.key}-${crypto.randomUUID()}`,editor={position:'absolute' as const,x:layer.x,y:layer.y,widthPx:layer.w,height:Math.max(12,layer.h),rotation:layer.rotation};
 if(layer.kind==='text')return {id,kind:'text',value:{runs:[{text:layer.text??''}],style:'Text',size:layer.size!,align:layer.align??'left',color:'#f7f4ed'},editor:{...editor,appearance:{fontFamily:'Camera Plain',fontSize:layer.size!,fontWeight:layer.weight==='bold'?700:layer.weight==='medium'?500:400,letterSpacing:(layer.tracking??0)*layer.size!,lineHeight:layer.leading!/layer.size!*100}}};
 const src=layer.kind==='logo'?'/ambassadors/assets/lovable-community.svg':layer.kind==='glow'?'/ambassadors/assets/heart-overlay.png':layer.kind==='portrait'?(layer.src||emptyPortrait):artwork[layer.kind];
 const element=layer.kind==='globe'?(settings.format==='spotlight'?'spotlight-globe' as const:'globe' as const):layer.kind==='qr'?'qr' as const:undefined;
 return {id,kind:'image',...(element?{ambassador:structuredClone(settings),ambassadorElement:element}:{}),value:{src,alt:layer.kind==='logo'?'Lovable Community':layer.kind==='globe'?'Globe':layer.kind==='glow'?'Gradient':layer.kind==='qr'?'Community QR':layer.key==='photo'?'Portrait':`Speaker ${Number(layer.key.slice(6))+1} portrait`,caption:'',alignment:'center',width:100},editor:{...editor,appearance:{imageFit:layer.kind==='portrait'?'cover':'contain',...(layer.kind==='portrait'?{radius:layer.w/2,background:'#1b1b1b'}:{})}}};
}
export async function createCommunityLayers(settings:AmbassadorSettings,squareEvent=false){
 await document.fonts.ready;
 const source:CommunityLayer[]=settings.format==='spotlight'?spotlightLayers(settings):await communityLayout(settings);
 const layers:CommunityLayer[]=squareEvent?squareEventLayers(source):source;
 const artwork:Record<string,string>={};
 for(const kind of ['globe','qr'] as const)if(layers.some(layer=>layer.kind===kind))artwork[kind]=(await renderAmbassador(settings,{element:kind==='globe'&&settings.format==='spotlight'?'spotlight-globe':kind,pixels:1600})).src;
 const blocks=layers.map(layer=>communityLayerBlock(layer,settings,artwork));
 return {blocks,bindings:Object.fromEntries(layers.map((layer,index)=>[layer.key,blocks[index].id]))};
}
