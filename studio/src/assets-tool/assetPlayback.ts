import type { AssetDocument } from './model';
import type { HtmlBlock } from '../studio/htmlEditorModel';

// Instant/static pages hold briefly before cutting. Smart transitions use the
// outgoing canvas's saved duration; the last canvas is the resting endpoint.
export function playbackTimeline(pages: AssetDocument[]) {
  let total = 0;
  const segments = pages.slice(0, -1).map((page, index) => {
    const smart = page.animation?.enabled && page.animation.transition === 'smart-animate';
    const duration = smart ? page.animation!.durationMs : 600;
    const segment = { index, start: total, duration, smart: !!smart };
    total += duration;
    return segment;
  });
  return { segments, total, count: pages.length };
}

export function playbackPosition(timeline: ReturnType<typeof playbackTimeline>, time: number) {
  const clamped = Math.max(0, Math.min(timeline.total, time));
  const segment = timeline.segments.find(item => clamped < item.start + item.duration);
  if (!segment) return { index: Math.max(0, timeline.count - 1), progress: 0, smart: false };
  return { index: segment.index, progress: (clamped - segment.start) / segment.duration, smart: segment.smart };
}

/** Duplicates retain layer identities. Independent templates can also share a
 * unique image source or identical text; never pair arbitrary unrelated shapes. */
export function matchingPlaybackBlocks(from: HtmlBlock[], to: HtmlBlock[]) {
  const used = new Set<number>();
  const identity = (block: HtmlBlock) => block.kind === 'image' ? `image:${block.value.src}`
    : block.kind === 'text' ? `text:${block.value.runs.map(run => run.text).join('')}` : undefined;
  const matches = new Map<number, number>();
  from.forEach((block, index) => {
    const target = to.findIndex((item, i) => !used.has(i) && item.kind === block.kind && item.id === block.id);
    if (target >= 0) { matches.set(index, target); used.add(target); }
  });
  from.forEach((block, index) => {
    if (matches.has(index)) return;
    const key = identity(block);
    if (!key || from.filter(item => identity(item) === key).length !== 1) return;
    const candidates = to.flatMap((item, i) => !used.has(i) && identity(item) === key ? [i] : []);
    if (candidates.length === 1) { matches.set(index, candidates[0]); used.add(candidates[0]); }
  });
  return matches;
}
