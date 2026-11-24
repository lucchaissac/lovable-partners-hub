import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {z} from 'zod';
import {gatewayStatus,callGateway,callModelBody,validateWithCorrection} from '../server/modelGateway.mjs';
import {createAgentHandler,productionRequestAllowed} from '../server/agentHttp.mjs';
import {generateBrandReview} from '../server/brandReview.mjs';
import {generateCommunityTemplatePlan} from '../server/communityPlanner.mjs';
import {generateScreenPlan} from '../server/screenImport.mjs';
import {generateStudioAnimation} from '../server/studioAnimation.mjs';
import {prepareCommunityMedia} from '../server/communityImageTools.mjs';
import sharp from 'sharp';

const env={MODEL_GATEWAY_URL:'https://gateway.example.test/plan'};
const reply=plan=>new Response(JSON.stringify({plan}),{headers:{'Content-Type':'application/json'}});

test('configuration is disabled by default and accepts only secure or loopback gateways',()=>{
 assert.equal(gatewayStatus({}).enabled,false);
 for(const url of ['file:///etc/passwd','https://name:password@example.test','http://example.test'])assert.equal(gatewayStatus({MODEL_GATEWAY_URL:url}).enabled,false);
 assert.equal(gatewayStatus(env).enabled,true);
 assert.equal(gatewayStatus({MODEL_GATEWAY_URL:'http://127.0.0.1:9999'}).enabled,true);
});
test('no unconfigured request contacts a model service',async()=>{
 await assert.rejects(callGateway('brand-review',{}, {env:{},fetchImpl:()=>assert.fail('Unexpected network request')}),/Connect a model/);
});
test('the host receives labeled image inputs, schema and US English instructions',async()=>{
 const schema={type:'object'},image='data:image/png;base64,AAAA';
 const result=await callModelBody('brand-review',{instructions:'Preserve original artwork.',input:[{content:[{type:'input_text',text:'{"prompt":"Update"}'},{type:'input_text',text:'{"role":"User source","sourceId":"one"}'},{type:'input_image',image_url:image}]}],text:{format:{schema}}},{env,fetchImpl:async(url,init)=>{
  assert.equal(url,env.MODEL_GATEWAY_URL);assert.equal(init.redirect,'error');
  const body=JSON.parse(init.body);assert.equal(body.locale,'en-US');assert.equal(body.task,'brand-review');assert.deepEqual(body.schema,schema);assert.deepEqual(body.images,[{role:'User source',sourceId:'one',data:image}]);assert.match(body.instructions,/US English/);return reply({summary:'Done'});
 }});
 assert.equal(result.summary,'Done');
});
test('provider error bodies and missing plans never pass through to clients',async()=>{
 await assert.rejects(callGateway('x',{}, {env,fetchImpl:async()=>new Response('private upstream detail',{status:401})}),error=>!error.message.includes('private'));
 await assert.rejects(callModelBody('x',{instructions:'',input:[{content:[{type:'input_text',text:'{}'}]}],text:{format:{schema:{}}}},{env,fetchImpl:async()=>new Response('{}')}),/did not return a plan/);
});
test('invalid plans receive exactly one correction and abort stops work',async()=>{
 let calls=0;
 const result=await validateWithCorrection(async correction=>{calls++;if(calls===2)assert.ok(correction.correctionFeedback);return {ok:calls===2};},value=>{if(!value.ok)throw Error('Invalid');return value;});
 assert.equal(calls,2);assert.equal(result.ok,true);
 calls=0;await assert.rejects(validateWithCorrection(async()=>{calls++;return {};},()=>{throw Error('Invalid');}),/constraints/);assert.equal(calls,2);
 const controller=new AbortController();controller.abort();await assert.rejects(validateWithCorrection(()=>assert.fail('Cancelled work must not run'),x=>x,{signal:controller.signal}));
});
test('brand review loads real master images and validates the gateway plan',async()=>{
 const request={prompt:'Make it on-brand',width:600,height:400,sources:[{id:'source-0',name:'Submitted artwork',image:'data:image/png;base64,AAAA'}],conversation:[],currentText:[]};
 const plan={template:'event',sourceId:'source-0',title:'Build night',headline:'Build night',details:['January 12 — Paris'],palette:'dark',diagnosis:'Corrected the branding and retained the source facts.',uncertainties:[],partners:[],visual:null};
 const result=await generateBrandReview(request,{env,fetchImpl:async(url,init)=>{const body=JSON.parse(init.body);assert.equal(body.images.length,4);assert.equal(body.images[0].role,'Approved layout reference');assert.equal(body.images[3].sourceId,'source-0');return reply(plan);}});
 assert.equal(result.plan.headline,'Build night');
});
test('Community keeps exact native starter geometry through the template gateway',async()=>{
 const request={prompt:'Create a new Community poster',title:'Event',width:1080,height:1080,startingTemplate:true,blocks:[],sources:[],conversation:[]};
 const plan={summary:'Created the approved composition.',replaceCurrent:true,reviews:[],badgeBatch:null,designs:[{title:'Build together',template:'event-square',width:null,height:null,background:'ink',fields:[{slot:'city',text:'Paris'},{slot:'title',text:'Build something\nlovable.'},{slot:'eventFooter',text:'Meet your local Lovable community.'}],image:null,partners:[],headlineFont:null}],changes:[],additions:[],removeIds:[],mediaRequests:[]};
 const result=await generateCommunityTemplatePlan(request,{env,fetchImpl:async(url,init)=>{const body=JSON.parse(init.body);assert.equal(body.task,'community-template');assert.equal(body.images.length,6);return reply(plan);}});
 const title=result.plan.designs[0].elements.find(layer=>layer.id==='d0-title');assert.equal(title.fontSize,160);assert.equal(title.frame.y,184);assert.equal(result.plan.replaceCurrent,true);assert.deepEqual(result.media,[]);
});
test('screen edits keep selection constraints and the native patch schema',async()=>{
 const block={id:'title',kind:'text',text:'Original',x:100,y:100,width:400,height:60,fontSize:40,color:'#ffffff',fill:null,locked:false};
 const request={mode:'edit',prompt:'Change the title',selectedIds:['title'],blocks:[block]};
 const plan={summary:'Updated the title.',edits:[{id:'title',text:'Your next idea',color:null,fill:null,fontSize:null,x:null,y:null}],motions:[],clearMotion:false};
 const result=await generateScreenPlan(request,{env,fetchImpl:async(url,init)=>{const body=JSON.parse(init.body);assert.ok(body.schema.properties.edits);assert.equal(body.schema.properties.layers,undefined);return reply(plan);}});
 assert.deepEqual(result.plan,plan);
});
test('animation keeps selected layer IDs and rejects updates to locked layers',async()=>{
 const block={id:'title',kind:'text',name:'Title',text:'Build together',locked:false,groupId:null,frame:{x:43,y:184,widthPx:793,height:440,opacity:1},appearance:{fontSize:160},techArtwork:null};
 const request={prompt:'Animate the title',workspace:'ambassadors',assetId:crypto.randomUUID(),title:'Event',width:1080,height:1080,availablePageSlots:5,selectedIds:['title'],blocks:[block],sequence:[],conversation:[]};
 const plan={summary:'Added a title entrance.',initialChanges:[{id:'title',property:'opacity',value:0}],steps:[{title:'Event',changes:[{id:'title',property:'opacity',value:1}],transition:{durationMs:600,delayMs:0,easing:'ease-out',curve:[0,0,.2,1],bounce:25,velocity:0}}]};
 const options={env,fetchImpl:async(url,init)=>{const body=JSON.parse(init.body);assert.equal(body.task,'studio-animation');assert.deepEqual(body.payload.selectedIds,['title']);return reply(plan);}};
 assert.deepEqual((await generateStudioAnimation(request,options)).plan,plan);
 await assert.rejects(generateStudioAnimation({...request,blocks:[{...block,locked:true}]},options),/constraints/);
});
test('separate generated images retain transparency and are returned as bounded media',async()=>{
 const png=await sharp({create:{width:12,height:12,channels:4,background:{r:255,g:0,b:0,alpha:.5}}}).png().toBuffer();
 const media=await prepareCommunityMedia([{id:'media-one',operation:'generate',sourceId:null,crop:null,background:'transparent',color:'#1b1b1b',prompt:'A separate paper object.'}],{sources:[]},{env,fetchImpl:async(url,init)=>{
  const body=JSON.parse(init.body);assert.equal(body.task,'image');assert.equal(body.background,'transparent');assert.equal(body.operation,'generate');assert.match(body.prompt,/not a finished poster/);
  return new Response(JSON.stringify({image:`data:image/png;base64,${png.toString('base64')}`}));
 }});
 assert.equal(media.length,1);assert.equal(media[0].id,'media-one');assert.match(media[0].image,/^data:image\/webp;base64,/);
 assert.equal((await sharp(Buffer.from(media[0].image.split(',')[1],'base64')).metadata()).hasAlpha,true);
});
test('production origin checks fail closed',()=>{
 const req={headers:{host:'app.example.test',origin:'https://app.example.test','sec-fetch-site':'same-origin'}};
 assert.equal(productionRequestAllowed(req,{}),false);assert.equal(productionRequestAllowed(req,{APP_PUBLIC_ORIGIN:'https://app.example.test'}),true);
 assert.equal(productionRequestAllowed({...req,headers:{...req.headers,origin:'https://elsewhere.example.test'}},{APP_PUBLIC_ORIGIN:'https://app.example.test'}),false);
});
test('HTTP handlers report disabled status, validate request size and reject cross-origin calls',async()=>{
 let called=0;const config={schema:z.object({prompt:z.string()}).strict(),generate:async value=>{called++;return {plan:value};},env:{},local:true,limit:80};
 const disabled=createAgentHandler(config),enabled=createAgentHandler({...config,env});
 const server=createServer((req,res)=>(req.url==='/disabled'?disabled:enabled)(req,res));server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin=`http://127.0.0.1:${server.address().port}`,headers={'Content-Type':'application/json','X-Lovable-Local':'1',Origin:origin};
 try{
  assert.equal((await (await fetch(origin+'/disabled')).json()).enabled,false);
  assert.equal((await fetch(origin+'/disabled',{method:'POST',headers,body:'{"prompt":"Hi"}'})).status,503);
  assert.equal((await fetch(origin+'/enabled',{method:'POST',headers:{...headers,Origin:'https://elsewhere.example.test'},body:'{"prompt":"Hi"}'})).status,403);
  assert.equal((await fetch(origin+'/enabled',{method:'POST',headers,body:'{"wrong":true}'})).status,400);
  assert.equal((await fetch(origin+'/enabled',{method:'POST',headers,body:JSON.stringify({prompt:'x'.repeat(100)})})).status,413);
  assert.equal((await fetch(origin+'/enabled',{method:'POST',headers,body:'{"prompt":"Hi"}'})).status,200);assert.equal(called,1);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
