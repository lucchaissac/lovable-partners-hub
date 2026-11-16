import test from 'node:test';
import {z} from 'zod';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {communityChatPlugin,localRequestAllowed,runProcess,validatedCommunityGeneration} from '../server/communityChat.mjs';
import {chatPlanSchema,validateChatPlan} from '../shared/communityChat.mjs';
import {communityDesignMetrics,communityCompositionRules,communityWorkingDimensions} from '../shared/communityDesignRules.mjs';
import {loadCommunityDesignReferences} from '../server/communityDesignReferences.mjs';

const frame={x:64,y:64,width:700,height:120,rotation:0,opacity:1};
const text={id:'title',kind:'text',frame,text:'Build together.',fontSize:80,weight:700,align:'left',color:'#f7f4ed',lineHeight:105};
const request={prompt:'Make a square LinkedIn post',title:'Demo',width:1200,height:630,blocks:[{id:'title',kind:'text',text:'Original'}],conversation:[],sources:[]};
function galleryDesign(width=1080,height=1080){
 const m=communityDesignMetrics('social',width,height);
 const brand=(id,asset,geometry)=>({id,kind:'brand',asset,color:'light',city:'Montréal',frame:{rotation:0,opacity:1,...geometry}});
 return {title:'Community meetup',reference:'social',visualTreatment:'brand-scene',width,height,background:'ink',elements:[
  brand('glow','gradient',{x:-width*.54,y:-height*.2,width:m.gradientWidth,height:m.gradientWidth*1.00808,rotation:-9.91}),
  brand('globe','globe',{x:m.globeX,y:m.globeY,width:m.globeWidth,height:m.globeWidth}),
  brand('logo','community-logo',{x:m.inset,y:m.inset,width:m.logoWidth,height:m.logoHeight}),
  {...text,frame:{...frame,x:m.inset,y:m.headlineY,width:m.headlineWidth,height:180*m.scale},fontSize:m.headlineSize,lineHeight:88/96*100},
 ]};
}
const plan={reviews:[],badgeBatch:null,summary:'Created a LinkedIn post.',designs:[galleryDesign()],edits:[],removeIds:[]};

test('Reviewed globe counterparts retain the original motif geometry and editorial type in both palettes',()=>{
 const dark=structuredClone(plan),design=dark.designs[0];
 dark.reviews=[{sourceId:'current-canvas',verdict:'on-brand',diagnosis:'Keep the existing editorial hierarchy.',issues:[],keep:['Native type and full Community logo'],remove:[],retainedVisuals:[],uncertainties:[]}];
 const logo=design.elements[2],headline=design.elements[3];
 logo.frame.width*=1.25;logo.frame.height*=1.25;
 headline.fontSize=180;headline.lineHeight=92;headline.frame.height=350;
 const light=structuredClone(dark);light.designs[0].background='white';light.designs[0].elements[2].color='dark';light.designs[0].elements[3].color='#1b1b1b';
 const context={...request,preview:'data:image/png;base64,AAAA'};
 assert.ok(validateChatPlan(dark,context));assert.ok(validateChatPlan(light,context));
 assert.deepEqual(light.designs[0].elements.slice(0,2),dark.designs[0].elements.slice(0,2));
 const lower=structuredClone(light);lower.designs[0].elements[1].frame.y=400;assert.ok(validateChatPlan(lower,context));
 lower.reviews=[];assert.throws(()=>validateChatPlan(lower,context));
 const closeCrop=structuredClone(light);Object.assign(closeCrop.designs[0].elements[1].frame,{x:-85,y:-116,width:2361,height:2361});
 assert.ok(validateChatPlan(closeCrop,context));assert.equal(closeCrop.designs[0].width,1080);
 closeCrop.reviews=[];assert.throws(()=>validateChatPlan(closeCrop,context));
 const wrong=structuredClone(light);wrong.designs[0].elements[1].frame.width*=.5;
 assert.throws(()=>validateChatPlan(wrong,context),/original globe shape/);
});

