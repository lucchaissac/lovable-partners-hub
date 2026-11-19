import {studioAnimationRequest,validateStudioAnimationPlan,compileStudioAnimation,validateStudioAnimationRevision,compileStudioAnimationRevision} from '../../../shared/studioAnimation.mjs';
import {assetDimensions,assetSchema,type AssetDocument} from './model';
import {nativeDocument} from './nativeDocument';

export async function animationChatStatus(signal?:AbortSignal):Promise<{enabled:boolean;reason?:string}>{
 try{const response=await fetch('/api/studio-animation',{signal});if(response.ok)return await response.json();}catch{}
 return {enabled:false,reason:'Animation chat is unavailable. Please retry later.'};
}
export function animationRequest(document:AssetDocument,prompt:string,workspace:string,context:string|undefined,availablePageSlots:number,sequence:AssetDocument[]=[]){
 const base={...document,dimensions:assetDimensions(document),editor:nativeDocument(document)};
 const blocks=base.editor.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat()));
 if(!blocks.length)throw Error('Add an object to this canvas before asking to animate it.');
 let selectedIds:string[]=[];
 if(context?.startsWith('HTML_SELECTION ')){
  let selection;try{selection=JSON.parse(context.slice(15));}catch{throw Error('Select the layers again before animating them.');}
  selectedIds=selection.blockIds??[];
  const sectionIds=selection.sectionIds??(selection.sectionId?[selection.sectionId]:[]);
  if(!selectedIds.length&&sectionIds.length)selectedIds=base.editor.pages.flatMap(page=>page.sections.filter(section=>sectionIds.includes(section.id)).flatMap(section=>section.columns.flat().map(block=>block.id)));
  if((selection.blockIds?.length||sectionIds.length)&&!selectedIds.length)throw Error('The selected layers are no longer on this canvas.');
 }
 const poses=sequence.map(page=>({...page,editor:nativeDocument(page)}));
 return {base,sequence:poses,payload:studioAnimationRequest(base,{prompt,workspace,selectedIds,availablePageSlots,sequence:poses})};
}
export async function planCanvasAnimation(prepared:ReturnType<typeof animationRequest>,signal:AbortSignal):Promise<{summary:string;poses:AssetDocument[];revision:boolean}>{
 const response=await fetch('/api/studio-animation',{method:'POST',signal,headers:{'Content-Type':'application/json','X-Lovable-Local':'1'},body:JSON.stringify(prepared.payload)});
 let result;try{result=await response.json();}catch{throw Error('The animation service did not return a plan. Please retry.');}
 signal.throwIfAborted();
 if(!response.ok||result.error)throw Error(result.error||'Could not plan this animation.');
 if(prepared.sequence.length>1){
  const plan=validateStudioAnimationRevision(result.plan,prepared.payload);
  const poses=plan.updates.length?compileStudioAnimationRevision(prepared.sequence,plan,prepared.payload).map((pose:unknown)=>assetSchema.parse(pose)):[];
  return {summary:plan.summary,poses,revision:true};
 }
 const plan=validateStudioAnimationPlan(result.plan,prepared.payload);
 const poses=compileStudioAnimation(prepared.base,plan,prepared.payload).map((pose:unknown)=>assetSchema.parse(pose));
 return {summary:plan.summary,poses,revision:false};
}
