import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer as createHttpServer} from 'node:http';
import {createServer} from 'vite';
import {appStudioTemplate} from '../shared/brandTemplates.mjs';
import {curveDefaults,gridDefaults,interpolateTechArtwork} from '../shared/techArtwork.mjs';
import {requestsCanvasAnimation,routesToAnimation,isAnimationFollowUp,requestedAnimationSteps,studioAnimationRequest,compileStudioAnimation,compileStudioAnimationRevision,validateStudioAnimationPlan,validateStudioAnimationRevision,animationCanvasKey} from '../shared/studioAnimation.mjs';
import {generateStudioAnimation,studioAnimationBody,studioAnimationPlugin} from '../server/studioAnimation.mjs';

// Load the actual native schemas and playback/compiler modules, without a browser.
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {assetSchema,makeNode}=await vite.ssrLoadModule('/studio/src/assets-tool/model.ts');
const {animationRequest,planCanvasAnimation}=await vite.ssrLoadModule('/studio/src/assets-tool/studioAnimation.ts');
const {linkAssetPages,replaceAssetPage,restoreAssetArrangement,currentAnimationSequence}=await vite.ssrLoadModule('/studio/src/assets-tool/assetSeries.ts');
const {matchingPlaybackBlocks,playbackTimeline,playbackPosition,canExportAnimation}=await vite.ssrLoadModule('/studio/src/assets-tool/assetPlayback.ts');
const blocks=asset=>asset.editor.pages[0].sections[0].columns[0];
const layer=(asset,id)=>blocks(asset).find(block=>block.id===id);
const timing={durationMs:600,delayMs:150,easing:'ease-out',curve:[0,0,.2,1],bounce:25,velocity:0};
const patch=(id,property,value)=>({id,property,value});
const details='app-studio-details';
function canvas(){
 const t=appStudioTemplate;
 const image=(id,src,alt,x=0,y=0,width=300,height=100)=>({id,kind:'image',value:{src,alt,caption:'',alignment:'center',width:100},editor:{position:'absolute',x,y,widthPx:width,height,motionId:id,appearance:{imageFit:'contain'}}});
 return assetSchema.parse({version:1,id:crypto.randomUUID(),title:'App Studio',format:'landscape',dimensions:{width:t.width,height:t.height},background:'ink',grid:false,updatedAt:1,
  reference:{name:'App Studio',src:'data:image/png;base64,AAAA',width:1,height:1},nodes:[makeNode('image',{x:0,y:0,w:100,h:100})],
  editor:{version:1,pages:[{id:'page',name:'App Studio',sections:[{id:'canvas',name:'Canvas',background:'transparent',padding:0,gap:0,columns:[[
   image('gradient',t.heart.src,'Original gradient',0,0,t.width,t.height),
   image('logo',t.logo.src,'Lovable logo',t.logo.x,t.logo.y,t.logo.width,t.logo.height),
   image('wordmark',t.wordmark.src,'App Studio',t.wordmark.x,t.wordmark.y,t.wordmark.width,t.wordmark.height),
   {id:details,kind:'text',value:{runs:[{text:t.details.text}],style:'Text',size:t.details.size,align:'center',color:'#ffffff'},editor:{position:'absolute',x:t.details.x,y:t.details.y,widthPx:t.details.width,height:t.details.height,motionId:details,appearance:{fontSize:t.details.size,fontWeight:700,opacity:75}}},
  ]]}]}]}});
}
const request=(base,options={})=>studioAnimationRequest(base,{prompt:'Animate the place and date',workspace:'lovable',availablePageSlots:63,...options});
function entrance(base){const y=layer(base,details).editor.y;return {summary:'Le lieu et la date apparaissent en douceur.',initialChanges:[patch(details,'opacity',0),patch(details,'y',y+24)],steps:[{title:'App Studio · Details',changes:[patch(details,'opacity',.75),patch(details,'y',y)],transition:timing}]};}

