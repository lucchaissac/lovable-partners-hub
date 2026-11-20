import {screenRequestSchema,validateScreenPlan,screenImportPlanSchema,screenEditPlanSchema} from '../../../shared/screenImport.mjs';
import {type AssetDocument,type AssetReference} from './model';
import {visionReference} from './media';
import {materializeScreenComponent,screenEditRequest,applyScreenEdits} from './screenComponent';
import type {z} from 'zod';

async function requestPlan(request:z.infer<typeof screenRequestSchema>,signal:AbortSignal){
 const response=await fetch('/api/screen-import',{method:'POST',signal,headers:{'Content-Type':'application/json','X-Lovable-Local':'1'},body:JSON.stringify(request)});
 const result=await response.json().catch(()=>({error:'The local importer did not return a readable response.'}));signal.throwIfAborted();
 if(!response.ok||result.error)throw Error(result.error||'The screen could not be imported.');
 return validateScreenPlan(result.plan,request);
}
export async function importEditableScreen(asset:AssetDocument,reference:AssetReference,signal:AbortSignal){
 const preview=await visionReference(reference);signal.throwIfAborted();
 const request=screenRequestSchema.parse({mode:'import',prompt:'Rebuild this screenshot as a lightweight editable interface component. Preserve its content and composition.',image:preview.src,width:reference.width,height:reference.height});
 const plan=screenImportPlanSchema.parse(await requestPlan(request,signal));
 return {asset:materializeScreenComponent(asset,reference,plan),summary:plan.summary};
}
export async function editImportedScreen(asset:AssetDocument,prompt:string,context:string|undefined,signal:AbortSignal){
 const request=screenEditRequest(asset,prompt,context),plan=screenEditPlanSchema.parse(await requestPlan(request,signal));
 return {asset:applyScreenEdits(asset,plan),summary:plan.summary};
}
