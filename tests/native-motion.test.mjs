import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'vite';
import {nativeMotionSchema} from '../shared/nativeMotionSchema.mjs';

// Isolate SSR's dependency cache from a developer's running Vite server.
const cacheDir=await mkdtemp(join(tmpdir(),'native-motion-test-'));
const server=await createServer({root:new URL('../',import.meta.url).pathname,cacheDir,configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
after(async()=>{await server.close();await rm(cacheDir,{recursive:true,force:true});});
const {buildDisplayAdsAssets}=await server.ssrLoadModule('/studio/src/assets-tool/displayAdsAsset.ts');
const {sampleNativeMotion,nativeMotionDuration}=await server.ssrLoadModule('/studio/src/assets-tool/nativeMotion.ts');
const {assetSchema}=await server.ssrLoadModule('/studio/src/assets-tool/model.ts');
const {duplicateAssetPages}=await server.ssrLoadModule('/studio/src/assets-tool/assetSeries.ts');
const {buildScreenDemo,isScreenDemo}=await server.ssrLoadModule('/studio/src/assets-tool/screenDemoModel.ts');
const {materializeScreenComponent,screenComponentBlocks,applyScreenEdits,screenEditRequest}=await server.ssrLoadModule('/studio/src/assets-tool/screenComponent.ts');
const {scaleSelection,patchScaledSelection}=await server.ssrLoadModule('/studio/src/studio/selectionScale.ts');
const {screenImageFromUrl}=await server.ssrLoadModule('/studio/src/assets-tool/screenImageSource.ts');
const prepared=JSON.parse(await readFile(new URL('../examples/screen-demo/prepared.plan.json',import.meta.url),'utf8'));
const png=await readFile(new URL('../examples/display-ads/gradient.png',import.meta.url));
const [asset]=buildDisplayAdsAssets({name:'Gradient',src:`data:image/png;base64,${png.toString('base64')}`,width:240,height:259});
const state=(time,id,motion=asset.motion)=>sampleNativeMotion(motion,time).get(id);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≈ ${b}`);

test('Image URL import reads only explicit image bytes without credentials',async t=>{
 let options,received;
 t.mock.method(globalThis,'fetch',async(url,init)=>{received=url;options=init;return new Response(png,{headers:{'content-type':'image/png'}});});
 const signal=new AbortController().signal,file=await screenImageFromUrl(' https://example.test/screen.png ',signal);
 assert.equal(received,'https://example.test/screen.png');assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.signal,signal);
 assert.equal(file.name,'screen.png');assert.equal(file.type,'image/png');assert.deepEqual(Buffer.from(await file.arrayBuffer()),png);
 await assert.rejects(screenImageFromUrl('javascript:alert(1)',signal),/HTTP/);
 await assert.rejects(screenImageFromUrl('https://user:secret@example.test/image.png',signal),/credentials/);
});
test('Image URL import rejects HTML, unreadable hosts and oversized streamed bodies',async t=>{
 const signal=new AbortController().signal;
 const fetch=t.mock.method(globalThis,'fetch',async()=>new Response('<html/>',{headers:{'content-type':'text/html'}}));
 await assert.rejects(screenImageFromUrl('https://example.test/page',signal),/direct PNG/);
 fetch.mock.mockImplementation(async()=>{throw new TypeError('Failed to fetch');});
 await assert.rejects(screenImageFromUrl('https://example.test/image.png',signal),/choose the image file/);
 let cancelled=false;
 fetch.mock.mockImplementation(async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(12_000_001));},cancel(){cancelled=true;}}),{headers:{'content-type':'image/png'}}));
 await assert.rejects(screenImageFromUrl('https://example.test/image.png',signal),/12 MB/);assert.equal(cancelled,true);
});

test('Import from the normal canvas preserves all existing layers, dimensions and document identity',()=>{
 const original=structuredClone(asset),next=materializeScreenComponent(original,{name:'Screen',src:`data:image/png;base64,${png.toString('base64')}`,width:1710,height:866},prepared);
 const flatten=document=>document.editor.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat()));
 assert.equal(next.id,original.id);assert.deepEqual(next.dimensions,original.dimensions);assert.deepEqual(next.series,original.series);
 assert.deepEqual(flatten(next).filter(block=>!block.id.startsWith('screen-ui-')),flatten(original));
 assert.equal(flatten(next).at(-1).id.startsWith('screen-ui-'),true);
 assert.deepEqual(next.motion.clips.filter(clip=>clip.id!=='screenCamera'),original.motion.clips);
});

test('The 12-second banner types, deletes, replaces, presses Send and lands on the final title',()=>{
 assert.equal(nativeMotionDuration(asset.motion),12000);
 close(state(0,'display-gradient').y,75);
 close(state(1500,'display-gradient').y,0);
 close(state(2000,'display-prompt-copy').characters,100);
 assert.ok(state(4500,'display-prompt-copy').characters<100);
 close(state(5000,'display-prompt-copy').characters,800/'Create a booking app for my yoga studio'.length);
 close(state(6000,'display-prompt-copy').opacity,0);
 close(state(6000,'display-second-copy').opacity,1);
 assert.ok(state(6000,'display-second-copy').characters>20&&state(6000,'display-second-copy').characters<100);
 close(state(7400,'display-second-copy').characters,100);
 close(state(7512,'display-send').scale,.86);
 close(state(9000,'display-intro').opacity,0);
 close(state(9000,'display-final').opacity,1);
 close(state(9000,'display-final').y,0);
 close(state(9000,'display-gradient').y,-70.144);
 close(state(12000,'display-final').opacity,1);
});
test('DialKit timing and curve edits survive source roundtrip and preserve native layer geometry',()=>{
 const geometry=JSON.stringify(asset.editor);
 const edited=assetSchema.parse({...asset,motion:{...asset.motion,values:{'intro.at':9,'intro.y.to':-60,'intro.y.transition':{type:'easing',duration:.68,ease:[0,0,1,1]}}}});
 const reopened=assetSchema.parse(JSON.parse(JSON.stringify(edited)));
 close(state(8000,'display-intro',reopened.motion).y,0);
 close(state(9340,'display-intro',reopened.motion).y,-30);
 close(state(10000,'display-intro',reopened.motion).y,-60);
 assert.equal(JSON.stringify(reopened.editor),geometry);
 assert.deepEqual(state(9340,'display-intro',reopened.motion),state(9340,'display-intro',edited.motion));
 const {pages,ids}=duplicateAssetPages([reopened],[reopened.id],()=> 'independent-copy');
 const copy=pages.find(p=>p.id===ids[0]);
 copy.motion.values['intro.y.to']=-90;
 assert.equal(reopened.motion.values['intro.y.to'],-60);
 assert.equal(copy.editor.pages[0].sections[0].columns[0][0].id,'display-gradient');
});
test('Native motion is bounded data and deterministic when scrubbing backward or exporting frames',()=>{
 assert.equal(nativeMotionSchema.safeParse({...asset.motion,duration:121}).success,false);
 assert.equal(nativeMotionSchema.safeParse({...asset.motion,clips:[{...asset.motion.clips[0],props:{script:{from:0,to:1}}}]}).success,false);
 const original=JSON.stringify(asset);
 for(const time of [0,4500,12000,1000,8180,7400,0]){
  const first=[...sampleNativeMotion(asset.motion,time)];
  assert.deepEqual(first,[...sampleNativeMotion(asset.motion,time)]);
  for(const [,value] of first)for(const number of Object.values(value).filter(v=>typeof v==='number'))assert.ok(Number.isFinite(number));
 }
 assert.equal(JSON.stringify(asset),original);
});

const screenReference={name:'Screen.png',src:`data:image/png;base64,${png.toString('base64')}`,width:1710,height:866};
const screenDemo=()=>materializeScreenComponent(buildScreenDemo(screenReference),screenReference,prepared);
test('Screens become separate editable layers and camera motion keeps one proportional component',()=>{
 const demo=screenDemo(),blocks=screenComponentBlocks(demo),sample=t=>sampleNativeMotion(demo.motion,t,undefined,blocks);
 assert.equal(isScreenDemo(demo),true);assert.equal(isScreenDemo(asset),false);
 assert.ok(blocks.filter(b=>b.kind==='text').length>15);
 assert.ok(blocks.every(b=>b.editor.groupId==='screen-component'));
 assert.equal(blocks.some(b=>b.id==='screen-demo-image'),false);
 assert.equal(nativeMotionDuration(demo.motion),10000);
 assert.deepEqual([...sample(0)],[...sample(10000)]);
 const background=blocks.find(b=>b.id==='screen-ui-background'),title=blocks.find(b=>b.id==='screen-ui-title');
 const position=(b,t)=>b.editor.x+b.editor.widthPx/2+sample(t).get(b.id).x;
 close(position(title,4500)-position(background,4500),(position(title,0)-position(background,0))*1.22);
 assert.equal(sample(4500).has('screen-demo-logo'),false);
});
test('Prompt edits and individual animations preserve unrelated layers and survive source roundtrip',()=>{
 const demo=screenDemo(),original=JSON.stringify(demo),id='screen-ui-title';
 const plan={summary:'Updated',edits:[{id,text:'Build something you love.',color:null,fill:null,fontSize:null,x:null,y:null}],motions:[{id,property:'opacity',from:0,to:1,at:0,duration:1}],clearMotion:false};
 const changed=applyScreenEdits(demo,plan);
 assert.equal(changed.id,demo.id);
 assert.deepEqual(screenComponentBlocks(changed).filter(b=>b.id!==id),screenComponentBlocks(demo).filter(b=>b.id!==id));
 assert.equal(screenComponentBlocks(changed).find(b=>b.id===id).value.runs[0].text,plan.edits[0].text);
 close(sampleNativeMotion(changed.motion,0).get(id).opacity,0);
 close(sampleNativeMotion(changed.motion,1500).get(id).opacity,1);
 assert.deepEqual(assetSchema.parse(JSON.parse(JSON.stringify(changed))),changed);
 assert.equal(JSON.stringify(demo),original);
 const request=screenEditRequest(changed,'Only change the title',`HTML_SELECTION ${JSON.stringify({blockIds:[id]})}`);
 assert.deepEqual(request.selectedIds,[id]);
});
test('Native group resizing scales type, corners and positions with a single factor',()=>{
 const demo=screenDemo(),blocks=screenComponentBlocks(demo);
 const minX=Math.min(...blocks.map(b=>b.editor.x)),minY=Math.min(...blocks.map(b=>b.editor.y));
 const maxX=Math.max(...blocks.map(b=>b.editor.x+b.editor.widthPx)),maxY=Math.max(...blocks.map(b=>b.editor.y+b.editor.height));
 const bounds={left:minX,top:minY,width:maxX-minX,height:maxY-minY};
 const items=blocks.map(b=>({id:b.id,frame:b.editor,box:{left:b.editor.x,top:b.editor.y,width:b.editor.widthPx,height:b.editor.height},width:b.editor.widthPx,height:b.editor.height,parentWidth:1200}));
 const result=scaleSelection(items,blocks,bounds,.75),scaled={...demo,editor:patchScaledSelection(demo.editor,result.frames)};
 close(result.factor,.75);
 for(const b of screenComponentBlocks(scaled)){
  const old=blocks.find(old=>old.id===b.id);
  close(b.editor.widthPx,old.editor.widthPx*.75);close(b.editor.height,old.editor.height*.75);
  if(b.kind==='text')close(b.value.size,old.value.size*.75);
 }
 const sampled=sampleNativeMotion(scaled.motion,4500,undefined,screenComponentBlocks(scaled));
 assert.ok([...sampled.values()].every(value=>Number.isFinite(value.x)&&Number.isFinite(value.y)));
});
test('Reimport keeps the document, external layers and their motion; removing the gradient keeps import mode',()=>{
 const demo=screenDemo();demo.motion.values={'screenCamera.scale.steps.1.to':1.4};
 demo.motion.clips.push({id:'logoFade',label:'Signature',blockIds:['screen-demo-logo'],at:0,props:{opacity:{from:0,to:1,duration:1}}});
 const changed=materializeScreenComponent(demo,screenReference,prepared);
 assert.equal(changed.id,demo.id);
 assert.deepEqual(changed.motion.clips.find(clip=>clip.id==='logoFade'),demo.motion.clips[1]);
 assert.deepEqual(changed.motion.values,demo.motion.values);
 changed.editor.pages[0].sections[0].columns[0]=changed.editor.pages[0].sections[0].columns[0].filter(block=>block.id!=='screen-demo-gradient');
 assert.equal(isScreenDemo(changed),true);
});
