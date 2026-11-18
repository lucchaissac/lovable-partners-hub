import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { Artwork } from './Artwork';
import { assetColor, assetDimensions, type AssetDocument } from './model';
import { nativeDocument, REFERENCE_IMAGE } from './nativeDocument';
import { matchingPlaybackBlocks, playbackEasing } from './assetPlayback';

const PreviewArtwork = memo(Artwork);
const appearance = ['color', 'backgroundColor', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'boxShadow', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const;
const geometry = ['left', 'top', 'width', 'height', 'minHeight', 'transform'] as const;
function snapshot(element: Element, frame = false): Keyframe {
  const style = getComputedStyle(element), result: Keyframe = {};
  for (const property of frame ? [...appearance, ...geometry] : [...appearance, 'width', 'height', 'transform', 'opacity', 'fill', 'stroke', 'strokeWidth', 'objectPosition'] as const) result[property] = style[property];
  return result;
}
function blocks(asset: AssetDocument) {
  return nativeDocument(asset).pages[0].sections.flatMap(section => section.columns.flat()).filter(block=>!block.editor?.hidden).map(block =>
    block.kind === 'image' && block.value.src === REFERENCE_IMAGE ? { ...block, value: { ...block.value, src: asset.reference.src } } : block);
}

/** Animate read-only DOM snapshots. Native layers and saved documents stay intact;
 * paused Web Animations provide the same frames for playback and scrubbing. */
export function AssetPlaybackPreview({ from, to, progress, smart, reducedMotion, scale, playing, time, onExit, exporting = false }: {
  from: AssetDocument; to?: AssetDocument; progress: number; smart: boolean; reducedMotion: boolean; scale: number; playing: boolean; time: number; onExit: () => void; exporting?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null), animations = useRef<Animation[]>([]);
  const source = useMemo(() => blocks(from), [from]), target = useMemo(() => to ? blocks(to) : [], [to]);
  const animate = smart && !reducedMotion && !!to;
  useLayoutEffect(() => {
    const host = root.current;
    if (!host || !animate) return;
    const first = [...host.querySelectorAll<HTMLElement>('[data-playback-from] .hev-block')];
    const second = [...host.querySelectorAll<HTMLElement>('[data-playback-to] .hev-block')];
    const matches = matchingPlaybackBlocks(source, target), matched = new Set(matches.values());
    const jobs: { element: Element; start: Keyframe; end: Keyframe }[] = [];
    const add = (element: Element, start: Keyframe, end: Keyframe) => jobs.push({ element, start, end });
    first.forEach((element, i) => {
      const targetIndex = matches.get(i), other = targetIndex === undefined ? undefined : second[targetIndex];
      const opacity = getComputedStyle(element).opacity;
      if (!other) { add(element, { opacity }, { opacity: 0 }); return; }
      const start = snapshot(element, true), end = snapshot(other, true), nextOpacity = getComputedStyle(other).opacity;
      const { id: _fromId, editor: _fromEditor, ...fromContent } = source[i];
      const { id: _toId, editor: _toEditor, ...toContent } = target[targetIndex!];
      const same = JSON.stringify(fromContent) === JSON.stringify(toContent);
      add(element, { ...start, opacity }, { ...end, opacity: same ? nextOpacity : 0 });
      add(other, { ...start, opacity: 0 }, { ...end, opacity: same ? 0 : nextOpacity });
      const children = [...element.querySelectorAll<HTMLElement>('*')], otherChildren = [...other.querySelectorAll<HTMLElement>('*')];
      children.forEach((child, index) => {
        const next = otherChildren[index];
        if (!next || child.tagName !== next.tagName) return;
        const a = snapshot(child), b = snapshot(next);
        if (JSON.stringify(a) === JSON.stringify(b)) return;
        add(child, a, b); add(next, a, b);
      });
    });
    second.forEach((element, i) => { if (!matched.has(i)) add(element, { opacity: 0 }, { opacity: getComputedStyle(element).opacity }); });
    const background = host.querySelector<HTMLElement>('[data-playback-background]')!;
    const destination = host.querySelector<HTMLElement>('[data-playback-background-to]')!;
    add(background, { backgroundColor: getComputedStyle(background).backgroundColor }, { backgroundColor: getComputedStyle(destination).backgroundColor });
    const startSize = assetDimensions(from), endSize = assetDimensions(to!);
    add(host, { width: `${startSize.width}px`, height: `${startSize.height}px` }, { width: `${endSize.width}px`, height: `${endSize.height}px` });
    add(host.parentElement!, { width: `${startSize.width * scale}px`, height: `${startSize.height * scale}px` }, { width: `${endSize.width * scale}px`, height: `${endSize.height * scale}px` });
    animations.current = jobs.map(({ element, start, end }) => {
      const animation = element.animate([start, end], { duration: 1000, fill: 'both', easing: playbackEasing(from.animation) });
      animation.pause(); animation.currentTime = 0; return animation;
    });
    return () => { animations.current.forEach(animation => animation.cancel()); animations.current = []; };
  }, [source, target, animate, scale, from.animation]);
  useLayoutEffect(() => { animations.current.forEach(animation => { animation.currentTime = progress * 1000; }); }, [progress, source, target, animate, scale, from.animation]);
  const mediaTime = useRef(time); mediaTime.current = time;
  useLayoutEffect(() => {
    if (exporting) return;
    const videos = [...(root.current?.querySelectorAll('video') ?? [])];
    for (const video of videos) {
      video.muted = true;
      if (playing && !reducedMotion) void video.play().catch(() => {});
      else video.pause();
    }
    return () => videos.forEach(video => video.pause());
  }, [playing, reducedMotion, source, target, animate, exporting]);
  useLayoutEffect(() => {
    if (playing || reducedMotion || exporting) return;
    const videos = [...(root.current?.querySelectorAll('video') ?? [])];
    const seek = (video: HTMLVideoElement) => { if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = mediaTime.current / 1000 % video.duration; };
    const listeners = videos.map(video => { const loaded = () => seek(video); video.addEventListener('loadedmetadata', loaded); seek(video); return () => video.removeEventListener('loadedmetadata', loaded); });
    return () => listeners.forEach(remove => remove());
  }, [time, playing, reducedMotion, source, target, animate, exporting]);
  const { width, height } = assetDimensions(from);
  return <div className="community-page-stack asset-playback-stack">
    <div className="asset-scaled-board" style={{ width: width * scale, height: height * scale }}>
      <div ref={root} className="asset-playback-preview asset-canvas-transform" style={{ width, height, transform: `scale(${scale})` }} aria-label="Animation preview" onClick={onExit}>
        <div data-playback-background style={{ position: 'absolute', inset: 0, backgroundColor: assetColor(from.background) }}/>
        {animate && <div data-playback-background-to style={{ visibility: 'hidden', position: 'absolute', backgroundColor: assetColor(to!.background) }}/>}
        <div data-playback-from><PreviewArtwork key={from.id} asset={from} scale={scale}/></div>
        {animate && <div data-playback-to><PreviewArtwork key={to!.id} asset={to!} scale={scale}/></div>}
      </div>
    </div>
  </div>;
}
