import {z} from 'zod';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {studioAnimationPlanSchema,studioAnimationRevisionSchema,studioAnimationRequestSchema,requestedAnimationSteps,validateStudioAnimationPlan,validateStudioAnimationRevision} from '../shared/studioAnimation.mjs';
import {studioAnimationInstructions} from './studioAnimationPrompt.mjs';
import {communityOpenAIModel,createOpenAICaller} from './communityOpenAI.mjs';
import {createBudget,blobBudgetStore} from './communityBudget.mjs';
import {communityChatStatus,localRequestAllowed,runProcess,executable} from './communityChat.mjs';

export const animationRequestByteLimit=500000;
const strictSchema=value=>Array.isArray(value)?value.map(strictSchema):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!['$schema','default'].includes(key)).map(([key,item])=>[key,strictSchema(item)])):value;
export function studioAnimationBody(request,correction){
 const revising=request.sequence?.length>1;
 const schema=strictSchema(z.toJSONSchema(revising?studioAnimationRevisionSchema:studioAnimationPlanSchema));
 if(!revising)schema.properties.steps.maxItems=request.availablePageSlots;
 // Structured Outputs uses homogeneous arrays; tuple-specific coordinate bounds
 // are checked by the native schema after generation.
 const transition=revising?schema.properties.updates.items.properties.transition.anyOf.find(item=>item.type==='object'):schema.properties.steps.items.properties.transition;
 transition.properties.curve={type:'array',items:{type:'number'},minItems:4,maxItems:4};
 return {model:communityOpenAIModel,store:false,service_tier:'default',reasoning:{effort:'none'},max_output_tokens:12000,instructions:studioAnimationInstructions+(revising?'\nThis is a FOLLOW-UP: revise the supplied sequence in place. Return updates keyed by existing assetId, with absolute property changes and an outgoing transition or null to preserve it. Keep the number, IDs and order of assets unchanged. Do not generate additional poses. Preserve the final authored resting pose unless the user asks to change it. Interpret phrases such as make it epic, slower, more subtle, or plus dynamique as changes to this animation. You can adjust the starting pose, intermediate poses and outgoing timing together. Do not ask the user to repeat the animation request.':'') ,
  input:[{role:'user',content:[{type:'input_text',text:JSON.stringify({...request,requestedAddedAssets:requestedAnimationSteps(request.prompt)??null,...correction})}]}],text:{format:{type:'json_schema',name:'studio_animation',strict:true,schema}}};
}
export async function generateStudioAnimation(input,{env=process.env,signal,fetchImpl=fetch,budget,runCodex}={}){
 const request=studioAnimationRequestSchema.parse(input),count=requestedAnimationSteps(request.prompt);
 if(request.sequence.length<2&&(!request.availablePageSlots||count>request.availablePageSlots))throw Error('There is not enough room in this collection for the requested animation.');
 const provider=env.COMMUNITY_CHAT_PROVIDER?.trim()||'codex';
 const deadline=AbortSignal.timeout(180000),combined=signal?AbortSignal.any([signal,deadline]):deadline;
 let execute,cleanup=async()=>{};
 if(provider==='openai'){
  if(!env.OPENAI_API_KEY?.trim())throw Error('The animation service is not configured.');
  const call=createOpenAICaller({env,signal:combined,fetchImpl,budget:budget??createBudget(blobBudgetStore(env))});
  execute=async correction=>{
   const response=await call('responses',{body:JSON.stringify(studioAnimationBody(request,correction)),headers:{'Content-Type':'application/json'}});
   if(response.status!=='completed')throw Error('The animation plan did not finish. Ask for fewer poses and retry.');
   const content=response.output?.filter(item=>item.type==='message').flatMap(item=>item.content??[])??[];
   if(content.some(item=>item.type==='refusal'))throw Error('The animation service could not process this request.');
   return JSON.parse(content.filter(item=>item.type==='output_text').map(item=>item.text).join(''));
  };
 }else if(provider==='codex'){
  if(env.VERCEL)throw Error('Codex animation planning is local only.');
  if(runCodex)execute=correction=>runCodex(studioAnimationBody(request,correction),combined);
  else{
   const dir=await mkdtemp(join(tmpdir(),'lovable-animation-'));cleanup=()=>rm(dir,{recursive:true,force:true});
   try{await writeFile(join(dir,'schema.json'),JSON.stringify(studioAnimationBody(request).text.format.schema),{mode:0o600});}catch(error){await cleanup();throw error;}
   const args=['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','--sandbox','read-only','--color','never','--output-schema',join(dir,'schema.json'),'--output-last-message',join(dir,'result.json'),'-C',dir,
    '-c','approval_policy="never"','-c','project_doc_max_bytes=0','-c','features.shell_tool=false','-c','features.apply_patch_freeform=false','-c','features.apps=false','-c','apps._default.enabled=false','-c','agents.enabled=false','-c','features.multi_agent_v2=false','-c','features.js_repl=false','-c','web_search="disabled"','-c','model_reasoning_effort="low"','-c',`developer_instructions=${JSON.stringify(studioAnimationBody(request).instructions)}`];
   if(env.COMMUNITY_CHAT_MODEL)args.push('--model',env.COMMUNITY_CHAT_MODEL);
   execute=async correction=>{
    const result=await runProcess(await executable(env),[...args,'-'],{cwd:dir,input:JSON.stringify({...request,requestedAddedAssets:count??null,...correction}),signal:combined,maxOutput:500000});
    if(result.code!==0)throw Error('The local animation planner could not finish. Check your Codex connection and retry.');
    return JSON.parse(await readFile(join(dir,'result.json'),'utf8'));
   };
  }
 }else throw Error('Choose codex or openai for COMMUNITY_CHAT_PROVIDER.');
 try{
  let correction;
  for(let attempt=0;attempt<2;attempt++){
   combined.throwIfAborted();let value;
   try{value=await execute(correction);combined.throwIfAborted();return {plan:(request.sequence.length>1?validateStudioAnimationRevision:validateStudioAnimationPlan)(value,request)};}
   catch(error){
    if(combined.aborted)throw Error(signal?.aborted?'Cancelled':'Animation planning took too long. Please retry.');
    if(attempt||(!value&&!(error instanceof SyntaxError)))throw error;
    correction={correctionFeedback:error.message,rejectedPlan:value??null};
   }
  }
 }finally{await cleanup();}
}
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
export function studioAnimationPlugin({env=process.env,generate=(request,signal)=>generateStudioAnimation(request,{env,signal}),checkStatus=()=>communityChatStatus(env)}={}){
 const active=new Set();
 return {name:'studio-animation-local',apply:'serve',configureServer(server){
  server.httpServer?.once('close',()=>{for(const controller of active)controller.abort();});
  server.middlewares.use('/api/studio-animation',async(req,res)=>{
   if(!localRequestAllowed(req)){json(res,403,{error:'Use the local development server for this planner.'});return;}
   if(req.method==='GET'){json(res,200,await checkStatus());return;}
   if(req.method!=='POST'){json(res,405,{error:'Method not allowed.'});return;}
   if(req.headers['x-lovable-local']!=='1'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')){json(res,415,{error:'Expected a local JSON request.'});return;}
   if(active.size){json(res,409,{error:'An animation is already being planned. Wait or stop it first.'});return;}
   const controller=new AbortController();active.add(controller);
   const cancelled=()=>{if(!res.writableEnded)controller.abort();};res.on('close',cancelled);req.on('aborted',cancelled);
   try{
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>animationRequestByteLimit){json(res,413,{error:'This animation request is too large.'});return;}}
    let request;try{request=studioAnimationRequestSchema.parse(JSON.parse(body));}catch{json(res,400,{error:'This animation request is invalid.'});return;}
    const result=await generate(request,controller.signal);if(!controller.signal.aborted)json(res,200,result);
   }catch(error){if(!controller.signal.aborted&&!res.writableEnded)json(res,502,{error:error.name==='ZodError'||error instanceof SyntaxError?'The animation plan was invalid. Please retry.':error.message});}
   finally{active.delete(controller);res.off('close',cancelled);req.off('aborted',cancelled);}
  });
 }};
}
