import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { z } from 'zod';
const source = await readFile(new URL('../studio/src/assets-tool/assetPlayback.ts', import.meta.url), 'utf8');
const { advancePlaybackTime, playbackEndHoldMs, playbackTimeline, playbackPosition, playbackThumbnailProgress, matchingPlaybackBlocks, playbackEasing, playbackEasedProgress, springProgress, canExportAnimation, canExportVideoAsset, videoLoopDuration } = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')}`);
const page = (enabled = true, transition = 'smart-animate', durationMs = 1200) => ({ animation: { enabled, transition, durationMs } });
test('Procedural animation uses the same easing as the DOM, including spring overshoot',()=>{
 assert.equal(playbackEasedProgress(.37,{easing:'linear'}),.37);
 assert.ok(Math.abs(playbackEasedProgress(.5,{easing:'custom',curve:[0,0,1,1]})-.5)<1e-8);
 const spring={easing:'spring',bounce:70,velocity:2,durationMs:800};
 for(let i=0;i<=100;i++)assert.ok(Math.abs(playbackEasedProgress(i/100,spring)-Number(springProgress(i/100,70,2,800).toFixed(5)))<1e-8);
 assert.ok(playbackEasedProgress(.5,{easing:'ease-out'})>.5);
 assert.equal(playbackEasedProgress(1,{easing:'ease-in'}),1);
});

