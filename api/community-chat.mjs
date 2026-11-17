import {communityStream} from '../server/communityStream.mjs';
import {chatRequestSchema} from '../shared/communityChat.mjs';
import {generateOpenAICommunityPlan,openAICommunityStatus} from '../server/communityOpenAI.mjs';

export const config={maxDuration:300};
const json=(res,status,value)=>{res.setHeader('Cache-Control','no-store');res.status(status).json(value);};
export function productionRequestAllowed(req,env){
 const host=env.COMMUNITY_PUBLIC_ORIGIN;
 if(!host||req.headers.origin&&req.headers.origin!==host)return false;
 const site=req.headers['sec-fetch-site'];
 return (!site||site==='same-origin'||site==='none')&&req.headers.host===new URL(host).host;
}
export default async function handler(req,res){
 const env=process.env;
 if(env.COMMUNITY_CHAT_PROVIDER!=='openai'||!productionRequestAllowed(req,env)){json(res,403,{enabled:false,error:'The Community demo is not enabled for this origin.'});return;}
 const status=openAICommunityStatus(env);
 if(req.method==='GET'){json(res,200,status);return;}
 if(req.method!=='POST'){json(res,405,{error:'Method not allowed.'});return;}
 if(!status.enabled){json(res,503,{error:status.reason});return;}
 if(req.headers['x-lovable-local']!=='1'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')){json(res,415,{error:'Expected a JSON request.'});return;}
 const controller=new AbortController(),stream=communityStream(req,res);
 const cancelled=()=>{if(!res.writableEnded)controller.abort();};res.on('close',cancelled);
 try{
  const body=typeof req.body==='string'?req.body:JSON.stringify(req.body??{});
  if(Buffer.byteLength(body)>3500000){json(res,413,{error:'These references are too large.'});return;}
  let request;try{request=chatRequestSchema.parse(JSON.parse(body));}catch{json(res,400,{error:'This design request is invalid. Please shorten it and retry.'});return;}
  const result=await generateOpenAICommunityPlan(request,{env,signal:controller.signal,onLayout:stream.onLayout});if(!controller.signal.aborted&&!stream.finish(result))json(res,200,result);
 }catch(error){if(!controller.signal.aborted){const message=error instanceof SyntaxError||error.name==='ZodError'?'The model returned an invalid design. Please retry.':error.message;if(!stream.error(message))json(res,502,{error:message});}}
 finally{res.off('close',cancelled);}
}
