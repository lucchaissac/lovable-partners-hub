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
const png=await readFile(new URL('../examples/display-ads/gradient.png',import.meta.url));
const [asset]=buildDisplayAdsAssets({name:'Gradient',src:`data:image/png;base64,${png.toString('base64')}`,width:240,height:259});
const state=(time,id,motion=asset.motion)=>sampleNativeMotion(motion,time).get(id);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≈ ${b}`);

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
