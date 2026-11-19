import { createContext, useContext, useEffect, useRef } from 'react';
import { mediaWindowStyles, type VideoBlock } from './mediaWindow';

export const CanvasVideoPlaybackContext = createContext(false);

/** Thumbnails and PNGs retain the authored still; playback/export decode the real video. */
export function HtmlCanvasVideo({ block, editable }: { block: VideoBlock; editable: boolean }) {
  const playback = useContext(CanvasVideoPlaybackContext), video = useRef<HTMLVideoElement>(null);
  const { frame, content } = mediaWindowStyles(block);
  useEffect(() => {
    const element = video.current;
    if (!element || playback) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const update = () => {
      if (visible && !document.hidden && !reduced.matches && block.autoplay !== false) void element.play().catch(() => {});
      else element.pause();
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); });
    observer.observe(element); reduced.addEventListener('change', update); document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); reduced.removeEventListener('change', update); document.removeEventListener('visibilitychange', update); element.pause(); };
  }, [block.autoplay, block.src, playback]);
  return <div data-media-window style={frame}>
    {!editable && !playback && block.poster ? <img className="hev-media-frame" src={block.poster} alt={block.name} style={content}/>
      : <video ref={video} className="hev-media-frame" aria-label={block.name} src={block.src} poster={block.poster} style={content} muted loop playsInline preload={playback || block.autoplay !== false ? 'auto' : 'none'}/>}
  </div>;
}