test('animation intent and explicit state counts distinguish total poses from added assets',()=>{
 for(const prompt of ['Animate the place and date','Anime le logo','Animer en 4 étapes','Make a Smart animate sequence','Fade in the date'])assert.equal(requestsCanvasAnimation(prompt),true,prompt);
 for(const prompt of ['Make an App Studio banner','Change the city','Do not animate this'])assert.equal(requestsCanvasAnimation(prompt),false,prompt);
 assert.equal(requestedAnimationSteps('Animate in 4 states'),3);
 assert.equal(requestedAnimationSteps('Anime en 3 étapes'),2);
 assert.equal(requestedAnimationSteps('Animate and add 4 assets'),4);
 assert.equal(requestedAnimationSteps('Animate the logo'),undefined);
});
test('follow-ups keep animation context across multiple replies, including the old App Studio fallback',()=>{
 const history=[{user:true,text:'Animate this cover'},{user:false,text:'Created a subtle entrance animation.'}];
 for(const prompt of ['Make it epicccc','plus dynamique','slower please','a bit more','Change the easing']){
  assert.equal(isAnimationFollowUp(prompt,history),true);assert.equal(routesToAnimation(prompt,history),true);
  history.push({user:true,text:prompt},{user:false,text:'Ask me to make a banner for App Studio.'});
 }
 for(const prompt of ['Open App Studio','Make a new banner','Stop','Do not animate this'])assert.equal(isAnimationFollowUp(prompt,history),false,prompt);
 assert.equal(routesToAnimation('Make it epicccc',[]),false);
 assert.equal(routesToAnimation('More subtle',[...history,{user:true,text:'Create a new poster'}]),false);
});
test('the planner sees one normalized object opacity; its response schema excludes percentages',()=>{
 const base=canvas();layer(base,details).editor.opacity=.2;
 const req=request(base),text=req.blocks.find(block=>block.id===details);
 assert.equal(text.frame.opacity,.75);assert.equal(text.appearance.opacity,undefined);
 const curves=layer(base,'logo');curves.techArtwork={...curveDefaults,opacity:30};
 const next=request(base);assert.equal(next.blocks.find(block=>block.id==='logo').frame.opacity,1);assert.equal(next.blocks.find(block=>block.id==='logo').techArtwork.opacity,30);
 const variants=studioAnimationBody(next).text.format.schema.properties.initialChanges.items.anyOf;
 const whole=variants.find(item=>item.properties.property.const==='opacity'),ink=variants.find(item=>item.properties.property.const==='tech.opacity');
 assert.equal(whole.properties.value.type,'number');assert.equal(whole.properties.value.maximum,1);assert.equal(ink.properties.value.maximum,100);
 for(const value of [100,30,'100%'])assert.throws(()=>validateStudioAnimationPlan({...entrance(base),initialChanges:[patch(details,'opacity',value)]},next));
});
test('follow-up revises the existing sequence in place, preserving IDs, the final pose and unrelated pages',()=>{
 const base=canvas(),poses=compileStudioAnimation(base,entrance(base),request(base)),other=canvas();other.editor.pages[0].sections[0].columns[0][0].id='unrelated';
 const collection=linkAssetPages([...poses,other]),sequence=currentAnimationSequence(collection,poses[1].id);
 assert.deepEqual(sequence.map(page=>page.id),poses.map(page=>page.id));
 const prepared=animationRequest(collection[1],'Make it epicccc','lovable',undefined,0,sequence);
 const revision={summary:'A stronger entrance.',updates:[{assetId:poses[0].id,changes:[patch(details,'y',900),patch(details,'rotationX',25)],transition:{...timing,durationMs:1200,easing:'spring'}}]};
 const revised=compileStudioAnimationRevision(prepared.sequence,revision,prepared.payload);
 assert.deepEqual(revised.map(page=>page.id),poses.map(page=>page.id));assert.equal(revised[0].animation.durationMs,1200);
 assert.deepEqual(revised[1].editor,prepared.sequence[1].editor);assert.equal(layer(revised[0],details).editor.y,900);
 revised.forEach(page=>assetSchema.parse(page));
 const combined=collection.map(page=>revised.find(pose=>pose.id===page.id)??page);
 const restored=restoreAssetArrangement(combined,collection,collection.map(page=>page.id),sequence);
 assert.deepEqual(restored.pages.map(page=>page.editor),collection.map(page=>page.editor));assert.equal(restored.detached.length,0);
 assert.throws(()=>validateStudioAnimationRevision({...revision,updates:[{...revision.updates[0],assetId:other.id}]},prepared.payload),/current animation/);
 assert.throws(()=>validateStudioAnimationRevision({...revision,updates:[{...revision.updates[0],assetId:poses[1].id}]},prepared.payload),/last pose/);
 prepared.payload.sequence[0].blocks.find(block=>block.id===details).locked=true;
 assert.throws(()=>validateStudioAnimationRevision(revision,prepared.payload),/Unlock/);
});
test('follow-up provider and client use revision output even when no extra asset slots remain',async()=>{
 const base=canvas(),poses=compileStudioAnimation(base,entrance(base),request(base));
 const prepared=animationRequest(poses[1],'Make it epicccc','lovable',undefined,0,poses);
 const revision={summary:'More dynamic.',updates:[{assetId:poses[0].id,changes:[],transition:{...timing,durationMs:1400}}]};
 const body=studioAnimationBody(prepared.payload);assert.ok(body.text.format.schema.properties.updates);assert.ok(!body.text.format.schema.properties.steps);assert.match(body.instructions,/FOLLOW-UP/);
 const response=await generateStudioAnimation(prepared.payload,{env,budget,fetchImpl:async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(revision)}]}]})});
 const previous=globalThis.fetch;try{
  globalThis.fetch=async()=>Response.json(response);
  const result=await planCanvasAnimation(prepared,new AbortController().signal);
  assert.equal(result.revision,true);assert.deepEqual(result.poses.map(page=>page.id),poses.map(page=>page.id));assert.equal(result.poses[0].animation.durationMs,1400);
 }finally{globalThis.fetch=previous;}
});
test('App Studio entrance keeps the source ID and every unrelated native object exactly intact',()=>{
 const base=canvas(),before=JSON.stringify(base),poses=compileStudioAnimation(base,entrance(base),request(base));
 assert.equal(poses.length,2);assert.equal(poses[0].id,base.id);assert.notEqual(poses[1].id,base.id);
 assert.equal(JSON.stringify(base),before);
 for(const pose of poses){
  assert.deepEqual(pose.dimensions,base.dimensions);assert.deepEqual(pose.reference,base.reference);
  for(const id of ['gradient','logo','wordmark'])assert.deepEqual(layer(pose,id),layer(base,id));
  assert.deepEqual(layer(pose,details).value,layer(base,details).value);
  assert.equal(layer(pose,details).editor.motionId,details);
 }
 assert.equal(layer(poses[0],details).editor.opacity,0);assert.equal(layer(poses[0],details).editor.appearance.opacity,0);
 assert.equal(layer(poses[1],details).editor.y,layer(base,details).editor.y);assert.equal(layer(poses[1],details).editor.appearance.opacity,75);
 assert.equal(poses[0].animation.transition,'smart-animate');assert.deepEqual(poses[0].animation,{enabled:true,transition:'smart-animate',...timing});
 assert.equal(canExportAnimation(poses),true);
 assert.deepEqual([...matchingPlaybackBlocks(blocks(poses[0]),blocks(poses[1]))],[[0,0],[1,1],[2,2],[3,3]]);
 const timeline=playbackTimeline(poses);assert.equal(timeline.total,750);assert.equal(playbackPosition(timeline,100).progress,0);assert.equal(playbackPosition(timeline,750).index,1);
 assert.equal(JSON.stringify(JSON.parse(JSON.stringify(poses)).map(pose=>assetSchema.parse(pose))),JSON.stringify(poses.map(pose=>assetSchema.parse(pose))));
});
test('multiple poses accumulate property changes and preserve groups, crops and the original outgoing transition',()=>{
 const base=canvas();layer(base,'logo').editor.groupId='identity';layer(base,'wordmark').editor.groupId='identity';
 layer(base,'logo').value.crop={x:0,y:0,width:100,height:50,sourceWidth:100,sourceHeight:50};
 base.animation={enabled:true,transition:'instant',...timing};
 const plan={summary:'Three poses',initialChanges:[],steps:[{title:'Tilt',changes:[patch('logo','rotationY',30),patch('logo','depth',120),patch('logo','perspective',900),patch('logo','blendMode','plus-lighter')],transition:timing},{title:'Return',changes:[patch('logo','rotationY',0)],transition:{...timing,durationMs:1200,easing:'spring',bounce:50}}]};
 const poses=compileStudioAnimation(base,plan,request(base,{prompt:'Animate in 3 states'}));
 assert.equal(poses.length,3);assert.equal(layer(poses[2],'logo').editor.depth,120);assert.equal(layer(poses[2],'logo').editor.rotationY,0);
 for(const pose of poses){assert.equal(layer(pose,'logo').editor.groupId,'identity');assert.deepEqual(layer(pose,'logo').value,layer(base,'logo').value);assetSchema.parse(pose);}
 assert.deepEqual(poses[2].animation,base.animation);assert.equal(poses[1].animation.durationMs,1200);
});
test('Tech constructions animate native parameters with the existing interpolation and round-trip schema',()=>{
 const base=canvas(),curves=layer(base,'logo');curves.value.src='/tech-blog/cover-curves.svg';curves.techArtwork={...curveDefaults};
 const plan={summary:'Curves',initialChanges:[],steps:[{title:'Spread',changes:[patch('logo','tech.scale',214),patch('logo','tech.spread',65),patch('logo','tech.opacity',60),patch('logo','tech.color','#ff007f')],transition:timing}]};
 const poses=compileStudioAnimation(base,plan,request(base,{workspace:'tech-blog'})),settings=layer(poses[1],'logo').techArtwork;
 assert.equal(settings.scale,214);assert.equal(settings.kind,'curves');assert.equal(settings.preset,'convergence');
 assert.equal(interpolateTechArtwork(curveDefaults,settings,.5).scale,157);
 assetSchema.parse(poses[1]);assert.equal(layer(poses[1],'logo').value.src,curves.value.src);
 curves.techArtwork={...gridDefaults};assert.throws(()=>compileStudioAnimation(base,plan,request(base)),/parameter/);
});
test('selected scope, section locks, unknown layers, unsupported operations and unsafe values reject the whole plan',()=>{
 const base=canvas(),plan=entrance(base),req=request(base,{selectedIds:[details]});
 const invalid=[patch('logo','x',10),patch('missing','x',10),patch(details,'opacity',2),patch(details,'x',NaN),patch(details,'perspective',0),patch(details,'color','url(https://bad)'),patch(details,'blendMode','screen'),patch(details,'text','replace content'),patch(details,'tech.scale',150)];
 for(const change of invalid)assert.throws(()=>validateStudioAnimationPlan({...plan,steps:[{...plan.steps[0],changes:[change]}]},req));
 assert.throws(()=>validateStudioAnimationPlan({...plan,steps:[{...plan.steps[0],changes:[patch(details,'x',1),patch(details,'x',2)]}]},req),/only once/);
 layer(base,details).editor.locked=true;assert.throws(()=>compileStudioAnimation(base,plan,request(base)),/Unlock/);
 layer(base,details).editor.locked=false;base.editor.pages[0].sections[0].locked=true;assert.throws(()=>compileStudioAnimation(base,plan,request(base)),/Unlock/);
});
test('explicit counts, capacity and empty responses cannot partially change a canvas',()=>{
 const base=canvas(),plan=entrance(base);
 assert.throws(()=>compileStudioAnimation(base,plan,request(base,{prompt:'Animate in 4 states'})),/exactly 3/);
 assert.throws(()=>compileStudioAnimation(base,plan,request(base,{availablePageSlots:0})),/room/);
 assert.throws(()=>compileStudioAnimation(base,{...plan,steps:[]},request(base)),/endpoint/);
 assert.deepEqual(compileStudioAnimation(base,{summary:'Which element?',initialChanges:[],steps:[]},request(base)),[]);
});
test('snapshots carry only current editable context, selected sections and no embedded media',()=>{
 const base=canvas();layer(base,'logo').editor.appearance.backgroundImage='data:image/png;base64,PRIVATE';
 const prepared=animationRequest(base,'Animate this','partners','HTML_SELECTION {"sectionId":"canvas","blockIds":[]}',10);
 assert.equal(prepared.payload.workspace,'partners');assert.deepEqual(prepared.payload.selectedIds,blocks(base).map(block=>block.id));
 assert.ok(!JSON.stringify(prepared.payload).includes('PRIVATE'));assert.ok(!JSON.stringify(prepared.payload).includes(base.reference.src));
 assert.throws(()=>animationRequest(base,'Animate this','lovable','HTML_SELECTION broken',10),/again/);
 const blank=canvas();blank.editor.pages[0].sections[0].columns=[[]];assert.throws(()=>animationRequest(blank,'Animate','lovable',undefined,10),/Add an object/);
});
test('collection insertion and one-step undo preserve unrelated assets, their later edits and chat',()=>{
 const before=canvas(),source=canvas(),after=canvas();before.title='Before';after.title='After';
 const original=linkAssetPages([before,source,after]),base=original[1],poses=compileStudioAnimation(base,entrance(base),request(base));
 const collection=replaceAssetPage(original,base.id,poses);
 assert.deepEqual(collection.map(p=>p.id),[before.id,base.id,poses[1].id,after.id]);assert.equal(collection[1].id,base.id);
 collection[3]={...collection[3],title:'Manual edit after animation'};collection[1].messages=[{id:crypto.randomUUID(),user:false,text:'Animation prepared',createdAt:new Date().toISOString()}];
 const restored=restoreAssetArrangement(collection,original,original.map(p=>p.id),base);
 assert.deepEqual(restored.pages.map(p=>p.id),original.map(p=>p.id));assert.deepEqual(restored.pages[1].editor,base.editor);
 assert.equal(restored.pages[1].animation,base.animation);assert.equal(restored.pages[2].title,'Manual edit after animation');assert.equal(restored.pages[1].messages.length,1);
 assert.equal(restored.detached.length,1);assert.equal(restored.detached[0].series,undefined);
 for(const page of [...collection,...restored.pages,...restored.detached])assetSchema.parse(page);
});
test('stale-plan fingerprint ignores chat but detects edits, locks, resize, style and membership',()=>{
 const base=canvas(),key=animationCanvasKey(base);
 assert.equal(animationCanvasKey({...base,updatedAt:22,messages:[{text:'More chat'}]}),key);
 for(const edit of [draft=>draft.dimensions.width++,draft=>draft.background='#123456',draft=>layer(draft,'logo').editor.locked=true,draft=>layer(draft,details).value.runs[0].text='Changed',draft=>draft.series=[{id:crypto.randomUUID(),title:'Changed order'}]]){
  const draft=structuredClone(base);edit(draft);assert.notEqual(animationCanvasKey(draft),key);
 }
});
test('client validates the server plan again and materializes only schema-valid native poses',async()=>{
 const base=canvas(),prepared=animationRequest(base,'Animate the date','lovable',`HTML_SELECTION {"blockIds":["${details}"]}`,10),previous=globalThis.fetch;
 try{
  globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/studio-animation');assert.equal(options.headers['X-Lovable-Local'],'1');return Response.json({plan:entrance(base)});};
  const result=await planCanvasAnimation(prepared,new AbortController().signal);assert.equal(result.poses.length,2);
  globalThis.fetch=async()=>Response.json({plan:{...entrance(base),initialChanges:[patch('logo','opacity',0)]}});
  await assert.rejects(planCanvasAnimation(prepared,new AbortController().signal),/selected/);
  globalThis.fetch=async()=>Response.json({error:'Demo expired'},{status:503});await assert.rejects(planCanvasAnimation(prepared,new AbortController().signal),/expired/);
 }finally{globalThis.fetch=previous;}
});