test('Replacing a composition uses its existing slot and respects selected or locked content',()=>{
 const replace={...plan,replaceCurrent:true};
 assert.equal(validateChatPlan(replace,{...request,availablePageSlots:0}).replaceCurrent,true);
 assert.equal(validateChatPlan(plan,request).replaceCurrent,false);
 assert.equal(validateChatPlan(plan,{...request,startingTemplate:true,availablePageSlots:0}).replaceCurrent,true);
 assert.throws(()=>validateChatPlan(plan,{...request,availablePageSlots:0}),/full/);
 assert.throws(()=>validateChatPlan({...replace,designs:[...plan.designs,...plan.designs]},{...request,availablePageSlots:0}),/full/);
 assert.throws(()=>validateChatPlan({...replace,designs:[]},request),/complete design/);
 assert.throws(()=>validateChatPlan(replace,{...request,context:'HTML_SELECTION '+JSON.stringify({blockIds:['title']})}),/selection/);
 assert.throws(()=>validateChatPlan(replace,{...request,blocks:[{...request.blocks[0],frame:{locked:true}}]}),/Unlock/);
});

test('Generation accepts free formats and multiple designs, but rejects executable content and unknown sources',()=>{
 assert.equal(validateChatPlan({...plan,designs:[...plan.designs,galleryDesign(1200,627)]},request).designs.length,2);
 assert.throws(()=>chatPlanSchema.parse({...plan,designs:[{...plan.designs[0],elements:[{id:'script',kind:'code',code:'alert(1)'}]}]}));
 assert.throws(()=>validateChatPlan({...plan,designs:[],edits:[{id:'copy',kind:'reuse',sourceId:'invented',frame:null}]},request));
 assert.throws(()=>validateChatPlan({...plan,edits:[text]},request));
 assert.throws(()=>validateChatPlan({...plan,designs:[],removeIds:['unknown']},request));
 assert.throws(()=>validateChatPlan({...plan,designs:[{...plan.designs[0],elements:[text,text]}]},request));
 assert.throws(()=>chatPlanSchema.parse({...plan,designs:[{...plan.designs[0],elements:[{...text,id:'invalid_native_id'}]}]}));
 assert.throws(()=>chatPlanSchema.parse({...plan,designs:[{...plan.designs[0],elements:[{...text,id:'a'.repeat(81)}]}]}));
});
test('Local bridge rejects cross-origin, rebinding and network requests',()=>{
 const req={headers:{host:'127.0.0.1:5173',origin:'http://127.0.0.1:5173'},socket:{remoteAddress:'127.0.0.1'}};
 assert.ok(localRequestAllowed(req));
 assert.equal(localRequestAllowed({...req,headers:{...req.headers,origin:'https://example.com'}}),false);
 assert.equal(localRequestAllowed({...req,headers:{host:'evil.example:5173'}}),false);
 assert.equal(localRequestAllowed({...req,socket:{remoteAddress:'192.168.1.10'}}),false);
 assert.equal(localRequestAllowed({...req,headers:{...req.headers,'sec-fetch-site':'cross-site'}}),false);
});
async function fixture(t,generate=async()=>plan){
 let middleware;const server=createServer((req,res)=>middleware(req,res));const plugin=communityChatPlugin({generate,checkStatus:async()=>({enabled:true})});
 assert.equal(plugin.apply,'serve');assert.equal(plugin.configurePreviewServer,undefined);
 plugin.configureServer({httpServer:server,middlewares:{use(_path,fn){middleware=fn;}}});
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
 return `http://127.0.0.1:${server.address().port}/api/community-chat`;
}
test('Local HTTP boundary enforces input validation and does not invoke a provider for rejected requests',async t=>{
 let calls=0;const url=await fixture(t,async()=>{calls++;return plan;});
 assert.equal((await (await fetch(url)).json()).enabled,true);
 assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)})).status,415);
 assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Lovable-Local':'1'},body:'{}'})).status,400);
 assert.equal(calls,0);
 const result=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Lovable-Local':'1'},body:JSON.stringify(request)});
 assert.equal(result.status,200);assert.deepEqual(await result.json(),plan);assert.equal(calls,1);
});
test('Closing a request cancels its provider job, and a second request cannot overlap',async t=>{
 let started,resolveCancelled;const ready=new Promise(resolve=>started=resolve),cancelled=new Promise(resolve=>resolveCancelled=resolve);
 const url=await fixture(t,(_request,signal)=>new Promise((_resolve,reject)=>{started();signal.addEventListener('abort',()=>{resolveCancelled();reject(new Error('Cancelled'));});}));
 const controller=new AbortController(),options={method:'POST',headers:{'Content-Type':'application/json','X-Lovable-Local':'1'},body:JSON.stringify(request)};
 const first=fetch(url,{...options,signal:controller.signal}).catch(()=>{});await ready;
 assert.equal((await fetch(url,options)).status,409);controller.abort();await first;await cancelled;
});
test('Stop terminates the local CLI process',async()=>{
 const abort=new AbortController();const result=runProcess(process.execPath,['-e','setInterval(()=>{},1000)'],{signal:abort.signal});abort.abort();await assert.rejects(result,/Cancelled/);
});

