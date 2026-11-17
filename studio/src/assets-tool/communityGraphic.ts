import {communityGraphicDefaults} from '../../../shared/techArtwork.mjs';
import {communityContrast} from '../../../shared/communityContrast.mjs';
import {defaultAmbassador,type AmbassadorSettings} from './ambassadorSettings';
import {rasterLibraryAsset} from './badgeLibrary';
import {makeNode,type AssetDocument} from './model';
import type {HtmlBlock} from '../studio/htmlEditorModel';
import {techArtworkSchema} from './techArtworkSettings';
export const graphicEventFormat={id:'event-graphic',name:'Event · Graphic',width:1080,height:1080,detail:'1080 × 1080 px'};
export function applyCommunityContrast(asset:AssetDocument):AssetDocument{
 if(!asset.community||asset.community.autoContrast===false||!asset.editor)return asset;
 const next=structuredClone(asset),ink=communityContrast(asset.background).ink,logoId=next.community!.bindings.logo;
 for(const block of next.editor!.pages.flatMap(p=>p.sections.flatMap(s=>s.columns.flat()))){
  if(block.kind==='text'){block.value.color=ink;if(block.editor?.appearance?.fill)block.editor.appearance.fill=ink;}
  if(block.kind==='image'&&block.id===logoId)block.value.src=`/ambassadors/assets/lovable-community-${ink==='#1b1b1b'?'dark':'white'}.svg`;
  if(block.kind==='image'&&block.techArtwork)block.techArtwork={...block.techArtwork,color:ink};
 }
 return next;
}
export async function graphicEventAsset(personalization?:AmbassadorSettings):Promise<AssetDocument>{
 const settings={...(personalization??defaultAmbassador()),format:'social' as const};
 const text=(key:string,value:string,x:number,y:number,width:number,height:number,size:number,lineHeight=105,align:'left'|'right'='left'):HtmlBlock=>({id:`graphic-${key}-${crypto.randomUUID()}`,kind:'text',value:{runs:[{text:value}],style:'Text',size,align,color:'#ffffff'},editor:{position:'absolute',x,y,widthPx:width,height,appearance:{fontFamily:'Camera Plain',fontSize:size,fontWeight:700,lineHeight,letterSpacing:-size*.025}}});
 const title=settings.title||'Build something\nlovable.';
 const layers:Record<string,HtmlBlock>={
  logo:{id:`graphic-logo-${crypto.randomUUID()}`,kind:'image',value:{src:'/ambassadors/assets/lovable-community-white.svg',alt:'Lovable Community',caption:'',alignment:'center',width:100},editor:{position:'absolute',x:43.2,y:43.2,widthPx:407.025,height:40.003,appearance:{imageFit:'contain'}}},
  city:text('city',settings.city,816.8,36.9,220,48,36.675,130.88,'right'),
  title:text('title',title,43.2,166,993.6,250,128,94),
  motif:{id:`graphic-motif-${crypto.randomUUID()}`,kind:'image',techArtwork:techArtworkSchema.parse(communityGraphicDefaults),value:{src:'/ambassadors/graphic-motif.svg',alt:'Event graphic',caption:'',alignment:'center',width:100},editor:{position:'absolute',x:0,y:441,widthPx:1080,height:475.2,appearance:{imageFit:'contain'}}},
  date:text('date',settings.date||'Date à préciser',540,958,235,79,32.4,112),
  venue:text('venue',settings.venue||'Lieu à préciser',800,958,236.8,79,32.4,112),
 };
 const reference=await rasterLibraryAsset({id:'graphic',name:'Event · Graphic',src:'/ambassadors/graphic-motif.svg'});
 const asset:AssetDocument={version:1,id:crypto.randomUUID(),title:`Event · Graphic · ${settings.city||'Community'}`,format:'square',dimensions:{width:1080,height:1080},background:'#ff6d1b',grid:false,updatedAt:Date.now(),reference,nodes:[makeNode('image',{x:0,y:441,w:1080,h:475.2})],community:{settings,bindings:Object.fromEntries(Object.entries(layers).map(([key,b])=>[key,b.id])),layout:'graphic',autoContrast:true},editor:{version:1,pages:[{id:'asset-page',name:'Event · Graphic',sections:[{id:'asset-board',name:'Canvas',background:'transparent',padding:0,gap:0,blockGap:0,minHeight:1080,columns:[Object.values(layers)]}]}]}};
 return applyCommunityContrast(asset);
}
