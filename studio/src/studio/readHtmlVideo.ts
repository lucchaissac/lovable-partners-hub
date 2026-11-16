import type { HtmlBlock } from './htmlEditorModel';

/** Embed the file so the local draft and editable export survive a reload. */
export async function readHtmlVideo(file: File): Promise<Extract<HtmlBlock, { kind: 'media' }>> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mime = ({ mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime' } as Record<string, string>)[extension ?? ''];
  if (!mime) throw new Error('Choose an .mp4, .webm, .ogv or .mov video.');
  if (file.size > 25_000_000) throw new Error('Choose a video smaller than 25 MB.');
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]*;/, `data:${mime};`));
    reader.onerror = () => reject(new Error('This video could not be read.'));
    reader.readAsDataURL(file);
  });
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.preload = 'auto';
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('This video could not be opened. Try an .mp4 video.')), 15_000);
      video.onloadeddata = () => { clearTimeout(timer); resolve(); };
      video.onerror = () => { clearTimeout(timer); reject(new Error('This video format is not supported by your browser. Try an .mp4 video.')); };
      video.src = src;
    });
    if (!video.videoWidth || !video.videoHeight) throw new Error('This video has no picture.');
    const poster = document.createElement('canvas');
    const posterScale = Math.min(1, 1200 / Math.max(video.videoWidth, video.videoHeight));
    poster.width = Math.round(video.videoWidth * posterScale); poster.height = Math.round(video.videoHeight * posterScale);
    poster.getContext('2d')!.drawImage(video, 0, 0, poster.width, poster.height);
    const scale = Math.min(480 / video.videoWidth, 360 / video.videoHeight, 1);
    return { id: crypto.randomUUID(), kind: 'media', format: 'Video', name: file.name.slice(0, 200), src, poster: poster.toDataURL('image/jpeg', .85), editor: { widthPx: Math.max(200, video.videoWidth * scale), height: Math.max(12, video.videoHeight * scale), appearance: { imageFit: 'cover' } } };
  } finally {
    video.removeAttribute('src'); video.load();
  }
}