test('A selected-element edit cannot change or remove unrelated elements',()=>{
 const scoped={...request,blocks:[...request.blocks,{id:'other',kind:'text',text:'Keep this'}],context:'HTML_SELECTION '+JSON.stringify({blockIds:['title']})};
 assert.ok(validateChatPlan({...plan,designs:[],edits:[text]},scoped));
 assert.throws(()=>validateChatPlan({...plan,designs:[],edits:[{...text,id:'other'}]},scoped),/unselected/);
 assert.throws(()=>validateChatPlan({...plan,designs:[],removeIds:['other']},scoped),/unselected/);
});
test('The structured-output schema uses supported anyOf unions',()=>{
 const schema=z.toJSONSchema(chatPlanSchema);assert.equal(JSON.stringify(schema).includes('"oneOf"'),false);
});

test('Gallery rules reject the giant-heart demo, incorrect proportions and invented art direction',()=>{
 const modify=fn=>{const copy=structuredClone(plan);fn(copy.designs[0]);return copy;};
 assert.throws(()=>validateChatPlan(modify(d=>{d.background='white';}),request));
 assert.throws(()=>validateChatPlan(modify(d=>{d.elements[1].asset='heart';}),request));
 assert.throws(()=>validateChatPlan(modify(d=>{d.elements[2].frame.width*=2;}),request),/intact light logo/);
 assert.throws(()=>validateChatPlan(modify(d=>{d.elements[3].frame.y=48;}),request),/clear space/);
 assert.throws(()=>validateChatPlan(modify(d=>{d.elements[3].weight=900;}),request));
 assert.throws(()=>validateChatPlan(modify(d=>{d.elements[3].align='center';}),request),/left-aligned/);
 assert.throws(()=>validateChatPlan(modify(d=>{d.elements[1].frame.width=200;d.elements[1].frame.height=200;}),request),/globe scale/);
 assert.throws(()=>validateChatPlan(modify(d=>{[d.elements[0],d.elements[1]]=[d.elements[1],d.elements[0]];}),request),/layer order/);
 const withOldHeart={...request,blocks:[...request.blocks,{id:'old-heart',kind:'image',alt:'heart'}]};
 assert.throws(()=>validateChatPlan({...plan,designs:[],edits:[{id:'reused-heart',kind:'reuse',sourceId:'old-heart',frame:null}]},withOldHeart),/Standalone heart/);
});

test('Reference measurements match the actual gallery renderer and include all six images',async()=>{
 const gallery=await loadCommunityDesignReferences();assert.equal(gallery.references.length,6);
 for(const ref of gallery.references){
  assert.ok(ref.preview.length>1000);if(ref.id==='spotlight')continue;
  const logo=ref.layers.find(l=>l.kind==='logo'),headline=ref.layers.find(l=>['title','headline','name'].includes(l.key)),rule=communityCompositionRules[ref.id];
  for(const [actual,expected] of [[logo.x,rule.inset],[logo.y,rule.inset],[logo.w,rule.logoWidth],[headline.size,rule.headlineSize],[headline.leading,rule.headlineLeading]])assert.ok(Math.abs(actual-expected)<.01,`${ref.id}: ${actual} != ${expected}`);
  const globe=ref.layers.find(l=>l.kind==='globe');if(globe){assert.ok(Math.abs(globe.w-rule.globeWidth)<.01);assert.ok(Math.abs(globe.x-rule.globeX)<.01);}
 }
});

test('Invalid composition is corrected before being returned, with a bounded retry',async()=>{
 let calls=0;const bad=structuredClone(plan);bad.designs[0].elements[2].frame.width*=2;
 const result=await validatedCommunityGeneration(request,async feedback=>{calls++;if(calls===1){assert.equal(feedback,undefined);return bad;}assert.match(feedback.correctionFeedback,/intact light logo/);return plan;});
 assert.deepEqual(result,chatPlanSchema.parse(plan));assert.equal(calls,2);
 calls=0;await assert.rejects(validatedCommunityGeneration(request,async()=>{calls++;return bad;}),/did not meet/);assert.equal(calls,2);
});

