import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { z } from 'zod';
const source = await readFile(new URL('../studio/src/assets-tool/assetPlayback.ts', import.meta.url), 'utf8');
const { playbackTimeline, playbackPosition, playbackThumbnailProgress, matchingPlaybackBlocks, playbackEasing, springProgress, canExportAnimation } = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')}`);
const page = (enabled = true, transition = 'smart-animate', durationMs = 1200) => ({ animation: { enabled, transition, durationMs } });

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
