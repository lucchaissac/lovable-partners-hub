import { useEffect, useMemo, useRef, useState } from 'react';
import type { AssetDocument } from './model';
import { playbackPosition, playbackTimeline, playbackThumbnailProgress } from './assetPlayback';

type Session = { revision: string; time: number; playing: boolean };
export function useAssetPlayback(pages: AssetDocument[], activeId: string, enabled: boolean, onOpen: (id: string) => void) {
  const revision = pages.map(page => `${page.id}:${page.updatedAt}:${JSON.stringify(page.animation)}`).join('|');
  const timeline = useMemo(() => playbackTimeline(pages), [revision]);
  const [session, setSession] = useState<Session>();
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const open = useRef(onOpen); open.current = onOpen;
  const expectedId = useRef(activeId);
  const active = enabled && session?.revision === revision;
  const playing = active && !!session?.playing;
  const selected = Math.max(0, pages.findIndex(page => page.id === activeId));
  const time = active ? session.time : timeline.segments[selected]?.start ?? timeline.total;
  const position = playbackPosition(timeline, time);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => { if (!enabled || session?.revision !== revision) setSession(undefined); }, [enabled, revision]);
  useEffect(() => {
    if (activeId !== expectedId.current) setSession(undefined);
    expectedId.current = activeId;
  }, [activeId]);
  useEffect(() => {
    if (!active) return;
    const id = pages[position.index]?.id;
    if (id && id !== expectedId.current) { expectedId.current = id; open.current(id); }
  }, [active, position.index, revision]);
  useEffect(() => {
    if (!active) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSession(undefined); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [active]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0, previous = performance.now();
    const tick = (now: number) => {
      const elapsed = now - previous; previous = now;
      setSession(current => {
        if (!current?.playing) return current;
        const next = Math.min(timeline.total, current.time + elapsed);
        return { ...current, time: next, playing: next < timeline.total };
      });
      frame = requestAnimationFrame(tick);
    };
    const visibility = () => { if (document.hidden) setSession(current => current && { ...current, playing: false }); };
    frame = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', visibility);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibility); };
  }, [playing, timeline.total]);
  const toggle = () => setSession({ revision, time: time >= timeline.total ? 0 : time, playing: !playing });
  const toggleRef=useRef(toggle);toggleRef.current=toggle;
  useEffect(()=>{
    if(!enabled)return;
    const key=(event:KeyboardEvent)=>{
      if(event.defaultPrevented||event.repeat||event.isComposing||event.code!=='Space'||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
      const target=event.target;
      if(!(target instanceof Element))return;
      const progress=target.matches('input.asset-playback-progress');
      if(!progress&&target.closest('input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=menu],[role=dialog],[role=slider],button:not(.community-page-tile),a'))return;
      event.preventDefault();toggleRef.current();
    };
    window.addEventListener('keydown',key);
    return()=>window.removeEventListener('keydown',key);
  },[enabled]);
  const reset = () => setSession(undefined);
  const jump = (index: number) => { reset(); expectedId.current = pages[index].id; open.current(pages[index].id); };
  return {
    active, playing, time, total: timeline.total, position, reducedMotion, reset, jump,
    thumbnailProgress: active ? playbackThumbnailProgress(timeline, time) : undefined,
    toggle,
    seek: (time: number) => setSession({ revision, time: Math.max(0, Math.min(timeline.total, time)), playing: false }),
  };
}
