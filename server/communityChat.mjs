import {communityStream} from './communityStream.mjs';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chatRequestSchema,chatPlanJSONSchema,validateChatPlan} from '../shared/communityChat.mjs';
import {communityChatInstructions} from './communityChatPrompt.mjs';
import {communityChatContext} from './communityChatContext.mjs';
import {generateOpenAICommunityPlan,openAICommunityStatus} from './communityOpenAI.mjs';
import {CommunityDesignRuleError} from '../shared/communityDesignRules.mjs';

const bundled='/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex';
async function executable(env=process.env){if(env.COMMUNITY_CODEX_BIN)return env.COMMUNITY_CODEX_BIN;try{await access(bundled);return bundled;}catch{return 'codex';}}
const loopback=host=>['127.0.0.1','localhost','[::1]'].includes(host);
export function localRequestAllowed(req){
 try{const target=new URL(`http://${req.headers.host}`),origin=req.headers.origin;
  return loopback(target.hostname)&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)&&(!origin||origin===target.origin)&&(!req.headers['sec-fetch-site']||['same-origin','none'].includes(req.headers['sec-fetch-site']));
 }catch{return false;}
}
export function runProcess(binary,args,{cwd,input='',signal,timeout=180000,maxOutput=200000}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new Error('Cancelled'));return;}
  const child=spawn(binary,args,{cwd,stdio:['pipe','pipe','pipe'],detached:process.platform!=='win32',shell:false});let out='',err='',finished=false,killTimer;
  const kill=()=>{try{if(child.pid&&process.platform!=='win32')process.kill(-child.pid,'SIGTERM');else child.kill('SIGTERM');}catch{}killTimer=setTimeout(()=>{try{if(child.pid&&process.platform!=='win32')process.kill(-child.pid,'SIGKILL');else child.kill('SIGKILL');}catch{}},1200);killTimer.unref();};
  const fail=message=>{if(!finished){finished=true;kill();clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(new Error(message));}};
  const abort=()=>fail('Cancelled'),timer=setTimeout(()=>fail('The local model took too long. Please retry.'),timeout);
  signal?.addEventListener('abort',abort,{once:true});
  child.stdout.on('data',chunk=>{out+=chunk;if(out.length>maxOutput)fail('The model returned too much output.');});
  child.stderr.on('data',chunk=>{err=(err+chunk).slice(-12000);});
  child.on('error',()=>fail('Codex could not start. Check that Codex CLI is installed and signed in.'));
  child.on('close',code=>{clearTimeout(timer);clearTimeout(killTimer);signal?.removeEventListener('abort',abort);if(finished)return;finished=true;resolve({code,out,err});});
  child.stdin.on('error',()=>{});child.stdin.end(input);
 });
}
let statusCache;
function selectedProvider(env){return env.COMMUNITY_CHAT_PROVIDER?.trim()||'codex';}
export async function communityChatStatus(env=process.env){
 const provider=selectedProvider(env);
 if(provider==='openai')return openAICommunityStatus(env);
 if(provider!=='codex')return {enabled:false,reason:'Choose codex or openai for COMMUNITY_CHAT_PROVIDER.'};
 if(statusCache&&Date.now()-statusCache.at<30000)return statusCache.value;
 let enabled=false;try{const result=await runProcess(await executable(env),['login','status'],{timeout:5000});enabled=result.code===0;}catch{}
 const value={enabled,provider:'codex',reason:enabled?'':'Sign in to Codex on this Mac to use the local chat.'};statusCache={at:Date.now(),value};return value;
}
export async function validatedCommunityGeneration(request,run,signal){
 let correction;
 for(let attempt=0;attempt<2;attempt++){
  signal?.throwIfAborted();const value=await run(correction);signal?.throwIfAborted();
  try{return validateChatPlan(value,request);}catch(error){
   if(!(error instanceof CommunityDesignRuleError)&&error?.name!=='ZodError')throw error;
   if(attempt===1)throw Error('This design did not meet the Community guidelines. Please retry with a shorter brief.');
   correction={correctionFeedback:error.message,rejectedPlan:value};
  }
 }
}
export async function generateCommunityPlan(request,signal,{env=process.env,...options}={}){
 const provider=selectedProvider(env);
 if(provider==='codex')return generateCodexCommunityPlan(request,signal,env);
 if(provider!=='openai')throw Error('Choose codex or openai for COMMUNITY_CHAT_PROVIDER.');
 return generateOpenAICommunityPlan(request,{...options,env,signal});
}
async function generateCodexCommunityPlan(request,signal,env){
 const dir=await mkdtemp(join(tmpdir(),'lovable-community-chat-'));
 try{
  await writeFile(join(dir,'schema.json'),JSON.stringify(chatPlanJSONSchema),{mode:0o600});
  const args=['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','--sandbox','read-only','--color','never','--output-schema',join(dir,'schema.json'),'--output-last-message',join(dir,'result.json'),'-C',dir,
   '-c','approval_policy="never"','-c','project_doc_max_bytes=0','-c','features.shell_tool=false','-c','features.apply_patch_freeform=false','-c','features.apps=false','-c','apps._default.enabled=false','-c','agents.enabled=false','-c','features.multi_agent_v2=false','-c','features.js_repl=false','-c','web_search="disabled"','-c','model_reasoning_effort="low"','-c',`developer_instructions=${JSON.stringify(communityChatInstructions)}`];
  if(env.COMMUNITY_CHAT_MODEL)args.push('--model',env.COMMUNITY_CHAT_MODEL);
  const {payload,images}=await communityChatContext(request);
  for(const [index,item] of images.entries()){
   const match=item.data.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/),path=join(dir,`reference-${index+1}.${match[1]}`);
   await writeFile(path,Buffer.from(match[2],'base64'),{mode:0o600});args.push('--image',path);
  }
  const deadline=Date.now()+180000;
  return await validatedCommunityGeneration(request,async correction=>{
   const result=await runProcess(await executable(env),[...args,'-'],{cwd:dir,input:JSON.stringify({...payload,...correction}),signal,maxOutput:300000,timeout:Math.max(1,deadline-Date.now())});
   if(result.code!==0){
    if(/rate.limit|usage.limit|quota/i.test(result.err))throw Error('Your Codex usage limit was reached. Retry when it resets.');
    if(/unauthorized|sign.in|authentication|refresh.token/i.test(result.err))throw Error('Reconnect Codex on this Mac, then retry.');
    throw Error('The local model could not finish this design. Please retry.',{cause:result.err});
   }
   return JSON.parse(await readFile(join(dir,'result.json'),'utf8'));
  },signal);
 }finally{await rm(dir,{recursive:true,force:true});}
}
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
export function communityChatPlugin({env=process.env,generate=(request,signal,onLayout)=>generateCommunityPlan(request,signal,{env,onLayout}),checkStatus=()=>communityChatStatus(env)}={}){
 const active=new Set();
 return {name:'community-chat-local',apply:'serve',configureServer(server){
  server.httpServer?.once('close',()=>{for(const controller of active)controller.abort();});
  server.middlewares.use('/api/community-chat',async(req,res)=>{
   if(!localRequestAllowed(req)){json(res,403,{error:'This chat is available only on the local development server.'});return;}
   if(req.method==='GET'){json(res,200,await checkStatus());return;}
   if(req.method!=='POST'){json(res,405,{error:'Method not allowed.'});return;}
   if(req.headers['x-lovable-local']!=='1'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')){json(res,415,{error:'Expected a local JSON request.'});return;}
   if(active.size){json(res,409,{error:'A local design is already running. Wait for it to finish or stop it.'});return;}
   const controller=new AbortController();active.add(controller);const stream=communityStream(req,res);
   const cancelled=()=>{if(!res.writableEnded)controller.abort();};res.on('close',cancelled);req.on('aborted',cancelled);
   try{
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>3500000){json(res,413,{error:'These references are too large.'});return;}}
    let request;try{request=chatRequestSchema.parse(JSON.parse(body));}catch{json(res,400,{error:'This design request is invalid. Please shorten it and retry.'});return;}
    const result=await generate(request,controller.signal,stream.onLayout);if(!controller.signal.aborted&&!stream.finish(result))json(res,200,result);
   }catch(error){if(!controller.signal.aborted&&!res.writableEnded){const message=error instanceof Error&&!(error instanceof SyntaxError)&&error.name!=='ZodError'?error.message:'The model returned an invalid design. Please retry.';if(!stream.error(message))json(res,502,{error:message});}}
   finally{active.delete(controller);res.off('close',cancelled);req.off('aborted',cancelled);}
  });
 }};
}