test('Playback uses outgoing settings, cuts Instant pages and reaches the final asset exactly', () => {
  const timeline = playbackTimeline([page(), page(true, 'instant', 9000), page(false), page()]);
  assert.equal(timeline.total, 2400);
  assert.deepEqual(playbackPosition(timeline, 600), { index: 0, progress: .5, smart: true });
  assert.deepEqual(playbackPosition(timeline, 1200), { index: 1, progress: 0, smart: false });
  assert.equal(playbackPosition(timeline, 1800).index, 2);
  assert.deepEqual(playbackPosition(timeline, 2400), { index: 3, progress: 0, smart: false });
  assert.deepEqual(playbackPosition(timeline, 99999), playbackPosition(timeline, 2400));
  assert.equal(playbackPosition(timeline, -100).progress, 0);
  assert.equal(playbackTimeline([page()]).total, 0);
});
test('Smart matching preserves identities through reordering and content changes without mutating layers', () => {
  const a = [{ id: 'title', kind: 'text', value: { runs: [{ text: 'Before' }] } }, { id: 'logo', kind: 'image', value: { src: '/logo.svg' } }];
  const b = [{ ...a[1], editor: { x: 800 } }, { ...a[0], value: { runs: [{ text: 'After' }] }, editor: { x: 100 } }];
  const before = JSON.stringify([a, b]);
  assert.deepEqual([...matchingPlaybackBlocks(a, b)], [[0, 1], [1, 0]]);
  assert.equal(JSON.stringify([a, b]), before);
});
test('Independent assets match unique shared media, never ambiguous copies or unrelated shapes', () => {
  const image = (id, src) => ({ id, kind: 'image', value: { src } });
  const a = [image('a', '/logo.svg'), image('b', '/photo.jpg'), { id: 'shape-a', kind: 'shape' }];
  const b = [image('c', '/logo.svg'), image('d', '/photo.jpg'), image('e', '/photo.jpg'), { id: 'shape-b', kind: 'shape' }];
  assert.deepEqual([...matchingPlaybackBlocks(a, b)], [[0, 0]]);
  assert.equal(matchingPlaybackBlocks([image('same', '/a')], [{ id: 'same', kind: 'shape' }]).size, 0);
});
test('Thumbnail bars follow Smart and Instant timing, finish together and rewind with scrubbing', () => {
  const timeline = playbackTimeline([page(), page(true, 'instant'), page()]);
  assert.deepEqual(playbackThumbnailProgress(timeline, 0), [0, 0, 0]);
  assert.deepEqual(playbackThumbnailProgress(timeline, 600), [.5, 0, 0]);
  assert.deepEqual(playbackThumbnailProgress(timeline, 1200), [1, 0, 0]);
  assert.deepEqual(playbackThumbnailProgress(timeline, 1500), [1, .5, 0]);
  assert.deepEqual(playbackThumbnailProgress(timeline, 1800), [1, 1, 1]);
  assert.deepEqual(playbackThumbnailProgress(timeline, 300), [.25, 0, 0]);
  assert.deepEqual(playbackThumbnailProgress(timeline, -1), [0, 0, 0]);
  assert.deepEqual(playbackThumbnailProgress(timeline, 99999), [1, 1, 1]);
});
test('Delay holds the outgoing canvas while its thumbnail clock advances', () => {
  const delayed = page(); delayed.animation.delayMs = 300;
  const timeline = playbackTimeline([delayed, page(true, 'instant'), page()]);
  assert.equal(timeline.total, 2100);
  assert.equal(playbackPosition(timeline, 200).progress, 0);
  assert.equal(playbackPosition(timeline, 300).progress, 0);
  assert.equal(playbackPosition(timeline, 900).progress, .5);
  assert.deepEqual(playbackThumbnailProgress(timeline, 300), [.2, 0, 0]);
  assert.equal(playbackPosition(timeline, 1500).index, 1);
  delayed.animation.enabled = false;
  assert.equal(playbackTimeline([delayed, page()]).total, 600);
});
test('Easing preserves legacy timing, custom overshoot and controllable spring momentum', () => {
  assert.equal(playbackEasing(), 'cubic-bezier(.4, 0, .2, 1)');
  assert.equal(playbackEasing({easing:'linear'}), 'linear');
  assert.equal(playbackEasing({easing:'custom',curve:[.2,-.3,.7,1.4]}), 'cubic-bezier(0.2, -0.3, 0.7, 1.4)');
  for (const bounce of [0,25,80]) for (const velocity of [-10,0,10]) {
    assert.equal(springProgress(0,bounce,velocity),0);
    assert.equal(springProgress(1,bounce,velocity),1);
    for(let i=0;i<=100;i++)assert.ok(Number.isFinite(springProgress(i/100,bounce,velocity)));
  }
  assert.ok(springProgress(.2,60)>1);
  assert.ok(springProgress(.05,25,4)>springProgress(.05,25,0));
  assert.ok(springProgress(.2,0)<1);
  assert.match(playbackEasing({easing:'spring',bounce:50,velocity:2,durationMs:1200}),/^linear\(0\.00000,.*1\.00000\)$/);
});
test('Video export is offered only for an enabled outgoing animation', () => {
  assert.equal(canExportAnimation([]),false);
  assert.equal(canExportAnimation([page()]),false);
  assert.equal(canExportAnimation([page(false),page()]),false);
  assert.equal(canExportAnimation([page(false),page(false)]),false);
  assert.equal(canExportAnimation([page(true,'instant'),page(false)]),true);
  assert.equal(canExportAnimation([page(),page(false)]),true);
});
test('Saved legacy settings gain defaults and custom motion survives source round trips', async () => {
  const model = await readFile(new URL('../studio/src/assets-tool/model.ts', import.meta.url), 'utf8');
  const declaration = model.slice(model.indexOf('export const canvasAnimationSchema'), model.indexOf('export const defaultCanvasAnimation')).replace('export const', 'const');
  const schema = new Function('z', `${declaration}; return canvasAnimationSchema;`)(z);
  const legacy = schema.parse({enabled:true,transition:'smart-animate',durationMs:1200});
  assert.equal(legacy.delayMs,0); assert.equal(legacy.easing,'ease-in-out');
  const custom = {...legacy,delayMs:400,easing:'custom',curve:[.1,-.2,.8,1.4],bounce:45,velocity:-2};
  assert.deepEqual(schema.parse(JSON.parse(JSON.stringify(custom))),custom);
  for(const invalid of [{curve:[-1,0,1,1]},{delayMs:-1},{bounce:200},{velocity:Infinity}])assert.equal(schema.safeParse({...legacy,...invalid}).success,false);
});

