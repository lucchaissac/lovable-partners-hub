import {productionRequestAllowed} from './community-chat.mjs';
import {brandReviewRequestSchema} from '../shared/brandReview.mjs';
import {generateBrandReview,brandReviewByteLimit} from '../server/brandReview.mjs';
import {openAICommunityStatus} from '../server/communityOpenAI.mjs';
export const config={maxDuration:300};
const json=(res,status,value)=>{res.setHeader('Cache-Control','no-store');res.status(status).json(value);};
export default async function handler(req,res){
 const env=process.env;
 if(env.COMMUNITY_CHAT_PROVIDER!=='openai'||!productionRequestAllowed(req,env)){json(res,403,{enabled:false,error:'Brand review is not enabled for this origin.'});return;}
 const status=openAICommunityStatus(env);
 if(req.method==='GET'){json(res,200,status);return;}
 if(req.method!=='POST'){json(res,405,{error:'Method not allowed.'});return;}
 if(!status.enabled){json(res,503,{error:status.reason});return;}
 if(req.headers['x-lovable-local']!=='1'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')){json(res,415,{error:'Expected a JSON request.'});return;}
 const controller=new AbortController(),cancel=()=>{if(!res.writableEnded)controller.abort();};res.on('close',cancel);
 try{
  const body=typeof req.body==='string'?req.body:JSON.stringify(req.body??{});
  if(Buffer.byteLength(body)>brandReviewByteLimit){json(res,413,{error:'These images are too large.'});return;}
  let request;try{request=brandReviewRequestSchema.parse(JSON.parse(body));}catch{json(res,400,{error:'This brand review request is invalid.'});return;}
  const result=await generateBrandReview(request,{env:{...env,BRAND_CHAT_PROVIDER:'openai'},signal:controller.signal});if(!controller.signal.aborted)json(res,200,result);
 }catch(error){if(!controller.signal.aborted)json(res,502,{error:error.name==='ZodError'||error instanceof SyntaxError?'The brand reviewer returned an invalid plan. Please retry.':error.message});}
 finally{res.off('close',cancel);}
}
