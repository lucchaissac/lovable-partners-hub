/** Server-only boundary. Implement this contract with the receiving host's AI service. */
export function gatewayStatus(env=process.env){
 try {
  const url=new URL(env.MODEL_GATEWAY_URL);
  if(url.username||url.password||!['https:','http:'].includes(url.protocol))throw Error();
  if(url.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error();
  return {enabled:true,provider:'host',reason:''};
 } catch {return {enabled:false,provider:'host',reason:'Connect a model service to enable AI tools.'};}
}

export async function callGateway(task,input,{env=process.env,signal,fetchImpl=fetch}={}){
 if(!gatewayStatus(env).enabled)throw Error('Connect a model service to enable AI tools.');
 const deadline=AbortSignal.timeout(240000);
 const combined=signal?AbortSignal.any([signal,deadline]):deadline;
 const response=await fetchImpl(env.MODEL_GATEWAY_URL,{
  method:'POST',redirect:'error',signal:combined,
  headers:{'Content-Type':'application/json',...(env.MODEL_GATEWAY_TOKEN?{Authorization:`Bearer ${env.MODEL_GATEWAY_TOKEN}`}:{})},
  body:JSON.stringify({version:1,task,...input,locale:'en-US'}),
 });
 if(!response.ok){await response.body?.cancel();throw Error(response.status===429?'The model service is busy. Please retry later.':'The model service could not complete this request.');}
 if(!response.body)throw Error('The model service returned an empty response.');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>12_000_000){await reader.cancel();throw Error('The model response is too large.');}chunks.push(Buffer.from(value));}}
 finally{reader.releaseLock();}
 let result;try{result=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Error('The model service returned invalid JSON.');}
 if(!result||typeof result!=='object'||Array.isArray(result))throw Error('The model service returned an invalid response.');
 if(result.error)throw Error('The model service could not complete this request.');
 return result;
}

/** Convert the planners' structured request into a provider-independent envelope. */
export async function callModelBody(task,body,options){
 const content=body.input[0].content;
 const payload=JSON.parse(content.find(item=>item.type==='input_text').text);
 const images=[];let label;
 for(const item of content.slice(1)){
  if(item.type==='input_text'){try{label=JSON.parse(item.text);}catch{label={description:item.text};}}
  if(item.type==='input_image'){images.push({...label,data:item.image_url});label=undefined;}
 }
 const result=await callGateway(task,{
  instructions:body.instructions+'\nWrite all assistant explanations and newly generated copy in US English. Preserve supplied names and factual content. Never translate or rewrite existing canvas text during animation or targeted edits.',
  schema:body.text.format.schema,payload,images,
 },options);
 if(!result.plan||typeof result.plan!=='object')throw Error('The model service did not return a plan.');
 return result.plan;
}

export async function validateWithCorrection(run,validate,{signal}={}){
 let correction;
 for(let attempt=0;attempt<2;attempt++){
  signal?.throwIfAborted();
  const value=await run(correction);signal?.throwIfAborted();
  try{return validate(value);}catch(error){if(attempt)throw Error('The plan did not meet the design constraints. Please retry.');correction={correctionFeedback:error.message,rejectedPlan:value};}
 }
}