const env={COMMUNITY_CHAT_PROVIDER:'openai',OPENAI_API_KEY:'fake-test-key',COMMUNITY_OPENAI_PROJECT:'test',COMMUNITY_OPENAI_EXPIRES_AT:new Date(Date.now()+60000).toISOString(),BLOB_READ_WRITE_TOKEN:'fake-test-token',COMMUNITY_BUDGET_PATH:'test'};
const budget={reserve:async()=>'reservation',settle:async()=>{}};
test('provider uses strict declarative output, the existing fixed model and shared reservation path',async()=>{
 const base=canvas(),req=request(base),calls=[];let reserved=0,settled=0;
 const result=await generateStudioAnimation(req,{env,budget:{reserve:async()=>{reserved++;return 'r';},settle:async()=>{settled++;}},fetchImpl:async(url,options)=>{
  calls.push(JSON.parse(options.body));return Response.json({status:'completed',usage:{input_tokens:100,output_tokens:200},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(entrance(base))}]}]});
 }});
 assert.equal(result.plan.steps.length,1);assert.equal(reserved,1);assert.equal(settled,1);
 const body=calls[0];assert.equal(body.model,'gpt-5.4-mini-2026-03-17');assert.equal(body.store,false);assert.equal(body.tools,undefined);assert.equal(body.text.format.strict,true);assert.equal(body.max_output_tokens,12000);
 assert.ok(!JSON.stringify(body).includes(env.OPENAI_API_KEY));assert.match(body.instructions,/place and date/);
});
test('invalid motion gets one correction, with no partial application or silent truncation',async()=>{
 const base=canvas(),req=request(base,{selectedIds:[details]}),calls=[];
 const result=await generateStudioAnimation(req,{env,budget,fetchImpl:async(url,options)=>{
  const body=JSON.parse(options.body);calls.push(body);const plan=calls.length===1?{...entrance(base),initialChanges:[patch('logo','opacity',0)]}:entrance(base);
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(plan)}]}]});
 }});
 assert.equal(calls.length,2);assert.match(calls[1].input[0].content[0].text,/selected layers/);assert.equal(result.plan.steps.length,1);
 let invoked=false;await assert.rejects(generateStudioAnimation(request(base,{prompt:'Animate in 65 states'}),{env,budget,fetchImpl:async()=>{invoked=true;}}),/room/);assert.equal(invoked,false);
});
test('cancelled requests and provider errors cannot apply an animation or leak provider diagnostics',async()=>{
 const base=canvas(),controller=new AbortController();controller.abort();
 await assert.rejects(generateStudioAnimation(request(base),{env,budget,signal:controller.signal,fetchImpl:async()=>{throw Error('Should not call');}}),{name:'AbortError'});
 await assert.rejects(generateStudioAnimation(request(base),{env,budget,fetchImpl:async()=>new Response('private server details',{status:401})}),error=>/key or model permission/.test(error.message)&&!error.message.includes('private server details'));
 await assert.rejects(generateStudioAnimation(request(base),{env:{COMMUNITY_CHAT_PROVIDER:'codex',VERCEL:'1'},runCodex:async()=>entrance(base)}),/local only/);
});
test('local endpoint enforces origin, JSON header and request limits without calling a provider',async()=>{
 let middleware,calls=0;
 const http=createHttpServer((req,res)=>middleware(req,res));
 const plugin=studioAnimationPlugin({checkStatus:async()=>({enabled:true}),generate:async req=>{calls++;return {plan:entrance(canvas())};}});
 plugin.configureServer({httpServer:http,middlewares:{use:(route,handler)=>{assert.equal(route,'/api/studio-animation');middleware=handler;}}});
 await new Promise(resolve=>http.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${http.address().port}/api/studio-animation`;
 try{
  assert.equal((await fetch(url,{headers:{origin:'https://other.example'}})).status,403);
  assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,415);
  const headers={'Content-Type':'application/json','X-Lovable-Local':'1'};
  assert.equal((await fetch(url,{method:'POST',headers,body:'{}'})).status,400);
  assert.equal((await fetch(url,{method:'POST',headers,body:'x'.repeat(500001)})).status,413);assert.equal(calls,0);
  assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify(request(canvas()))})).status,200);assert.equal(calls,1);
 }finally{await new Promise(resolve=>http.close(resolve));}
});
