import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../studio/src/assets-tool/assetPlayback.ts', import.meta.url), 'utf8');
const { playbackTimeline, playbackPosition, matchingPlaybackBlocks } = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')}`);
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
