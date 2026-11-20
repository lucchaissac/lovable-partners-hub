import {z} from 'zod';
import {screenImportPlanSchema,screenEditPlanSchema,screenRequestSchema,validateScreenPlan} from '../../../shared/screenImport.mjs';
import {assetDimensions,assetSchema,type AssetDocument,type AssetReference} from './model';
import type {HtmlBlock,HtmlIconName} from '../studio/htmlEditorModel';
import {motionBlocks,type NativeMotion} from './nativeMotion';
import {screenCameraMotion} from './screenDemoModel';
const prefix='screen-ui-',groupId='screen-component';
export const screenComponentBlocks=(asset:AssetDocument)=>motionBlocks(asset).filter(block=>block.id.startsWith(prefix));
export const hasScreenComponent=(asset:AssetDocument)=>screenComponentBlocks(asset).length>1;
type Plan=z.infer<typeof screenImportPlanSchema>;
type Edit=z.infer<typeof screenEditPlanSchema>;

export function materializeScreenComponent(asset:AssetDocument,reference:AssetReference,plan:Plan):AssetDocument{
 const next=structuredClone(asset),size=assetDimensions(next),scale=Math.min(size.width*.86/reference.width,size.height*.73/reference.height);
 const width=reference.width*scale,height=reference.height*scale,left=(size.width-width)/2,top=(size.height*.83-height)/2;
 const layers:HtmlBlock[]=plan.layers.map(layer=>{
  const id=prefix+layer.id,frame={position:'absolute' as const,x:left+layer.x/100*width,y:top+layer.y/100*height,widthPx:layer.width/100*width,height:layer.height/100*height,groupId,groupScale:1};
  if(layer.type==='text'){
   const fontSize=(layer.fontSize??1.4)/100*width;
   return {id,kind:'text',value:{runs:[{text:layer.text??''}],style:'Text',size:fontSize,align:layer.align??'left',color:layer.color??'#1b1b1b'},editor:{...frame,appearance:{fontFamily:'Camera Plain',fontWeight:layer.weight??600,fontSize,lineHeight:125,letterSpacing:0}}};
  }
  if(layer.type==='lovable-logo'||layer.type==='lovable-heart'){
   const dark=layer.color==='#1b1b1b'||layer.color==='#000000',src=layer.type==='lovable-logo'?`/brand/assets/lockup-${dark?'black':'white'}.svg`:`/brand/assets/logomark-${dark?'black':'white'}.svg`;
   return {id,kind:'image',value:{src,alt:'Original Lovable artwork',caption:'',alignment:'center',width:100},editor:{...frame,appearance:{imageFit:'contain',radius:0}}};
  }
  if(layer.type==='crop'&&layer.crop){
   const c=layer.crop;
   return {id,kind:'image',value:{src:reference.src,alt:layer.text??'Source visual',caption:'',alignment:'center',width:100,crop:{x:c.x/100*reference.width,y:c.y/100*reference.height,width:c.width/100*reference.width,height:c.height/100*reference.height,sourceWidth:reference.width,sourceHeight:reference.height}},editor:{...frame,appearance:{imageFit:'contain',radius:(layer.radius??0)/100*width}}};
  }
  return {id,kind:'shape',shape:'rectangle',...(layer.type==='icon'?{icon:(layer.icon==='more-horizontal'?'ellipsis':layer.icon) as HtmlIconName}:{}),editor:{...frame,appearance:{fill:layer.type==='icon'?layer.color??'#1b1b1b':layer.fill??'transparent',radius:(layer.radius??0)/100*width,...(layer.x===0&&layer.y===0&&layer.width===100&&layer.height===100?{radius:16,shadow:'strong' as const}:{})}}};
 });
 for(const page of next.editor!.pages)for(const section of page.sections)section.columns=section.columns.map(column=>column.filter(block=>block.id!=='screen-demo-image'&&!block.id.startsWith(prefix)));
 next.editor!.pages[0].sections[0].columns[0].push(...layers);
 const camera=screenCameraMotion(),previousCamera=asset.motion?.clips.find(clip=>clip.id==='screenCamera');
 if(previousCamera)camera.clips[0]=structuredClone(previousCamera);
 camera.clips[0].blockIds=layers.map(layer=>layer.id);camera.clips[0].group=true;
 const otherClips=(asset.motion?.clips??[]).filter(clip=>clip.id!=='screenCamera').map(clip=>({...clip,blockIds:clip.blockIds.filter(id=>!id.startsWith(prefix)&&id!=='screen-demo-image')})).filter(clip=>clip.blockIds.length);
 camera.clips.push(...otherClips);camera.duration=Math.max(camera.duration,asset.motion?.duration??0);
 if(asset.motion?.values)camera.values=Object.fromEntries(Object.entries(asset.motion.values).filter(([key])=>camera.clips.some(clip=>key.startsWith(clip.id+'.'))));
 next.motion=camera;next.reference=reference;next.updatedAt=Date.now();delete next.layouts;
 return assetSchema.parse(next);
}

