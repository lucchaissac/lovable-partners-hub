import {gatewayStatus} from './modelGateway.mjs';

export function localRequestAllowed(req){
 try{const target=new URL(`http://${req.headers.host}`);
  return ['localhost','127.0.0.1','[::1]'].includes(target.hostname)&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)&&(!req.headers.origin||req.headers.origin===target.origin)&&(!req.headers['sec-fetch-site']||['same-origin','none'].includes(req.headers['sec-fetch-site']));
 }catch{return false;}
}
export function productionRequestAllowed(req,env=process.env){
 try{const origin=new URL(env.APP_PUBLIC_ORIGIN).origin;
  return req.headers.host===new URL(origin).host&&(!req.headers.origin||req.headers.origin===origin)&&(!req.headers['sec-fetch-site']||['same-origin','none'].includes(req.headers['sec-fetch-site']));
 }catch{return false;}
}
const json=(res,status,value)=>{if(res.writableEnded||res.destroyed)return;res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};

export function createAgentHandler({schema,generate,limit=3_500_000,env=process.env,local=false}){
 let active=0;
 return async(req,res)=>{
  if(!(local?localRequestAllowed(req):productionRequestAllowed(req,env))){json(res,403,{enabled:false,reason:'This service is not enabled for this origin.',error:'This service is not enabled for this origin.'});return;}
  if(req.method==='GET'){json(res,200,gatewayStatus(env));return;}
  if(req.method!=='POST'){json(res,405,{error:'Method not allowed.'});return;}
  if(!gatewayStatus(env).enabled){json(res,503,{error:'Connect a model service to enable AI tools.'});return;}
  if(req.headers['x-lovable-local']!=='1'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')){json(res,415,{error:'Expected a JSON request.'});return;}
  if(active>=2){json(res,429,{error:'A design is already being prepared. Please retry shortly.'});return;}
  const controller=new AbortController();active++;
  const cancel=()=>{if(!res.writableEnded)controller.abort();};res.on('close',cancel);req.on('aborted',cancel);
  const timer=setTimeout(()=>{json(res,504,{error:'The request took too long. Please retry.'});controller.abort();},250000);timer.unref?.();
  try{
   let body='';
   if(req.body!==undefined){body=typeof req.body==='string'?req.body:JSON.stringify(req.body);}
   else for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>limit){json(res,413,{error:'This request is too large.'});return;}}
   if(Buffer.byteLength(body)>limit){json(res,413,{error:'This request is too large.'});return;}
   let input;try{input=schema.parse(JSON.parse(body));}catch{json(res,400,{error:'This request is invalid.'});return;}
   const result=await generate(input,{env,signal:controller.signal});
   if(!controller.signal.aborted)json(res,200,result);
  }catch{if(!controller.signal.aborted)json(res,502,{error:'The service could not complete a valid result. Please retry.'});}
  finally{active--;clearTimeout(timer);res.off('close',cancel);req.off('aborted',cancel);}
 };
}

export function agentPlugin(name,path,schema,generate,limit,env){return {
 name,apply:'serve',configureServer(server){server.middlewares.use(path,createAgentHandler({schema,generate,limit,env,local:true}));},
};}
