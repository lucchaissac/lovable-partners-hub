import {z} from 'zod';
import {communityTemplateInstructions} from './communityTemplatePrompt.mjs';
import {templatePlanSchema,compileTemplatePlan} from '../shared/communityTemplatePlan.mjs';
import {communityChatContext} from './communityChatContext.mjs';
import {blobBudgetStore,budgetConfig,createBudget,planReservation} from './communityBudget.mjs';
import {prepareCommunityMedia,communityImageModel} from './communityImageTools.mjs';

export const communityOpenAIModel='gpt-5.4-mini-2026-03-17';
const missingKey='The OpenAI demo key is not configured on the server.';
export function openAICommunityStatus(env){
 let reason='';try{if(!env.OPENAI_API_KEY?.trim())throw Error(missingKey);budgetConfig(env);}catch(error){reason=error.message;}
 return {enabled:!reason,provider:'openai',model:communityOpenAIModel,imageModel:communityImageModel,reason};
}
function strictSchema(value){
 if(Array.isArray(value))return value.map(strictSchema);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['$schema','default'].includes(key)).map(([key,v])=>[key,strictSchema(v)]));
 return value;
}
export function openAICommunityBody(context,correction){
 const payload=context.payload;
 let selected=[];try{if(payload.context?.startsWith('HTML_SELECTION '))selected=JSON.parse(payload.context.slice(15)).blockIds??[];}catch{}
 const previous=correction?.rejectedPlan;
 const mixed=previous?.designs?.length&&(previous.changes?.length||previous.additions?.length||previous.removeIds?.length);
 const attachedStarter=payload.startingTemplate&&payload.sources?.some(source=>source.kind==='image')&&payload.prompt==='Refine the current asset using the attached reference. Preserve its essential content.';
 const mode=selected.length?'edit':mixed?(previous.replaceCurrent||payload.startingTemplate?'replace':'create'):attachedStarter?'replace':null;
 const schema=strictSchema(z.toJSONSchema(templatePlanSchema));
 if(mode){
  schema.properties.replaceCurrent={type:'boolean',const:mode==='replace'};
  schema.properties.badgeBatch={type:'null'};
  if(mode==='edit')schema.properties.designs.maxItems=0;
  else{
   schema.properties.designs.minItems=attachedStarter?Math.min(3,(payload.availablePageSlots??64)+1):1;
   if(attachedStarter)schema.properties.designs.maxItems=3;
   for(const key of ['changes','additions','removeIds'])schema.properties[key].maxItems=0;
  }
 }
 const operation=mode==='edit'?'Edit only the selected existing layers. Return designs:[] and replaceCurrent:false.':mode?
  `Return complete designs only, with replaceCurrent:${mode==='replace'}. changes, additions and removeIds must be empty. Incorporate any meaningful corrections from the rejected plan into the design fields themselves. ${attachedStarter?'The current canvas is an unused starter. Review and preserve the essential facts of the ATTACHED artwork, not the demonstration title, city or footer. Produce three complete proposals with the same source facts: distinct relevant visual/layout directions, including a light counterpart. Every proposal keeps the event title, date and edition when visible. Use a visible illustration or original globe; never a dark shape on a dark canvas.':''}`:'';
 return {model:communityOpenAIModel,store:false,service_tier:'default',reasoning:{effort:'none'},max_output_tokens:6500,
  instructions:communityTemplateInstructions+'\nFor attached posters, extract their facts into native text fields. Set image:null unless there is a useful clean visual crop; never reuse a complete off-brand poster. A glyph or partner logo belongs in partners, never in the main image slot.'+(operation?'\nOperation for this request: '+operation:''),
  input:[{role:'user',content:[{type:'input_text',text:JSON.stringify({...context.payload,...correction})},...context.images.flatMap((image,index)=>[
   {type:'input_text',text:JSON.stringify({image:index+1,role:image.role,sourceId:image.sourceId,reference:image.reference,
    purpose:image.role==='Approved gallery master'?'Layout and brand reference only. Its example text, date and city are not facts for the requested artwork.':image.role==='User attachment'?'This is the supplied source to review. Read its visible title, date, location and essential content. Preserve these facts in the corrected native text; do not replace them with gallery examples.':'Current editable canvas. An unused starter is only a layout reference; user attachments supply the new content.'})},
   {type:'input_image',image_url:image.data,detail:image.role==='User attachment'?'high':'low'},
  ])]}],
  text:{format:{type:'json_schema',name:'community_design',strict:true,schema}}};
}
export function openAIError(status){
 if(status===401||status===403)return 'OpenAI rejected this demo key or model permission. Check the project settings.';
 if(status===429)return 'OpenAI reached a rate or spending limit. Please retry later.';
 if(status===400)return 'OpenAI could not process this request. Please retry with a shorter brief.';
 return 'OpenAI could not finish this design. Please retry.';
}
async function responseJSON(response,limit){
 if(!response.body)throw Error('OpenAI returned an empty response.');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('OpenAI returned too much data.');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Error('OpenAI returned an invalid response.');}
}
export function createOpenAICaller({env,signal,budget,fetchImpl=fetch,onUsage=()=>{}}){
 return async(endpoint,{body,headers={},reservation=planReservation,limit=1_000_000,kind='text'})=>{
  budgetConfig(env);signal?.throwIfAborted();const ticket=await budget.reserve(reservation);
  // Reserve before sending. A lost/cancelled response remains fully charged in our ledger.
  const response=await fetchImpl(`https://api.openai.com/v1/${endpoint}`,{method:'POST',headers:{...headers,Authorization:`Bearer ${env.OPENAI_API_KEY}`,'OpenAI-Project':env.COMMUNITY_OPENAI_PROJECT},body,signal});
  if(!response.ok){await response.body?.cancel();throw Error(openAIError(response.status));}
  const result=await responseJSON(response,limit),usage=result.usage;
  if(usage&&Number.isSafeInteger(usage.input_tokens)&&Number.isSafeInteger(usage.output_tokens)&&usage.input_tokens>=0&&usage.output_tokens>=0){
   // Image inputs are conservatively charged entirely at the higher image-token rate.
   const cost=Math.ceil(usage.input_tokens*(kind==='image'?8:.75)+usage.output_tokens*(kind==='image'?30:4.5));
   await budget.settle(ticket,cost).catch(()=>{});onUsage({kind,inputTokens:usage.input_tokens,outputTokens:usage.output_tokens,costUsd:cost/1e6});
  }
  return result;
 };
}
export async function generateOpenAICommunityPlan(request,{env=process.env,signal,fetchImpl=fetch,loadContext=communityChatContext,budget=createBudget(blobBudgetStore(env)),onUsage=()=>{},onValidation=()=>{},onLayout=async()=>{}}={}){
 if(!env.OPENAI_API_KEY)throw Error(missingKey);
 const deadline=AbortSignal.timeout(240000),combined=signal?AbortSignal.any([signal,deadline]):deadline;
 const callOpenAI=createOpenAICaller({env,signal:combined,budget,fetchImpl,onUsage});
 const context=await loadContext(request);
 if(context.payload.galleryContext)delete context.payload.galleryContext.currentCanvasMetrics;
 let correction,draft;
 try{
  for(let attempt=0;attempt<2;attempt++){
   const response=await callOpenAI('responses',{body:JSON.stringify(openAICommunityBody(context,correction)),headers:{'Content-Type':'application/json'}});
   if(response.status!=='completed')throw Error('The model did not complete its design. Ask for fewer variations and retry.');
   const contents=response.output?.filter(item=>item.type==='message').flatMap(item=>item.content??[])??[];
   if(contents.some(item=>item.type==='refusal'))throw Error('OpenAI could not process this request. Please adjust the brief.');
   const text=contents.filter(item=>item.type==='output_text').map(item=>item.text).join('');
   let parsed;try{parsed=JSON.parse(text);draft=compileTemplatePlan(parsed,request);break;}
   catch(error){onValidation({attempt,error:error.message,plan:parsed});if(attempt===1)throw Error(error.name==='ZodError'?'The model returned an incomplete composition. Please retry.':error.message);correction={correctionFeedback:error.message,rejectedPlan:parsed??null};}
  }
  combined.throwIfAborted();
  if(draft.mediaRequests.length)await onLayout({templatePlan:draft.templatePlan,plan:draft.plan,pendingMedia:draft.mediaRequests.map(m=>m.id)});
  const media=await prepareCommunityMedia(draft.mediaRequests,request,{env,signal:combined,budget,callOpenAI});
  combined.throwIfAborted();return {templatePlan:draft.templatePlan,plan:draft.plan,media};
 }catch(error){
  if(signal?.aborted)throw Error('Cancelled');
  if(deadline.aborted)throw Error('Image generation took too long. Please retry.');
  if(error instanceof TypeError)throw Error('Could not reach the generation service. Please retry.');
  throw error;
 }
}
