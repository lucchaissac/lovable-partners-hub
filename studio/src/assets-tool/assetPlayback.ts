import type { AssetDocument } from './model';
import type { HtmlBlock } from '../studio/htmlEditorModel';

// Instant/static pages hold briefly before cutting. Smart transitions use the
// outgoing canvas's saved duration; the last canvas is the resting endpoint.
export function playbackTimeline(pages: AssetDocument[]) {
  let total = 0;
  const segments = pages.slice(0, -1).map((page, index) => {
    const smart = page.animation?.enabled && page.animation.transition === 'smart-animate';
    const motionDuration = smart ? page.animation!.durationMs : 600;
    const delay = page.animation?.enabled ? page.animation.delayMs ?? 0 : 0;
    const duration = motionDuration + delay;
    const segment = { index, start: total, duration, delay, motionDuration, smart: !!smart };
    total += duration;
    return segment;
  });
  return { segments, total, count: pages.length };
}

export function playbackPosition(timeline: ReturnType<typeof playbackTimeline>, time: number) {
  const clamped = Math.max(0, Math.min(timeline.total, time));
  const segment = timeline.segments.find(item => clamped < item.start + item.duration);
  if (!segment) return { index: Math.max(0, timeline.count - 1), progress: 0, smart: false };
  return { index: segment.index, progress: Math.max(0, (clamped - segment.start - segment.delay) / segment.motionDuration), smart: segment.smart };
}

/** A damped spring sampled in normalized time, with exact resting endpoints.
 * Velocity is in travel distances/second; duration still controls the clock. */
export function springProgress(progress: number, bounce = 25, velocity = 0, durationMs = 600) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  const damping = 1 - Math.max(0, Math.min(80, bounce)) / 100;
  const omega = 8 / damping, speed = velocity * durationMs / 1000;
  const response = (t: number) => {
    if (damping >= 1) return 1 - Math.exp(-omega * t) * (1 + (omega - speed) * t);
    const damped = omega * Math.sqrt(1 - damping * damping);
    return 1 - Math.exp(-damping * omega * t) * (Math.cos(damped * t) + (damping * omega - speed) / damped * Math.sin(damped * t));
  };
  return response(progress) + (1 - response(1)) * progress * progress;
}

export function playbackEasing(animation?: AssetDocument['animation']) {
  switch (animation?.easing) {
    case 'linear': return 'linear';
    case 'ease-in': return 'cubic-bezier(.4, 0, 1, 1)';
    case 'ease-out': return 'cubic-bezier(0, 0, .2, 1)';
    case 'custom': return `cubic-bezier(${(animation.curve ?? [.4, 0, .2, 1]).join(', ')})`;
    case 'spring': return `linear(${Array.from({ length: 101 }, (_, i) => springProgress(i / 100, animation.bounce, animation.velocity, animation.durationMs).toFixed(5)).join(', ')})`;
    default: return 'cubic-bezier(.4, 0, .2, 1)';
  }
}

export function canExportAnimation(pages: AssetDocument[]) {
  return pages.length > 1 && pages.slice(0, -1).some(page => page.animation?.enabled);
}

/** Per-thumbnail progress follows the same clock, including backward scrubbing.
 * The last page has no outgoing transition and fills when playback reaches it. */
export function playbackThumbnailProgress(timeline: ReturnType<typeof playbackTimeline>, time: number) {
  const clamped = Math.max(0, Math.min(timeline.total, time));
  return Array.from({ length: timeline.count }, (_, index) => {
    const segment = timeline.segments[index];
    return segment ? Math.max(0, Math.min(1, (clamped - segment.start) / segment.duration)) : Number(clamped >= timeline.total);
  });
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
  // Clipboard/duplicate operations change document IDs but retain the source
  // identity. Pair only unambiguous remaining siblings after exact-ID matches.
  const motionIdentity=(block:HtmlBlock)=>`${block.kind}:${block.editor?.motionId??block.id}`;
  from.forEach((block,index)=>{
    if(matches.has(index))return;
    const key=motionIdentity(block);
    if(from.filter((item,i)=>!matches.has(i)&&motionIdentity(item)===key).length!==1)return;
    const candidates=to.flatMap((item,i)=>!used.has(i)&&motionIdentity(item)===key?[i]:[]);
    if(candidates.length===1){matches.set(index,candidates[0]);used.add(candidates[0]);}
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
