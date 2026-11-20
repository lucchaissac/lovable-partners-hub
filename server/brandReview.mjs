import {z} from 'zod';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import sharp from 'sharp';
import {brandReviewRequestSchema,brandReviewPlanSchema,validateBrandReviewPlan} from '../shared/brandReview.mjs';
import {brandReviewInstructions} from './brandReviewPrompt.mjs';
import {appStudioTemplate,partnershipTemplate} from '../shared/brandTemplates.mjs';
import {communityChatStatus,executable,runProcess,localRequestAllowed} from './communityChat.mjs';
import {communityOpenAIModel,createOpenAICaller} from './communityOpenAI.mjs';
import {createBudget,blobBudgetStore} from './communityBudget.mjs';

export const brandReviewByteLimit=6_000_000;
const providerFor=env=>env.BRAND_CHAT_PROVIDER?.trim()||(env.VERCEL?'openai':'codex');
export const brandReviewStatus=(env=process.env)=>communityChatStatus({...env,COMMUNITY_CHAT_PROVIDER:providerFor(env)});
const root=new URL('../public/',import.meta.url);
let gallery;
async function referenceImage(template){
 const images=template.id==='collaboration'?[template.glow,template.logo,template.partner]:[template.heart,template.logo,template.wordmark];
 const imageTags=await Promise.all(images.map(async item=>{
  const mime=item.src.endsWith('.svg')?'image/svg+xml':'image/webp',bytes=await readFile(new URL(item.src.slice(1),root));
  return `<image href="data:${mime};base64,${bytes.toString('base64')}" x="${item.x}" y="${item.y}" width="${item.width}" height="${item.height}"/>`;
 }));
 const d=template.divider;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${template.width}" height="${template.height}" viewBox="0 0 ${template.width} ${template.height}"><rect width="100%" height="100%" fill="#1b1b1b"/>${imageTags.join('')}${d?`<rect x="${d.x}" y="${d.y}" width="${d.width}" height="${d.height}" fill="white"/>`:''}</svg>`;
 return sharp(Buffer.from(svg)).resize({width:960}).webp({quality:85}).toBuffer();
}
export function loadBrandReferences(){
 return gallery??=Promise.all([
  readFile(new URL('../examples/blackhat-coffee-rave/preview-600x400.png',import.meta.url)).then(data=>({reference:'event',data:`data:image/png;base64,${data.toString('base64')}`})),
  ...[partnershipTemplate,appStudioTemplate].map(async template=>({reference:template.id==='collaboration'?'partnership':'app-studio',data:`data:image/webp;base64,${(await referenceImage(template)).toString('base64')}`})),
 ]).catch(error=>{gallery=undefined;throw error;});
}
const strictSchema=value=>Array.isArray(value)?value.map(strictSchema):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!['$schema','default'].includes(key)).map(([key,item])=>[key,strictSchema(item)])):value;
export async function brandReviewContext(request){
 const refs=await loadBrandReferences();
 const images=[...refs.map(ref=>({...ref,role:'Approved layout reference'})),...request.sources.map(source=>({data:source.image,role:'User source',sourceId:source.id,name:source.name}))];
 const payload={...request,sources:request.sources.map(({image,...source})=>source),imageOrder:images.map(({data,...item},i)=>({image:i+1,...item}))};
 return {payload,images};
}
export function brandReviewBody(context,correction){
 return {model:communityOpenAIModel,store:false,service_tier:'default',reasoning:{effort:'none'},max_output_tokens:3500,instructions:brandReviewInstructions,
  input:[{role:'user',content:[{type:'input_text',text:JSON.stringify({...context.payload,...correction})},...context.images.flatMap(({data,...label})=>[{type:'input_text',text:JSON.stringify(label)},{type:'input_image',image_url:data,detail:label.role==='User source'?'high':'low'}])]}],
  text:{format:{type:'json_schema',name:'lovable_brand_review',strict:true,schema:strictSchema(z.toJSONSchema(brandReviewPlanSchema))}}};
}
export async function generateBrandReview(input,{env=process.env,signal,runCodex,fetchImpl=fetch,budget,loadContext=brandReviewContext}={}){
 const request=brandReviewRequestSchema.parse(input),context=await loadContext(request),provider=providerFor(env);
 const deadline=AbortSignal.timeout(180000),combined=signal?AbortSignal.any([signal,deadline]):deadline;
 let execute,cleanup=async()=>{};
 if(provider==='openai'){
  const call=createOpenAICaller({env,signal:combined,fetchImpl,budget:budget??createBudget(blobBudgetStore(env))});
  execute=async correction=>{
   const response=await call('responses',{body:JSON.stringify(brandReviewBody(context,correction)),headers:{'Content-Type':'application/json'}});
   if(response.status!=='completed')throw Error('The brand review did not finish. Please retry.');
   const content=response.output?.filter(item=>item.type==='message').flatMap(item=>item.content??[])??[];
   if(content.some(item=>item.type==='refusal'))throw Error('This artwork could not be processed.');
   return JSON.parse(content.filter(item=>item.type==='output_text').map(item=>item.text).join(''));
  };
 }else if(provider==='codex'){
  if(env.VERCEL)throw Error('Codex brand review is available only on the local server.');
  if(runCodex)execute=correction=>runCodex(brandReviewBody(context,correction),combined);
  else{
   const dir=await mkdtemp(join(tmpdir(),'lovable-brand-review-'));cleanup=()=>rm(dir,{recursive:true,force:true});
   try{
    await writeFile(join(dir,'schema.json'),JSON.stringify(brandReviewBody(context).text.format.schema),{mode:0o600});
    const args=['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','--sandbox','read-only','--color','never','--output-schema',join(dir,'schema.json'),'--output-last-message',join(dir,'result.json'),'-C',dir,
     '-c','approval_policy="never"','-c','project_doc_max_bytes=0','-c','features.shell_tool=false','-c','features.apply_patch_freeform=false','-c','features.apps=false','-c','apps._default.enabled=false','-c','agents.enabled=false','-c','features.multi_agent_v2=false','-c','features.js_repl=false','-c','web_search="disabled"','-c','model_reasoning_effort="low"','-c',`developer_instructions=${JSON.stringify(brandReviewInstructions)}`];
    if(env.COMMUNITY_CHAT_MODEL)args.push('--model',env.COMMUNITY_CHAT_MODEL);
    for(const [index,item] of context.images.entries()){
     const match=item.data.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/),path=join(dir,`image-${index+1}.${match[1]}`);
     await writeFile(path,Buffer.from(match[2],'base64'),{mode:0o600});args.push('--image',path);
    }
    execute=async correction=>{
     const result=await runProcess(await executable(env),[...args,'-'],{cwd:dir,input:JSON.stringify({...context.payload,...correction}),signal:combined,maxOutput:200000});
     if(result.code!==0)throw Error('The local brand reviewer could not finish. Check your Codex connection and retry.');
     return JSON.parse(await readFile(join(dir,'result.json'),'utf8'));
    };
   }catch(error){await cleanup();throw error;}
  }
 }else throw Error('Choose codex or openai for BRAND_CHAT_PROVIDER.');
 try{
  let correction;
  for(let attempt=0;attempt<2;attempt++){
   combined.throwIfAborted();let value;
   try{value=await execute(correction);combined.throwIfAborted();return {plan:validateBrandReviewPlan(value,request)};}
   catch(error){if(combined.aborted)throw Error(signal?.aborted?'Cancelled':'The brand review took too long. Please retry.');if(attempt||(!value&&!(error instanceof SyntaxError)))throw error;correction={correctionFeedback:error.message,rejectedPlan:value??null};}
  }
 }finally{await cleanup();}
}
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
export function brandReviewPlugin({env=process.env,generate=(request,signal)=>generateBrandReview(request,{env,signal}),checkStatus=()=>brandReviewStatus(env)}={}){
 const active=new Set();
 return {name:'lovable-brand-review',apply:'serve',configureServer(server){
  server.httpServer?.once('close',()=>{for(const controller of active)controller.abort();});
  server.middlewares.use('/api/brand-review',async(req,res)=>{
   if(!localRequestAllowed(req)){json(res,403,{error:'Use the local studio for this brand reviewer.'});return;}
   if(req.method==='GET'){json(res,200,await checkStatus());return;}
   if(req.method!=='POST'){json(res,405,{error:'Method not allowed.'});return;}
   if(req.headers['x-lovable-local']!=='1'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')){json(res,415,{error:'Expected a local JSON request.'});return;}
   if(active.size){json(res,409,{error:'An artwork is already being reviewed. Wait or stop it first.'});return;}
   const controller=new AbortController();active.add(controller);
   const cancel=()=>{if(!res.writableEnded)controller.abort();};res.on('close',cancel);req.on('aborted',cancel);
   try{
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>brandReviewByteLimit){json(res,413,{error:'These images are too large.'});return;}}
    let request;try{request=brandReviewRequestSchema.parse(JSON.parse(body));}catch{json(res,400,{error:'Attach a readable image and specify working dimensions from 100 to 2560 pixels.'});return;}
    const result=await generate(request,controller.signal);if(!controller.signal.aborted)json(res,200,result);
   }catch(error){if(!controller.signal.aborted&&!res.writableEnded)json(res,502,{error:error.name==='ZodError'||error instanceof SyntaxError?'The brand reviewer returned an invalid plan. Please retry.':error.message});}
   finally{active.delete(controller);res.off('close',cancel);req.off('aborted',cancel);}
  });
 }};
}
