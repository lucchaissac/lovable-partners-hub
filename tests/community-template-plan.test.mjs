import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {compileTemplatePlan} from '../shared/communityTemplatePlan.mjs';
import {communityChatPlugin} from '../server/communityChat.mjs';
const request={prompt:'Create a new Community poster',title:'Event',width:1080,height:1080,startingTemplate:true,blocks:[],sources:[],conversation:[]};
const design={title:'Build together',template:'event-square',width:null,height:null,background:'ink',fields:[{slot:'city',text:'Paris'},{slot:'title',text:'Build something\nlovable.'},{slot:'eventFooter',text:'Meet your local Lovable community.'}],image:null,partners:[],headlineFont:null};
const intent={summary:'Created the approved composition.',replaceCurrent:true,reviews:[],badgeBatch:null,designs:[design],changes:[],additions:[],removeIds:[],mediaRequests:[]};
test('pixel artwork is visible on dark, pink and light proposals without losing event facts',()=>{
 const value={...intent,designs:['ink','#ff0178','white'].map(background=>({...design,background,template:'editorial-pixel',image:{sourceId:background==='#ff0178'?'library-pixel-bloom':'library-pixel-abstraction-dark',crop:null},fields:[{slot:'city',text:'Athens'},{slot:'title',text:'Vibe & build'},{slot:'details',text:'18 November'},{slot:'footer',text:'Vol. IX'}]}))};
 const {plan,templatePlan}=compileTemplatePlan(value,request);
 assert.equal(plan.designs.length,3);
 for(const [index,d] of plan.designs.entries()){
  const light=index===2;
  assert.equal(d.elements.find(e=>e.kind==='image').sourceId,index===1?'library-pixel-bloom':light?'library-pixel-abstraction-dark':'library-pixel-abstraction');
  assert.equal(d.elements.find(e=>e.asset==='community-logo').color,light?'dark':'light');
  assert.ok(d.elements.some(e=>e.text==='18 November'));assert.ok(d.elements.some(e=>e.text==='Vol. IX'));
 }
 assert.deepEqual(compileTemplatePlan(templatePlan,request).plan,plan);
});
test('the approved square starter is compiled deterministically, without model coordinates',()=>{
 const {plan}=compileTemplatePlan(intent,request),d=plan.designs[0],by=key=>d.elements.find(e=>e.id===`d0-${key}`);
 assert.deepEqual([d.width,d.height],[1080,1080]);assert.equal(plan.replaceCurrent,true);
 assert.deepEqual(by('title').frame,{x:43,y:184,width:793,height:439.992,rotation:0,opacity:1});
 assert.equal(by('title').fontSize,160);assert.equal(by('title').letterSpacing,-2.4);
 assert.equal(by('title').lineHeight,146.66666666666663/160*100);
 assert.deepEqual(d.elements.map(e=>e.id),['d0-logo','d0-city','d0-title','d0-globe','d0-glow','d0-eventFooter']);
 assert.equal(by('globe').frame.width,1340);assert.equal(by('glow').frame.rotation,-18.2698);
 assert.equal(intent.designs[0].width,null);
});
test('colored globe scenes and three repeated globe proposals require a corrected plan',()=>{
 assert.throws(()=>compileTemplatePlan({...intent,designs:[{...design,background:'#ff0178'}]},request),/Never place the heart\/globe/);
 assert.throws(()=>compileTemplatePlan({...intent,designs:['ink','white','beige'].map(background=>({...design,background}))},request),/repeat the same visual/);
});
test('Málaga reuses the latest manual artwork and stacked sponsor marks',()=>{
 const value=structuredClone(intent);Object.assign(value.designs[0],{template:'editorial-materials',background:'beige',fields:[{slot:'city',text:'Málaga'},{slot:'title',text:'Let’s\nbuild it.'},{slot:'details',text:'11 December\n19:00–22:00'}],image:{sourceId:'library-mediterranean-materials',crop:null},partners:[{sourceId:'library-malaga-startups',crop:null},{sourceId:'library-startup-oasis',crop:null}]});
 const d=compileTemplatePlan(value,request).plan.designs[0],by=key=>d.elements.find(e=>e.id===`d0-${key}`);
 assert.deepEqual(by('visual').frame,{x:257,y:540,width:1010,height:734,rotation:0,opacity:1});
 assert.equal(by('partner-0').frame.y,841);assert.equal(by('partner-1').frame.y,953);
 assert.equal(by('title').fontSize,192);assert.equal(by('title').lineHeight,92);assert.equal(by('logo').color,'dark');
});
test('a text refinement preserves manual placement and cannot edit unselected or locked objects',()=>{
 const base={...request,startingTemplate:false,blocks:[{id:'my-title',kind:'text',text:'Original',style:{size:180,align:'right',color:'#f7f4ed'},frame:{x:54,y:230,widthPx:900,height:400,appearance:{fontSize:180,lineHeight:92,fontWeight:700,fontFamily:'Camera Plain',letterSpacing:-2.4}}}]};
 const value={...intent,replaceCurrent:false,designs:[],changes:[{id:'my-title',text:'Build together',sourceId:null,fontSize:null,color:null,dx:null,dy:null,rotation:null}]};
 const edit=compileTemplatePlan(value,base).plan.edits[0];assert.equal(edit.frame.x,54);assert.equal(edit.frame.y,230);assert.equal(edit.lineHeight,92);assert.equal(edit.fontSize,180);assert.equal(edit.letterSpacing,-2.4);assert.equal(edit.align,'right');
 assert.throws(()=>compileTemplatePlan(value,{...base,context:'HTML_SELECTION {"blockIds":["another"]}'}),/unselected/);
 base.blocks[0].frame.locked=true;assert.throws(()=>compileTemplatePlan(value,base),/Unlock/);
});
test('event collages keep the approved date below the headline without changing earlier campaign layouts',()=>{
 const value=structuredClone(intent);
 Object.assign(value.designs[0],{template:'editorial-event-collage',background:'beige',fields:[{slot:'city',text:'Athens'},{slot:'title',text:'Vibe &\nbuild'},{slot:'details',text:'18 November\nVol. IX'}],image:{sourceId:'library-paper-collage',crop:null}});
 const d=compileTemplatePlan(value,request).plan.designs[0],by=key=>d.elements.find(e=>e.id===`d0-${key}`);
 assert.deepEqual(by('details').frame,{x:50,y:540,width:426.797,height:170,rotation:0,opacity:1});
 assert.equal(by('details').align,'left');assert.equal(by('title').text,'Vibe &\nbuild');
 assert.equal(by('title').frame.y,150);assert.equal(by('visual').frame.width,1160);assert.equal(by('visual').frame.y,520);
 value.designs[0].template='editorial-collage';value.designs[0].fields.push({slot:'subtitle',text:'Build something that matters'});
 const previous=compileTemplatePlan(value,request).plan.designs[0].elements.find(e=>e.id==='d0-subtitle');
 assert.equal(previous.align,'right');assert.equal(previous.frame.y,330);
});
test('the fourth starter proposal uses the actual source crop and a separate generated image',()=>{
 const source={id:'attachment-0',kind:'image',name:'Poster'};
 const input={...request,sources:[source],prompt:'Refine the current asset using the attached reference. Preserve its essential content.'};
 const fields=[{slot:'city',text:'Athens'},{slot:'title',text:'Vibe &\nbuild'},{slot:'details',text:'18 November\nVol. IX'}];
 const value={...intent,sourceFacts:{title:'Vibe & build',city:'Athens',date:'18 November',edition:'Vol. IX'},designs:[
  {...design,template:'editorial-pixel',fields,image:{sourceId:'library-pixel-abstraction',crop:null}},
  {...design,template:'editorial-photo',fields,image:{sourceId:'library-flash-light',crop:null}},
  {...design,template:'editorial-event-collage',fields,image:{sourceId:'library-paper-collage',crop:null}},
  {...design,template:'editorial-source-object',background:'beige',fields,image:{sourceId:'media-plaque',crop:{x:.1,y:.2,width:.8,height:.5}}},
 ],reviews:[{sourceId:source.id,verdict:'off-brand',diagnosis:'Rebuild the event with its Community identity.',issues:[{area:'identity',problem:'The neon sign replaces the Community signature.',correction:'Use the intact original Community lockup.'}],keep:['Event facts and sign silhouette'],remove:['Original lettering'],retainedVisuals:[],uncertainties:[]}],mediaRequests:[{id:'media-plaque',operation:'edit',prompt:'Reinterpret this sign silhouette as a simple isolated plaque without text or branding.',sourceId:source.id,crop:{x:.1,y:.2,width:.8,height:.5},background:'transparent',color:'#1b1b1b'}]};
 const {plan}=compileTemplatePlan(value,input),fourth=plan.designs[3];
 assert.equal(plan.designs.length,4);assert.equal(fourth.elements.find(e=>e.kind==='image').sourceId,'media-plaque');
 assert.equal(fourth.elements.find(e=>e.kind==='image').crop,null);
 assert.equal(fourth.elements.filter(e=>e.asset==='community-logo').length,1);
 assert.ok(fourth.elements.some(e=>e.kind==='text'&&e.text==='18 November\nVol. IX'));
 for(const d of plan.designs){assert.ok(d.elements.some(e=>e.kind==='text'&&e.text==='Athens'));assert.ok(d.elements.some(e=>e.kind==='text'&&e.text.includes('18 November')));}
 const substituted=structuredClone(value);substituted.designs[3].image.sourceId='library-paper-collage';
 assert.throws(()=>compileTemplatePlan(substituted,input),/fourth proposal/);
 const uncropped=structuredClone(value);uncropped.mediaRequests[0].crop=null;
 assert.throws(()=>compileTemplatePlan(uncropped,input),/focused crop/);
 const typed={...input,prompt:'Make on brand',startingTemplate:false};
 assert.equal(compileTemplatePlan(value,typed).plan.designs.length,4);
 assert.throws(()=>compileTemplatePlan({...value,designs:value.designs.slice(0,1)},typed),/4 complete distinct proposals/);
 const staleFacts=structuredClone(value);
 for(const d of staleFacts.designs)d.fields=[{slot:'city',text:'Paris'},{slot:'title',text:'Vibe & Build vol. IX'},{slot:'details',text:'Example date'}];
 for(const d of compileTemplatePlan(staleFacts,typed).plan.designs){
  assert.ok(d.elements.some(e=>e.text==='Athens'));
  assert.ok(!d.elements.some(e=>e.text==='Paris'||e.text?.includes('Example date')||e.text==='Vibe & Build vol. IX'));
  assert.ok(d.elements.some(e=>e.kind==='text'&&e.text.replace(/\s+/g,' ')==='Vibe & build'));
 }
});
test('generated visual references preserve native identity and never resize the working canvas',()=>{
 const value=structuredClone(intent);Object.assign(value.designs[0],{template:'editorial-nature',image:{sourceId:'media-leaf',crop:null}});
 value.mediaRequests=[{id:'media-leaf',operation:'generate',prompt:'Green leaf macro on transparency',sourceId:null,crop:null,background:'transparent',color:'#1b1b1b'}];
 const {plan}=compileTemplatePlan(value,request);assert.equal(plan.designs[0].width,1080);assert.equal(plan.designs[0].elements.filter(e=>e.kind==='brand'&&e.asset==='community-logo').length,1);assert.equal(plan.designs[0].elements.filter(e=>e.kind==='image').length,1);
 value.mediaRequests[0].operation='edit';value.mediaRequests[0].sourceId='https://attacker.example';assert.throws(()=>compileTemplatePlan(value,request),/actual image/);
});
test('a roll-up uses practical source proportions and only the supplied QR destination',()=>{
 const value=structuredClone(intent);Object.assign(value.designs[0],{template:'banner',fields:[{slot:'headline',text:'Build together'},{slot:'url',text:'https://lovable.dev/community'}]});
 assert.throws(()=>compileTemplatePlan(value,request),/exact link/);
 const {plan}=compileTemplatePlan(value,{...request,prompt:request.prompt+' https://lovable.dev/community'});assert.deepEqual([plan.designs[0].width,plan.designs[0].height],[425,1000]);
});
test('HTTP delivers a layout before image work completes; cancellation stops that work',async t=>{
 let middleware,release;const mediaPending=new Promise(resolve=>release=resolve);let cancelled=false;
 const server=createServer((req,res)=>middleware(req,res));
 communityChatPlugin({checkStatus:async()=>({enabled:true}),generate:async(req,signal,onLayout)=>{signal.addEventListener('abort',()=>{cancelled=true;release();});await onLayout({templatePlan:intent,plan:compileTemplatePlan(intent,request).plan});await mediaPending;signal.throwIfAborted();return {plan:compileTemplatePlan(intent,request).plan,media:[]};}}).configureServer({httpServer:server,middlewares:{use:(_,fn)=>middleware=fn}});
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{release();server.closeAllConnections();server.close();});
 const abort=new AbortController(),response=await fetch(`http://127.0.0.1:${server.address().port}/api/community-chat`,{method:'POST',signal:abort.signal,headers:{'Content-Type':'application/json','X-Lovable-Local':'1',Accept:'application/x-ndjson'},body:JSON.stringify(request)});
 assert.match(response.headers.get('content-type'),/ndjson/);const reader=response.body.getReader(),chunk=await reader.read();assert.equal(JSON.parse(new TextDecoder().decode(chunk.value)).type,'layout');
 abort.abort();await new Promise(resolve=>setTimeout(resolve,30));assert.equal(cancelled,true);
});
test('image edits deterministically replace their source layer and preserve its frame',()=>{
 const value={...intent,replaceCurrent:false,designs:[],changes:[],mediaRequests:[{id:'media-retouch',operation:'edit',prompt:'Retouch this leaf',sourceId:'leaf-photo',crop:null,background:'transparent',color:'#1b1b1b'}]};
 const base={...request,blocks:[{id:'leaf-photo',kind:'image',asset:'image',frame:{x:300,y:430,widthPx:970,height:970}}],canvasImages:[{id:'leaf-photo',image:'data:image/webp;base64,AAAA'}],context:'HTML_SELECTION {"blockIds":["leaf-photo"]}'};
 const edit=compileTemplatePlan(value,base).plan.edits[0];assert.equal(edit.id,'leaf-photo');assert.equal(edit.sourceId,'media-retouch');assert.equal(edit.frame.x,300);assert.equal(edit.frame.width,970);
});
test('reusing a library photograph selects its approved layout and keeps supporting copy above faces',()=>{
 const value=structuredClone(intent);value.designs[0].image={sourceId:'library-flash-light',crop:null};value.designs[0].background='white';
 const result=compileTemplatePlan(value,request);assert.equal(result.templatePlan.designs[0].template,'editorial-photo');
 const d=result.plan.designs[0],subtitle=d.elements.find(e=>e.id==='d0-subtitle');assert.equal(subtitle.align,'right');assert.equal(subtitle.frame.y,180);assert.equal(subtitle.frame.height,135);
 assert.equal(d.elements.find(e=>e.id==='d0-logo').frame.width,407.025);
 const exact=compileTemplatePlan(value,{...request,prompt:'Use the template Event with this picture'});assert.equal(exact.templatePlan.designs[0].template,'event-square');
});
test('portrait templates retain their original sphere and gradient behind the separate portrait',()=>{
 const value=structuredClone(intent);Object.assign(value.designs[0],{template:'spotlight',fields:[{slot:'name',text:'Alex Morgan'},{slot:'city',text:'Paris'}],image:{sourceId:'library-flash-light',crop:null}});
 const d=compileTemplatePlan(value,request).plan.designs[0];assert.equal(d.elements.filter(e=>e.kind==='brand'&&['globe','gradient'].includes(e.asset)).length,2);
 const portrait=d.elements.find(e=>e.kind==='image');assert.equal(portrait.frame.x,64);assert.equal(portrait.frame.y,181.6);assert.equal(portrait.radius,280);
});
test('prepared photo contrast follows the actual photograph rather than the planner palette',()=>{
 const value=structuredClone(intent);value.designs[0].template='editorial-photo';value.designs[0].image={sourceId:'library-flash-light',crop:null};
 const light=compileTemplatePlan(value,request).plan.designs[0];assert.equal(light.background,'white');assert.equal(light.elements.find(e=>e.kind==='text').color,'#1b1b1b');assert.equal(light.elements.find(e=>e.asset==='community-logo').color,'dark');
 value.designs[0].background='white';value.designs[0].image.sourceId='library-flash-dark';
 const dark=compileTemplatePlan(value,request).plan.designs[0];assert.equal(dark.background,'ink');assert.equal(dark.elements.find(e=>e.kind==='text').color,'#f7f4ed');
});
test('replacing a composition absorbs redundant removals of its old layers, while retaining ownership checks',()=>{
 const base={...request,startingTemplate:false,blocks:[{id:'old-title',kind:'text',text:'Old poster'}]};
 const value={...intent,removeIds:['old-title']};
 assert.deepEqual(compileTemplatePlan(value,base).plan.removeIds,[]);
 assert.throws(()=>compileTemplatePlan({...value,removeIds:['unknown']},base),/Create a composition/);
 assert.throws(()=>compileTemplatePlan({...value,replaceCurrent:false},base),/Create a composition/);
 assert.throws(()=>compileTemplatePlan(value,{...base,blocks:[{...base.blocks[0],frame:{locked:true}}]}),/Unlock/);
});
test('a first attached-artwork replacement resolves starter intent before dropping inert old-layer edits',()=>{
 const base={...request,blocks:[{id:'starter-title',kind:'text',text:'Build something lovable.'}]};
 const noop={id:'starter-title',text:null,sourceId:null,fontSize:null,color:null,dx:0,dy:0,rotation:null};
 const value={...intent,replaceCurrent:false,changes:[noop],removeIds:['starter-title']};
 const compiled=compileTemplatePlan(value,base);
 assert.equal(compiled.plan.replaceCurrent,true);
 assert.deepEqual(compiled.plan.edits,[]);assert.deepEqual(compiled.plan.removeIds,[]);
 assert.equal(compiled.plan.designs.length,1);
 assert.deepEqual(compileTemplatePlan(compiled.templatePlan,base).plan,compiled.plan);
 assert.throws(()=>compileTemplatePlan({...value,changes:[{...noop,text:'A meaningful edit'}]},base),/Create a composition/);
 assert.throws(()=>compileTemplatePlan({...value,changes:[{...noop,id:'unknown'}]},base),/Create a composition/);
 assert.throws(()=>compileTemplatePlan(value,{...base,blocks:[{...base.blocks[0],frame:{locked:true}}]}),/Unlock/);
});
test('reusing a prepared photo by its canvas layer ID resolves the master and approved layout without another review',()=>{
 const value=structuredClone(intent);value.designs[0].image={sourceId:'current-photo',crop:null};value.removeIds=['current-photo'];
 const base={...request,startingTemplate:false,blocks:[{id:'current-photo',kind:'image',alt:'Flash · Light'}]};
 const result=compileTemplatePlan(value,base),d=result.plan.designs[0];
 assert.equal(result.templatePlan.designs[0].template,'editorial-photo');assert.equal(d.background,'white');
 assert.equal(d.elements.find(e=>e.kind==='image').sourceId,'library-flash-light');assert.deepEqual(result.plan.reviews,[]);
 assert.throws(()=>compileTemplatePlan(value,{...base,blocks:[{...base.blocks[0],alt:'Unreviewed poster'}]}),/reviewed photograph/);
});
test('an uncropped off-brand poster becomes a complete native replacement instead of a failed request',()=>{
 const source={id:'attachment-0',kind:'image',name:'Vibe & build'};
 const review={sourceId:source.id,verdict:'off-brand',diagnosis:'The source uses an unrelated neon identity.',issues:[{area:'identity',problem:'Community signature is missing.',correction:'Use the full original Community lockup.'}],keep:['Event name and edition'],remove:[],retainedVisuals:[],uncertainties:[]};
 for(const crop of [null,{x:0,y:0,width:1,height:1}]){
  const value=structuredClone(intent);value.reviews=[review];Object.assign(value.designs[0],{fields:[{slot:'title',text:'Vibe & build'},{slot:'eventFooter',text:'Vol. IX'}],image:{sourceId:source.id,crop}});
  const input={...request,sources:[source]},result=compileTemplatePlan(value,input);
  assert.equal(result.templatePlan.designs[0].image,null);
  assert.equal(result.plan.designs[0].elements.some(e=>e.kind==='image'&&e.sourceId===source.id),false);
  assert.ok(result.plan.designs[0].elements.some(e=>e.kind==='text'&&e.text.replace(/\s+/g,' ')==='Vibe & build'));
  assert.ok(result.plan.designs[0].elements.some(e=>e.asset==='community-logo'));
  assert.match(result.plan.summary,/omitted/);
  assert.deepEqual(compileTemplatePlan(result.templatePlan,input).plan,result.plan);
 }
});
test('a valid reviewed crop stays intact and partner marks cannot become the main illustration',()=>{
 const value=structuredClone(intent);value.designs[0].image={sourceId:'library-malaga-startups',crop:null};
 const d=compileTemplatePlan(value,request).plan.designs[0];
 assert.equal(d.visualTreatment,'brand-scene');
 assert.ok(d.elements.some(e=>e.id.includes('partner-')&&e.sourceId==='library-malaga-startups'));
 const crop={x:.05,y:.6,width:.9,height:.25};
 value.designs[0].image={sourceId:'attachment-0',crop};
 value.reviews=[{sourceId:'attachment-0',verdict:'needs-refinement',diagnosis:'Keep the clean photo crop.',issues:[{area:'identity',problem:'Wrong logo.',correction:'Use Community.'}],keep:['Photograph'],remove:['Old identity'],retainedVisuals:[],uncertainties:[]}];
 const result=compileTemplatePlan(value,{...request,sources:[{id:'attachment-0',kind:'image',name:'Poster'}]});
 assert.deepEqual(result.plan.designs[0].elements.find(e=>e.kind==='image'&&e.sourceId==='attachment-0').crop,crop);
});
