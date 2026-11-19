import {productionRequestAllowed} from './community-chat.mjs';
import {studioAnimationRequestSchema} from '../shared/studioAnimation.mjs';
import {generateStudioAnimation,animationRequestByteLimit} from '../server/studioAnimation.mjs';
import {openAICommunityStatus} from '../server/communityOpenAI.mjs';

export const config={maxDuration:300};
const json=(res,status,value)=>{res.setHeader('Cache-Control','no-store');res.status(status).json(value);};
export default async function handler(req,res){
 const env=process.env;
 if(env.COMMUNITY_CHAT_PROVIDER!=='openai'||!productionRequestAllowed(req,env)){json(res,403,{enabled:false,error:'Animation planning is not enabled for this origin.'});return;}
 const status=openAICommunityStatus(env);
 if(req.method==='GET'){json(res,200,status);return;}
 if(req.method!=='POST'){json(res,405,{error:'Method not allowed.'});return;}
 if(!status.enabled){json(res,503,{error:status.reason});return;}
 if(req.headers['x-lovable-local']!=='1'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')){json(res,415,{error:'Expected a JSON request.'});return;}
 const controller=new AbortController(),cancelled=()=>{if(!res.writableEnded)controller.abort();};res.on('close',cancelled);
 try{
  const body=typeof req.body==='string'?req.body:JSON.stringify(req.body??{});
  if(Buffer.byteLength(body)>animationRequestByteLimit){json(res,413,{error:'This animation request is too large.'});return;}
  let request;try{request=studioAnimationRequestSchema.parse(JSON.parse(body));}catch{json(res,400,{error:'This animation request is invalid.'});return;}
  const result=await generateStudioAnimation(request,{env,signal:controller.signal});if(!controller.signal.aborted)json(res,200,result);
 }catch(error){if(!controller.signal.aborted)json(res,502,{error:error.name==='ZodError'||error instanceof SyntaxError?'The animation plan was invalid. Please retry.':error.message});}
 finally{res.off('close',cancelled);}
}
