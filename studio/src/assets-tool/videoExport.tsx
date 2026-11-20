import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { toCanvas } from 'html-to-image';
import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality, WebMOutputFormat, canEncodeVideo } from 'mediabunny';
import { AssetPlaybackPreview } from './AssetPlaybackPreview';
import {NativeMotionPreview} from './NativeMotionPreview';
import {nativeMotionDuration} from './nativeMotion';
import { canExportAnimation, canExportVideoAsset, newsletterAnimationGlobe, videoLoopDuration, playbackPosition, playbackTimeline, playbackEndHoldMs } from './assetPlayback';
import { assetDimensions, type AssetDocument } from './model';
import { embeddedAssetFonts, filename } from './media';

/** Fixed output frame; mixed page sizes fit without distortion. Never upscale. */
export function videoDimensions(asset: AssetDocument) {
  const size = assetDimensions(asset), scale = Math.min(1, 1920 / Math.max(size.width, size.height), Math.sqrt(2_073_600 / (size.width * size.height)));
  return { width: Math.ceil(size.width * scale / 2) * 2, height: Math.ceil(size.height * scale / 2) * 2 };
}

function waitForMedia(video: HTMLVideoElement, event: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const clean = () => { clearTimeout(timer); video.removeEventListener(event, done); video.removeEventListener('error', fail); signal.removeEventListener('abort', abort); };
    const done = () => { clean(); resolve(); };
    const fail = () => { clean(); reject(new Error('A video layer could not be decoded. Please replace it and retry.')); };
    const abort = () => { clean(); reject(signal.reason); };
    const timer = setTimeout(fail, 15_000);
    video.addEventListener(event, done, { once: true }); video.addEventListener('error', fail, { once: true }); signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

async function seekVideos(element: HTMLElement, time: number, signal: AbortSignal) {
  await Promise.all([...element.querySelectorAll('video')].map(async video => {
    video.pause(); video.muted = true;
    if (video.readyState < 2) { const loaded = waitForMedia(video, 'loadeddata', signal); video.preload = 'auto'; video.load(); await loaded; }
    if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('A video layer has no readable duration.');
    const target = time / 1000 % video.duration;
    if (Math.abs(video.currentTime - target) < .001) return;
    const seeked = waitForMedia(video, 'seeked', signal); video.currentTime = target; await seeked;
  }));
}

/** Capture each decoded video at its intrinsic ratio before HTML rasterization.
 * The screenshot library otherwise stretches video pixels to its element box,
 * losing cover/contain cropping. These canvases exist only during capture. */
function snapshotVideos(board: HTMLElement) {
  const replacements = [...board.querySelectorAll('video')].map(video => {
    const canvas = document.createElement('canvas'), ratio = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * ratio)); canvas.height = Math.max(1, Math.round(video.videoHeight * ratio));
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const style = getComputedStyle(video);
    for (const property of style) canvas.style.setProperty(property, style.getPropertyValue(property));
    video.replaceWith(canvas);
    return () => { canvas.replaceWith(video); canvas.width = 0; canvas.height = 0; };
  });
  return () => replacements.forEach(restore => restore());
}

/** Offline frame encoding: timing never depends on drawing speed. Only one
 * raster frame is held at a time; fonts/resources and static holds are reused.
 * The same composited DOM as preview retains CSS blend modes and native type. */