export function screenEditRequest(asset:AssetDocument,prompt:string,context?:string){
 const blocks=screenComponentBlocks(asset);
 if(!blocks.length)throw Error('Import a screen to rebuild its editable layers first.');
 let selectedIds:string[]=[];try{if(context?.startsWith('HTML_SELECTION '))selectedIds=JSON.parse(context.slice(15)).blockIds??[];}catch{}
 if(selectedIds.length&&!selectedIds.some(id=>blocks.some(block=>block.id===id)))throw Error('Select a layer inside the imported component, or clear the selection.');
 return screenRequestSchema.parse({mode:'edit',prompt,selectedIds:selectedIds.filter(id=>blocks.some(block=>block.id===id)),blocks:blocks.map(block=>({id:block.id,kind:block.kind,text:block.kind==='text'?block.value.runs.map(run=>run.text).join(''):null,x:block.editor?.x??0,y:block.editor?.y??0,width:block.editor?.widthPx??0,height:block.editor?.height??0,fontSize:block.editor?.appearance?.fontSize??null,color:block.kind==='text'?block.value.color??null:null,fill:block.editor?.appearance?.fill??null,locked:!!block.editor?.locked}))});
}

export function applyScreenEdits(asset:AssetDocument,plan:Edit):AssetDocument{
 const next=structuredClone(asset);
 for(const block of screenComponentBlocks(next)){
  const edit=plan.edits.find(item=>item.id===block.id);if(!edit)continue;
  block.editor??={};block.editor.appearance??={};
  if(block.kind==='text'){
   if(edit.text!==null)block.value.runs=[{text:edit.text}];
   if(edit.color!==null)block.value.color=edit.color;
   if(edit.fontSize!==null){block.value.size=edit.fontSize;block.editor.appearance.fontSize=edit.fontSize;}
  }
  if(block.kind==='shape'&&edit.color!==null)block.editor.appearance.fill=edit.color;
  if(edit.fill!==null)block.editor.appearance.fill=edit.fill;
  if(edit.x!==null)block.editor.x=edit.x;
  if(edit.y!==null)block.editor.y=edit.y;
 }
 if(plan.clearMotion)next.motion=undefined;
 if(plan.motions.length){
  const motion:NativeMotion=next.motion??{version:1,duration:10,clips:[]};
  for(const [i,track] of plan.motions.entries()){
   // Replace only the requested per-layer track; the component camera is kept.
   motion.clips=motion.clips.filter(clip=>clip.group||!(clip.blockIds.length===1&&clip.blockIds[0]===track.id&&track.property in clip.props));
   const id=`screenEdit${Date.now()}_${i}`;
   motion.clips.push({id,label:`${track.id.slice(prefix.length)} · ${track.property}`,blockIds:[track.id],at:track.at,props:{[track.property]:{from:track.from,to:track.to,duration:track.duration,transition:{type:'easing',duration:track.duration,ease:[.4,0,.2,1]}}}});
   motion.duration=Math.max(motion.duration,track.at+track.duration);
  }
  next.motion=motion;
 }
 next.updatedAt=Date.now();return assetSchema.parse(next);
}
