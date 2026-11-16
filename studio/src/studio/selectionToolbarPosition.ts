// Shared placement from the presentation prototype: keep controls outside the selection.
export function selectionToolbarPosition(anchor: {x:number;y:number;left?:number;right?:number;bottom?:number}, visible: {left:number;top:number;width:number;height:number}, size: {width:number;height:number}, inset:number, gap = inset) {
  const leftEdge = visible.left + inset, topEdge = visible.top + inset;
  const rightEdge = Math.max(leftEdge, visible.left + visible.width - inset - size.width);
  const bottomEdge = Math.max(topEdge, visible.top + visible.height - inset - size.height);
  const clamp = (value:number, min:number, max:number) => Math.max(min, Math.min(max, value));
  let left = clamp(anchor.x - size.width / 2, leftEdge, rightEdge);
  let top = anchor.y - size.height - gap;
  if (top < topEdge) {
    const below = anchor.bottom! + gap;
    if (Number.isFinite(below) && below <= bottomEdge) top = below;
    else if (Number.isFinite(anchor.right) && anchor.right! + gap <= rightEdge) {
      left = anchor.right! + gap;
      top = clamp(anchor.y, topEdge, bottomEdge);
    } else if (Number.isFinite(anchor.left) && anchor.left! - gap - size.width >= leftEdge) {
      left = anchor.left! - gap - size.width;
      top = clamp(anchor.y, topEdge, bottomEdge);
    } else top = topEdge;
  }
  return {left: left + size.width / 2, top: Math.min(top, bottomEdge), maxWidth: Math.max(1, visible.width - inset * 2)};
}

/** Long sections keep controls above their top edge, pinning only as it scrolls away. */
export function sectionToolbarPosition(...args: Parameters<typeof selectionToolbarPosition>) {
  const [anchor, visible, size, inset, gap = inset] = args;
  const position = selectionToolbarPosition(...args);
  const topEdge = visible.top + inset;
  const bottomEdge = Math.max(topEdge, visible.top + visible.height - inset - size.height);
  const tall = Number.isFinite(anchor.bottom) && anchor.bottom! - anchor.y + size.height + gap > visible.height - inset * 2;
  const top = tall ? Math.max(topEdge, Math.min(anchor.y - size.height - gap, bottomEdge)) : position.top;
  // Fixed coordinates let the browser keep a pinned toolbar still while
  // document-relative outlines and unpinned controls scroll with the section.
  return { ...position, top, fixed: Math.abs(top - topEdge) < .5 || Math.abs(top - bottomEdge) < .5 };
}
