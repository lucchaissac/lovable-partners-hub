import {webPageSnapshotSchema} from '../../../shared/webPageImport.mjs';
import {assetDimensions,assetSchema,type AssetDocument} from './model';
import {nativeDocument} from './nativeDocument';
import type {HtmlBlock} from '../studio/htmlEditorModel';
import type {z} from 'zod';

/** Map actual DOM measurements into native editor elements without an AI reconstruction. */
export function materializeWebPage(asset:AssetDocument,input:z.infer<typeof webPageSnapshotSchema>):AssetDocument{
 const source=webPageSnapshotSchema.parse(input),next=structuredClone(asset),size=assetDimensions(asset);
 const scale=Math.min(size.width*.86/source.width,size.height*.73/source.height);
 const left=(size.width-source.width*scale)/2,top=(size.height*.83-source.height*scale)/2;
 const layers:HtmlBlock[]=source.layers.map(layer=>{
  const editor={position:'absolute' as const,x:left+layer.x*scale,y:top+layer.y*scale,widthPx:Math.max(1,layer.width*scale),height:Math.max(1,layer.height*scale),groupId:'screen-component',groupScale:1,appearance:{radius:(layer.radius??0)*scale,opacity:layer.opacity??100,borderWidth:Math.min(24,(layer.borderWidth??0)*scale),borderColor:layer.borderColor??'transparent'}};
  const id=`screen-ui-${layer.id}`;
  if(layer.kind==='text'){
   const desiredSize=Math.max(1,(layer.fontSize??16)*scale),fontWeight=Math.max(600,layer.fontWeight??600),letterSpacing=(layer.letterSpacing??0)*scale;
   // Camera Plain has different metrics from source fonts. Keep the browser's
   // explicit wraps and original line pitch without overflowing adjacent text.
   const measure=typeof document==='undefined'?null:document.createElement('canvas').getContext('2d');
   if(measure)measure.font=`${fontWeight} ${desiredSize}px "Camera Plain"`;
   const widest=measure?Math.max(...layer.text!.split('\n').map(line=>measure.measureText(line).width+Math.max(0,line.length-1)*letterSpacing)):0;
   const fit=widest?Math.min(1,Math.max(.5,(editor.widthPx-.5)/widest)):1,fontSize=Math.max(1,desiredSize*fit);
   return {id,kind:'text',value:{runs:[{text:layer.text!}],style:'Text',size:fontSize,align:layer.align??'left',color:layer.color??'#1b1b1b'},editor:{...editor,appearance:{...editor.appearance,fontFamily:'Camera Plain',fontSize,fontWeight,lineHeight:Math.min(300,(layer.lineHeight??125)/fit),letterSpacing:letterSpacing*fit}}};
  }
  if(layer.kind==='image')return {id,kind:'image',value:{src:layer.src!,alt:layer.alt??'Imported page visual',caption:'',alignment:'center',width:100},editor:{...editor,appearance:{...editor.appearance,imageFit:'contain'}}};
  return {id,kind:'shape',shape:'rectangle',editor:{...editor,appearance:{...editor.appearance,fill:layer.fill??'transparent'}}};
 });
 next.editor=nativeDocument(next);
 for(const page of next.editor.pages)for(const section of page.sections)section.columns=section.columns.map(column=>column.filter(block=>!block.id.startsWith('screen-ui-')&&block.id!=='screen-demo-image'));
 next.editor.pages[0].sections[0].columns[0].push(...layers);
 if(next.motion){
  next.motion.clips=next.motion.clips.map(clip=>clip.id==='screenCamera'?{...clip,group:true,blockIds:layers.map(layer=>layer.id)}:{...clip,blockIds:clip.blockIds.filter(id=>!id.startsWith('screen-ui-')&&id!=='screen-demo-image')}).filter(clip=>clip.blockIds.length);
  if(!next.motion.clips.length)next.motion=undefined;
 }
 next.reference={name:new URL(source.sourceUrl).hostname,src:source.preview,width:source.width,height:source.height};
 next.updatedAt=Date.now();delete next.layouts;
 return assetSchema.parse(next);
}

export async function importEditableWebPage(asset:AssetDocument,url:string,signal:AbortSignal){
 const response=await fetch('/api/web-page-import',{method:'POST',signal,headers:{'Content-Type':'application/json','X-Lovable-Local':'1'},body:JSON.stringify({url})});
 const result=await response.json().catch(()=>({error:'The page importer did not return a readable response.'}));signal.throwIfAborted();
 if(!response.ok||result.error)throw Error(result.error||'The web page could not be imported.');
 const snapshot=webPageSnapshotSchema.parse(result.snapshot);
 await document.fonts.ready;signal.throwIfAborted();
 return {asset:materializeWebPage(asset,snapshot),warnings:snapshot.warnings};
}