test('Square social designs keep a large headline, high globe and equal footer insets',()=>{
 const square=communityDesignMetrics('social',1080,1080),landscape=communityDesignMetrics('social',1200,630);
 assert.equal(square.headlineSize,120);assert.equal(square.headlineWidth,900);assert.equal(square.globeY,0);
 assert.equal(landscape.headlineSize,96);assert.ok(Math.abs(square.footerSize-32.4)<.001);
 const modify=fn=>{const copy=structuredClone(plan);fn(copy.designs[0]);return copy;};
 assert.throws(()=>validateChatPlan(modify(d=>{d.elements[1].frame.y=513;}),request),/Keep the globe high/);
 assert.throws(()=>validateChatPlan(modify(d=>{d.elements[3].fontSize=86.4;}),request),/headline prominent/);
 const footer={...text,id:'footer',text:'Bring your ideas.',weight:600,fontSize:32.4,lineHeight:133.3333,frame:{...frame,x:43.2,y:993.6,width:800,height:43.2}};
 assert.ok(validateChatPlan(modify(d=>d.elements.push(footer)),request));
 assert.throws(()=>validateChatPlan(modify(d=>d.elements.push({...footer,frame:{...footer.frame,y:940}})),request),/same bottom inset/);
 assert.throws(()=>validateChatPlan(modify(d=>d.elements.push({...footer,fontSize:21.6})),request),/footer type/);
});


test('Print requests use practical working canvases and retain the roll-up proportions',()=>{
 const dimensions=communityWorkingDimensions('banner');
 assert.deepEqual(dimensions,{width:425,height:1000});
 assert.ok(Math.abs(dimensions.width/dimensions.height-850/2000)<.0001);
 const m=communityDesignMetrics('banner',dimensions.width,dimensions.height);
 const brand=(id,asset,geometry)=>({id,kind:'brand',asset,color:'light',city:'Paris',frame:{rotation:0,opacity:1,...geometry}});
 const rollup={title:'Build together',reference:'banner',visualTreatment:'brand-scene',...dimensions,background:'ink',elements:[
  brand('globe','globe',{x:m.globeX,y:m.globeY,width:m.globeWidth,height:m.globeWidth}),
  brand('gradient','gradient',{x:-640,y:275,width:m.gradientWidth,height:m.gradientWidth*1.00808,rotation:-9.91}),
  brand('logo','community-logo',{x:m.inset,y:m.inset,width:m.logoWidth,height:m.logoHeight}),
  {...text,fontSize:m.headlineSize,lineHeight:m.headlineLeading/m.headlineSize*100,frame:{...frame,x:m.headlineX,y:m.headlineY,width:m.headlineWidth,height:m.headlineLeading*3}},
 ]};
 assert.ok(validateChatPlan({...plan,designs:[rollup]},{...request,prompt:'Create a giant 85 × 200 cm roll-up.'}));
 assert.throws(()=>validateChatPlan({...plan,designs:[{...rollup,height:2000}]},request),/1000px long edge/);
 assert.throws(()=>chatPlanSchema.parse({...plan,designs:[{...rollup,height:3000}]}));
 assert.throws(()=>chatPlanSchema.parse({...plan,designs:[{...plan.designs[0],width:3000}]}));
});


test('A narrow custom print ratio keeps the scaled lockup instead of inflating it to 12px',()=>{
 const width=230,height=1000,m=communityDesignMetrics('banner',width,height);
 const brand=(id,asset,geometry)=>({id,kind:'brand',asset,color:'light',city:'Paris',frame:{rotation:0,opacity:1,...geometry}});
 const design={title:'Paris roll-up',reference:'banner',visualTreatment:'brand-scene',width,height,background:'ink',elements:[
  brand('globe','globe',{x:m.globeX,y:m.globeY,width:m.globeWidth,height:m.globeWidth}),
  brand('gradient','gradient',{x:-345,y:150,width:m.gradientWidth,height:m.gradientWidth*1.00808,rotation:-9.91}),
  brand('logo','community-logo',{x:m.inset,y:m.inset,width:m.logoWidth,height:m.logoHeight}),
  {...text,fontSize:m.headlineSize,frame:{...frame,x:m.headlineX,y:m.headlineY,width:m.headlineWidth,height:100}},
 ]};
 assert.ok(m.logoHeight<12);
 assert.ok(validateChatPlan({...plan,designs:[design]},{...request,prompt:'Make a 23 × 100 cm roll-up.'}));
});
