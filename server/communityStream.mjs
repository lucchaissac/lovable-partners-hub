// One same-origin request, layout first, media later. No second paid request or reusable intent token.
export function communityStream(req,res){
 const enabled=String(req.headers.accept??'').includes('application/x-ndjson');let started=false;
 const send=value=>{if(res.destroyed||res.writableEnded)return;if(!started){res.statusCode=200;res.setHeader('Content-Type','application/x-ndjson');res.setHeader('Cache-Control','no-store, no-transform');res.setHeader('X-Content-Type-Options','nosniff');res.flushHeaders?.();started=true;}res.write(JSON.stringify(value)+'\n');};
 return {get started(){return started;},onLayout:enabled?async value=>send({type:'layout',...value}):async()=>{},finish(value){if(enabled){send({type:'complete',...value});res.end();return true;}return false;},error(error){if(!started)return false;send({type:'error',error});res.end();return true;}};
}
