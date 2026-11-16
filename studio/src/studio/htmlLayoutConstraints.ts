import type { ElementFrame, Rect } from './htmlSelectionOperations';
import { resizedElementWidth } from './htmlElementSizing';
export type LayoutItem = { flow?: boolean; minWidth?: number; id: string; frame: ElementFrame; box: Rect; width: number; height: number; parentWidth: number; limits: Rect; obstacles: Rect[] };
const right = (r: Rect) => r.left + r.width, bottom = (r: Rect) => r.top + r.height;
const overlaps = (a: Rect, b: Rect) => a.left < right(b) - .5 && right(a) > b.left + .5 && a.top < bottom(b) - .5 && bottom(a) > b.top + .5;
/** First contact along the entire path prevents jumping through a neighbouring item. */
export function layoutTransition(from: Rect, to: Rect, limits: Rect, obstacles: Rect[]) {
  let fraction = 1;
  const bound = (start: number, end: number, minimum: number) => { if (end < minimum - .01 && end < start - .01) fraction = Math.min(fraction, Math.max(0, (start - minimum) / (start - end))); };
  bound(from.left, to.left, limits.left); bound(from.top, to.top, limits.top);
  bound(-right(from), -right(to), -right(limits)); bound(-bottom(from), -bottom(to), -bottom(limits));
  for (const obstacle of obstacles) {
    // Existing layered artwork (for example a cover behind a logo) remains intact.
    if (overlaps(from, obstacle)) continue;
    let entry = 0, exit = 1;
    const positive = (start: number, end: number) => {
      const delta = end - start;
      if (Math.abs(delta) < 1e-9) { if (start <= 0) exit = -1; return; }
      const crossing = -start / delta;
      if (delta > 0) entry = Math.max(entry, crossing); else exit = Math.min(exit, crossing);
    };
    positive(right(from) - obstacle.left, right(to) - obstacle.left);
    positive(right(obstacle) - from.left, right(obstacle) - to.left);
    positive(bottom(from) - obstacle.top, bottom(to) - obstacle.top);
    positive(bottom(obstacle) - from.top, bottom(obstacle) - to.top);
    if (entry < exit && exit > 0 && entry < fraction) fraction = Math.max(0, entry);
  }
  return Math.max(0, Math.min(1, fraction));
}
export function frameRect(item: LayoutItem, frame: ElementFrame): Rect {
  const width = frame.widthPx ?? (frame.width !== undefined ? item.parentWidth * frame.width / 100 : item.width);
  const height = frame.height ?? item.height;
  const angle = (frame.rotation || 0) * Math.PI / 180;
  const rotatedWidth = Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * height;
  const rotatedHeight = Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * height;
  const centerX = item.box.left + item.box.width / 2 + (frame.x || 0) - (item.frame.x || 0) + (width - item.width) / 2;
  const centerY = item.box.top + item.box.height / 2 + (frame.y || 0) - (item.frame.y || 0) + (height - item.height) / 2;
  return { left: centerX - rotatedWidth / 2, top: centerY - rotatedHeight / 2, width: rotatedWidth, height: rotatedHeight };
}
/** Clamp each axis independently: hitting an edge must not freeze the other axis. */
function boundedFrame(item: LayoutItem, proposed: ElementFrame): { frame: ElementFrame; limits: Rect; obstacles: Rect[] } {
  const frame = { ...item.frame, ...proposed };
  const minimumWidth=frame.position==='absolute'?(item.minWidth||1):Math.min(item.minWidth||1,item.limits.width);
  const requestedWidth=frame.widthPx??(frame.width!==undefined?item.parentWidth*frame.width/100:item.width);
  if(requestedWidth<minimumWidth)Object.assign(frame,resizedElementWidth(frame,minimumWidth,item.parentWidth));
  // Absolute artwork may extend outside the section; rendering clips the pixels,
  // while the selection overlay keeps its full editable bounds.
  if(frame.position==='absolute')return {frame:{...frame,x:Math.max(-4000,Math.min(4000,frame.x||0)),y:Math.max(-4000,Math.min(4000,frame.y||0))},limits:{left:-1e6,top:-1e6,width:2e6,height:2e6},obstacles:[]};
  const rotating = !!frame.rotation || !!item.frame.rotation;
  const proposedWidth = frame.widthPx ?? (frame.width !== undefined ? item.parentWidth * frame.width / 100 : item.width);
  const resizing = Math.abs(proposedWidth - item.width) > .01 || Math.abs((frame.height ?? item.height) - item.height) > .01;
  const flow = item.flow && !rotating && resizing;
  const limits = flow
    ? { ...item.limits, top: item.box.top - (item.frame.y || 0), height: 7000 + item.height }
    : item.limits;
  const obstacles = flow ? [] : item.obstacles;
  if (rotating) return { frame, limits, obstacles };
  const target = frameRect(item, frame);
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(Math.max(min, max), n));
  const axis = (start: number, size: number, oldSize: number, min: number, extent: number, minimum=1) => {
    if (Math.abs(size - oldSize) < .01) return { start: clamp(start, min, min + extent - size), size };
    const first = clamp(start, min, min + extent - minimum);
    return { start: first, size: Math.max(minimum, clamp(start + size, first + minimum, min + extent) - first) };
  };
  const x = axis(target.left, target.width, item.width, limits.left, limits.width,minimumWidth);
  const y = axis(target.top, target.height, item.height, limits.top, limits.height);
  return { frame: { ...frame, ...resizedElementWidth(frame, x.size, item.parentWidth),
    x: (item.frame.x || 0) + x.start - item.box.left,
    y: (item.frame.y || 0) + y.start - item.box.top,
    ...(frame.height !== undefined ? { height: Math.max(12, y.size) } : {}),
  }, limits, obstacles };
}
/** Quantize edits, while retaining precise DOM measurements for collision checks. */
function pixelFrame(item:LayoutItem,frame:ElementFrame,limits:Rect,obstacles:Rect[]):ElementFrame {
  if(frame.rotation||item.frame.rotation)return frame;
  const width=frame.widthPx??(frame.width!==undefined?item.parentWidth*frame.width/100:item.width);
  const height=frame.height??item.height;
  const choices=(n:number)=>[...new Set([Math.floor(n),Math.ceil(n)])];
  const widths=Math.abs(width-item.width)>.01?choices(width):[width];
  const heights=frame.height!==undefined&&Math.abs(height-item.height)>.01?choices(height):[height];
  let best:ElementFrame|undefined,score=Infinity;
  for(const x of choices(frame.x||0))for(const y of choices(frame.y||0))for(const w of widths)for(const h of heights){
    if(w<Math.min(item.minWidth||1,frame.position==='absolute'?Infinity:limits.width)||h<1)continue;
    const candidate={...frame,...resizedElementWidth(frame,w,item.parentWidth),x,y,...(frame.height!==undefined?{height:h}:{})};
    const distance=(x-(frame.x||0))**2+(y-(frame.y||0))**2+(w-width)**2+(h-height)**2;
    if(distance<score&&layoutTransition(item.box,frameRect(item,candidate),limits,obstacles)>=1-1e-9){best=candidate;score=distance;}
  }
  return best||frame;
}
export function constrainLayoutFrames(items: LayoutItem[], proposed: Record<string, ElementFrame>) {
  const bounded = items.filter(item => proposed[item.id]).map(item => ({ item, ...boundedFrame(item, proposed[item.id]) }));
  let fraction = 1;
  for (const {item,frame,limits,obstacles} of bounded) fraction = Math.min(fraction, layoutTransition(item.box, frameRect(item, frame), limits, obstacles));
  return Object.fromEntries(bounded.map(({item,frame:to,limits,obstacles}) => {
    if (fraction >= 1) return [item.id, pixelFrame(item,to,limits,obstacles)];
    const lerp = (a: number, b: number) => a + (b - a) * fraction;
    const width = to.widthPx ?? (to.width !== undefined ? item.parentWidth * to.width / 100 : item.width);
    return [item.id, pixelFrame(item,{ ...to, ...resizedElementWidth(to, lerp(item.width, width), item.parentWidth),
      x: lerp(item.frame.x || 0, to.x || 0), y: lerp(item.frame.y || 0, to.y || 0),
      ...(to.height !== undefined ? { height: lerp(item.height, to.height) } : {}),
      rotation: lerp(item.frame.rotation || 0, to.rotation || 0),
    },limits,obstacles)];
  }));
}