test('Copied objects keep motion identity across pages, edits and successive copies',async()=>{
 const load=async path=>{const text=await readFile(new URL(path,import.meta.url),'utf8');return import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`);};
 const {copiedCanvasBlocks,pasteCanvasBlocks}=await load('../studio/src/studio/canvasClipboard.ts');
 const {htmlSelectionAction}=await load('../studio/src/studio/htmlSelectionOperations.ts');
 const source=[{id:'icon',kind:'shape',shape:'rectangle',icon:'heart',editor:{position:'absolute',x:10,y:20,widthPx:100,height:100,groupId:'group'}},{id:'text',kind:'text',value:{runs:[{text:'Before'}],size:32},editor:{x:150,y:20,widthPx:200,height:80,groupId:'group'}}];
 const empty={pages:[{id:'page',sections:[{id:'section',columns:[[]]}]}]};let id=0;
 const pasted=pasteCanvasBlocks(empty,'page',copiedCanvasBlocks(source),1200,675,()=>`copy-${++id}`).state.pages[0].sections[0].columns[0];
 assert.notEqual(pasted[0].id,'icon');assert.equal(pasted[0].editor.motionId,'icon');
 assert.notEqual(pasted[0].editor.groupId,'group');assert.equal(pasted[0].editor.groupId,pasted[1].editor.groupId);
 pasted[0].icon='star';pasted[0].editor.x=800;pasted[1].value.runs[0].text='After';
 assert.deepEqual([...matchingPlaybackBlocks(source,pasted)],[[0,0],[1,1]]);
 const third=pasteCanvasBlocks(empty,'page',JSON.parse(JSON.stringify(pasted)),1200,675,()=>`copy-${++id}`).state.pages[0].sections[0].columns[0];
 assert.deepEqual([...matchingPlaybackBlocks(source,third)],[[0,0],[1,1]]);
 assert.deepEqual([...matchingPlaybackBlocks(pasted,third)],[[0,0],[1,1]]);
 const state={pages:[{id:'page',sections:[{id:'section',columns:[source]}]}]};
 const duplicate=htmlSelectionAction(state,['icon'],'duplicate',()=>`duplicate-${++id}`).state.pages[0].sections[0].columns[0].find(block=>block.id.startsWith('duplicate-'));
 assert.equal(duplicate.editor.motionId,'icon');
 assert.deepEqual([...matchingPlaybackBlocks([source[0]],[duplicate])],[[0,0]]);
 assert.equal(source[0].editor.motionId,undefined);assert.equal(source[1].value.runs[0].text,'Before');
});
test('Exact identity wins over copied ancestry and ambiguous siblings never animate to arbitrary targets',()=>{
 const a={id:'a',kind:'shape',shape:'rectangle'},copy={...a,id:'copy',editor:{motionId:'a'}};
 assert.deepEqual([...matchingPlaybackBlocks([a],[copy,a])],[[0,1]]);
 assert.equal(matchingPlaybackBlocks([a],[copy,{...copy,id:'copy2'}]).size,0);
 assert.equal(matchingPlaybackBlocks([copy,{...copy,id:'copy2'}],[a]).size,0);
});

test('Loop playback holds the final pose, wraps without drift and stops when switched off',()=>{
 assert.equal(playbackEndHoldMs,600);
 assert.deepEqual(advancePlaybackTime(900,200,1000,true),{time:1100,playing:true});
 assert.equal(playbackPosition(playbackTimeline([page(true,'smart-animate',1000),page()]),1100).index,1);
 assert.deepEqual(advancePlaybackTime(1590,20,1000,true),{time:10,playing:true});
 assert.deepEqual(advancePlaybackTime(10,4800,1000,true),{time:10,playing:true});
 assert.deepEqual(advancePlaybackTime(900,200,1000,false),{time:1000,playing:false});
 assert.deepEqual(advancePlaybackTime(1100,16,1000,false),{time:1000,playing:false});
 assert.deepEqual(advancePlaybackTime(0,16,0,true),{time:0,playing:false});
});


test('A single visible native video can export independently from its collection', () => {
  const video = {id:'motion',kind:'media',format:'Video',src:'/loop.mp4',editor:{}};
  const asset = block => ({editor:{pages:[{sections:[{columns:[[block]]}]}]}});
  assert.equal(canExportVideoAsset(asset(video)),true);
  assert.equal(canExportVideoAsset(asset({...video,editor:{hidden:true}})),false);
  assert.equal(canExportVideoAsset(asset({...video,src:'https://www.youtube.com/watch?v=example'})),false);
  assert.equal(canExportVideoAsset(asset({...video,kind:'image',value:{src:'/poster.png'}})),false);
  assert.equal(canExportVideoAsset({}),false);
});
test('Video posts complete all source cycles without a slideshow hold or duplicated endpoint', () => {
  assert.equal(videoLoopDuration([8,8]),8000);
  assert.equal(videoLoopDuration([4,6]),12000);
  assert.equal(videoLoopDuration([8.00001,8]),8000);
  for(const invalid of [[],[NaN],[0],[-1],[Infinity],[61],[7.99,8]]) assert.throws(()=>videoLoopDuration(invalid));
  const duration=videoLoopDuration([8,8]), frames=duration/1000*30;
  assert.equal(frames,240);
  assert.equal((frames-1)/frames*duration,7966.666666666667);
});
