import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server=await createServer({configFile:false,server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
const {shaderEffectSchema,newShaderEffect}=await server.ssrLoadModule('/studio/src/shaders/settings.ts');
const {htmlEditorSchema}=await server.ssrLoadModule('/studio/src/studio/htmlEditorModel.ts');
const {assetHasAnimatedEffect,canExportAnimation,playbackTimeline,playbackPosition}=await server.ssrLoadModule('/studio/src/assets-tool/assetPlayback.ts');
const {silhouetteDistance}=await server.ssrLoadModule('/studio/src/shaders/normalMap.ts');
await server.close();
const text={id:'title',kind:'text',value:{runs:[{text:'Make\nmore.'}],style:'Text',size:160,align:'left',color:'#fff'},editor:{position:'absolute',x:45,y:160,widthPx:990,height:370,appearance:{fontFamily:'Camera Plain',fontWeight:700,lineHeight:88,shader:newShaderEffect('chrome')}}};
const editor={version:1,pages:[{id:'page',name:'Demo',sections:[{id:'scene',name:'Scene',background:'transparent',padding:0,columns:[[text]],gap:0}]}]};
test('Effects round-trip without flattening native text or changing its approved geometry',()=>{
 const saved=htmlEditorSchema.parse(JSON.parse(JSON.stringify(editor)));
 assert.deepEqual(saved.pages[0].sections[0].columns[0][0],text);
 const copy=structuredClone(saved);delete copy.pages[0].sections[0].columns[0][0].editor.appearance.shader;
 const original=structuredClone(text);delete original.editor.appearance.shader;
 assert.deepEqual(copy.pages[0].sections[0].columns[0][0],original);
});
test('Only known presets and bounded settings can enter a saved document',()=>{
 assert.equal(shaderEffectSchema.safeParse({preset:'custom',source:'alert(1)'}).success,false);
 for(const patch of [{speed:-1},{speed:201},{intensity:101},{source:'code'}])assert.equal(shaderEffectSchema.safeParse({...newShaderEffect('glass'),...patch}).success,false);
});
test('A single animated layer gains a four-second export without requiring a second asset',()=>{
 const asset={editor};assert.equal(assetHasAnimatedEffect(asset),true);assert.equal(canExportAnimation([asset]),true);
 const timeline=playbackTimeline([asset]);assert.equal(timeline.total,4000);
 assert.deepEqual(playbackPosition(timeline,2000),{index:0,progress:0,smart:false});
 assert.equal(playbackPosition(timeline,4000).index,0);
});
test('Static, zero-strength and hidden effects do not add an animation',()=>{
 for(const patch of [{animated:false},{speed:0},{intensity:0}])assert.equal(canExportAnimation([{shader:{...newShaderEffect('ripple'),...patch}}]),false);
 const hidden=structuredClone(editor);hidden.pages[0].sections[0].columns[0][0].editor.hidden=true;
 assert.equal(canExportAnimation([{editor:hidden}]),false);
});
test('Effect holds preserve the existing transition duration and final endpoint',()=>{
 const first={shader:newShaderEffect('glass'),animation:{enabled:true,transition:'smart-animate',durationMs:800,delayMs:200}};
 const timeline=playbackTimeline([first,{}]);assert.equal(timeline.total,5000);
 assert.equal(playbackPosition(timeline,4100).progress,0);assert.equal(playbackPosition(timeline,4600).progress,.5);assert.equal(playbackPosition(timeline,5000).index,1);
});

test('Text relief follows the alpha silhouette and retains interior holes',()=>{
 const w=7,h=7,alpha=new Uint8ClampedArray(w*h*4);
 for(let y=1;y<6;y++)for(let x=1;x<6;x++)alpha[(y*w+x)*4+3]=255;
 const distance=silhouetteDistance(alpha,w,h);
 assert.equal(distance[0],0);assert.equal(distance[3*w+3],3);assert.equal(distance[1*w+1],1);
 alpha[(3*w+3)*4+3]=0;const hole=silhouetteDistance(alpha,w,h);
 assert.equal(hole[3*w+3],0);assert.equal(hole[3*w+2],1);assert.ok(Math.abs(hole[2*w+2]-Math.sqrt(2))<.00001);
});