export async function exportVideo(pages: AssetDocument[], parent: HTMLElement, signal: AbortSignal, onProgress: (percent: number) => void, mode: 'sequence' | 'asset' = 'sequence') {
  const single = mode === 'asset';
  if(import.meta.env.DEV&&single&&pages.length===1&&newsletterAnimationGlobe(pages[0])){
    const {exportNewsletterVideo}=await import('./newsletterVideoExport');
    return exportNewsletterVideo(pages[0],parent,signal,onProgress);
  }
  if (single ? pages.length !== 1 || !canExportVideoAsset(pages[0]) : !canExportAnimation(pages)) throw new Error(single ? 'Add a video layer to this asset first.' : 'Enable animation on an asset with a following asset first.');
  const { width, height } = videoDimensions(pages[0]), frameRate = 30;
  const quality = new Quality({ bitrate: Math.max(2_000_000, Math.round(width * height * frameRate * .16)) });
  const config = { width, height, quality, frameRate };
  const codec = await canEncodeVideo('avc', config) ? 'avc' : await canEncodeVideo('vp9', config) ? 'vp9' : undefined;
  if (!codec) throw new Error('Video export is unavailable in this browser. Try a current Chrome, Edge or Safari browser.');
  signal.throwIfAborted();
  const target = new BufferTarget(), format = codec === 'avc' ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat();
  const output = new Output({ format, target });
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Could not prepare video export.');
  const source = new CanvasSource(canvas, { codec, quality, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate });
  const host = document.createElement('div'); parent.append(host);
  const root = createRoot(host);
  const timeline = playbackTimeline(pages);
  let lastFrame = '', lastIndex = -1, lastPercent = -1, finished = false;
  try {
    await document.fonts.ready;
    const fontEmbedCSS = [...new Set(await Promise.all(pages.map(embeddedAssetFonts)))].join('\n');
    let duration = timeline.total + playbackEndHoldMs;
    if (single) {
      flushSync(() => root.render(<AssetPlaybackPreview from={pages[0]} progress={0} smart={false} reducedMotion={false} scale={1} playing={false} time={0} onExit={() => {}} exporting/>));
      await seekVideos(host, 0, signal);
      duration = pages[0].motion?nativeMotionDuration(pages[0].motion):videoLoopDuration([...host.querySelectorAll('video')].map(video => video.duration));
    }
    const frames = Math.max(1, single ? Math.round(duration / 1000 * frameRate) : Math.ceil(duration / 1000 * frameRate));
    await output.start();
    for (let frame = 0; frame < frames; frame++) {
      signal.throwIfAborted();
      // Sample one open interval [0, duration): the next frame is the first frame
      // of the next cycle, not a duplicated endpoint or a frozen final image.
      const time = single ? frame / frames * duration : Math.min(timeline.total, frame / frameRate * 1000);
      const position = single ? { index: 0, progress: 0, smart: false } : playbackPosition(timeline, time);
      const from = pages[position.index], to = pages[position.index + 1];
      flushSync(() => root.render(single&&from.motion?<NativeMotionPreview asset={from} time={time} scale={1} onExit={()=>{}} exporting/>:<AssetPlaybackPreview from={from} to={to} {...position} reducedMotion={false} scale={1} playing={false} time={time} onExit={() => {}} exporting/>));
      const board = host.querySelector<HTMLElement>('.asset-playback-preview')!;
      if (lastIndex !== position.index) {
        await Promise.all([...board.querySelectorAll('img')].map(image => image.decode()));
        lastIndex = position.index;
      }
      const videos = board.querySelector('video');
      if (videos) await seekVideos(board, time, signal);
      const key = `${position.index}:${position.smart ? position.progress : 0}:${videos||(single&&from.motion) ? time : ''}`;
      if (key !== lastFrame) {
        // html-to-image deep-clones SVG without visiting its children. Bake
        // their sampled styles into this disposable export DOM so animated
        // icon fills/strokes are captured just like HTML layer styles.
        for (const element of board.querySelectorAll<SVGElement>('svg *')) {
          const style = getComputedStyle(element);
          for (const property of ['fill', 'stroke', 'stroke-width', 'opacity', 'transform', 'transform-origin', 'color', 'font-size', 'font-weight', 'letter-spacing']) element.style.setProperty(property, style.getPropertyValue(property));
        }
        const bounds = board.getBoundingClientRect();
        // A custom overshoot may briefly collapse a changing canvas dimension.
        const frameWidth = Math.max(1, bounds.width), frameHeight = Math.max(1, bounds.height), scale = Math.min(width / frameWidth, height / frameHeight);
        const restoreVideos = snapshotVideos(board);
        let frameCanvas: HTMLCanvasElement;
        try {
          frameCanvas = await toCanvas(board, { width: frameWidth, height: frameHeight, canvasWidth: Math.max(1, Math.round(frameWidth * scale)), canvasHeight: Math.max(1, Math.round(frameHeight * scale)), pixelRatio: 1, fontEmbedCSS, style: { transform: 'none', margin: '0' }, filter: node => !(node instanceof Element && node.hasAttribute('data-editor-only')) });
        } finally { restoreVideos(); }
        context.fillStyle = getComputedStyle(board.querySelector('[data-playback-background]')!).backgroundColor;
        context.fillRect(0, 0, width, height);
        // H.264 needs even dimensions. Keep odd-sized artwork on whole pixels;
        // a half-pixel centering offset would soften every native text edge.
        context.drawImage(frameCanvas, Math.floor((width - frameCanvas.width) / 2), Math.floor((height - frameCanvas.height) / 2));
        frameCanvas.width = 0; frameCanvas.height = 0;
        lastFrame = key;
      }
      signal.throwIfAborted();
      const frameDuration = single ? duration / 1000 / frames : 1 / frameRate;
      await source.add(frame * frameDuration, Math.min(frameDuration, duration / 1000 - frame * frameDuration));
      const percent = Math.min(99, Math.round((frame + 1) / frames * 100));
      if (percent !== lastPercent) { onProgress(percent); lastPercent = percent; }
      // Give input/cancel handlers a turn even while reusing static frames.
      if (frame % 5 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    await output.finalize(); signal.throwIfAborted(); finished = true;
    onProgress(100);
    return { blob: new Blob([target.buffer!], { type: format.mimeType }), name: `${filename(pages[0].title)}-${width}x${height}${format.fileExtension}` };
  } finally {
    if (!finished) await output.cancel().catch(() => {});
    root.unmount(); host.remove(); canvas.width = 0; canvas.height = 0;
  }
}
