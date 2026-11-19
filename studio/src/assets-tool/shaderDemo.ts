import { holidayAssets } from './holidayAsset';
import { linkAssetPages } from './assetSeries';
import { assetSchema } from './model';
import type { HtmlBlock } from '../studio/htmlEditorModel';
import { newShaderEffect } from '../shaders/settings';

/** A separate local collection; it never edits the approved campaign. */
export async function shaderDemoAssets(){
 const originals=await holidayAssets();
 const pages=originals.slice(0,3).map((original,index)=>{
  const page=structuredClone(original);page.title=['Chrome · Text','Glass · Image','Ripple · Video'][index];
  page.background='#1b1b1b';page.layouts=undefined;page.messages=[];page.animation=undefined;
  const section=page.editor!.pages[0].sections[0];
  let blocks=section.columns.flat().filter(block=>block.id!=='holiday-motif'&&block.id!=='holiday-date'&&block.id!=='holiday-location');
  blocks=blocks.flatMap((block):HtmlBlock[]=>{
   if(block.id==='holiday-gradient'){
    if(index===0)return [];
    const editor={position:'absolute' as const,x:0,y:0,widthPx:1092,height:615,appearance:{imageFit:'cover' as const,shader:newShaderEffect(index===1?'glass':'ripple')}};
    if(index===1)return [{id:'shader-image',kind:'image',value:{src:'/holiday/gradient.webp',alt:'Lovable gradient',caption:'',alignment:'center',width:100},editor}];
    return block.kind==='media'?[{...block,id:'shader-video',autoplay:true,mediaWindow:undefined,editor}]:[];
   }
   if(block.kind==='text'&&block.id==='holiday-title')return [{...block,value:{...block.value,runs:[{text:['Make\nmore.','See things\ndifferently.','Keep\nmoving.'][index]}],size:index===0?200:145},editor:{...block.editor,x:45,y:index===0?160:195,widthPx:990,height:370,appearance:{...block.editor?.appearance,fontSize:index===0?200:145,lineHeight:88,shader:index===0?{...newShaderEffect('chrome'),intensity:100}:undefined}}}];
   if(block.id==='holiday-cta')return [];
   return [block];
  });
  section.columns=[blocks];
  return assetSchema.parse(page);
 });
 return linkAssetPages(pages);
}
