import { toSvg } from 'html-to-image';
import { validImportedFont, type ImportedFont } from '../protos/brand-settings/model';

const hostOrigin = new URL(import.meta.url).origin;
let revision = '';
const brandFonts = new Map<string, ImportedFont>();
export function configureCanvasExport(value: string) { revision = value; }
export function rememberCanvasExportFont(font: ImportedFont) { if (validImportedFont(font)) brandFonts.set(font.id, font); }
function request<T>(type: string, payload: unknown, options: {signal?: AbortSignal; onProgress?: (text: string) => void; timeout?: number} = {}): Promise<T> {
  const requestId = crypto.randomUUID(), version = revision;
  return new Promise((resolve, reject) => {
    const finish = () => { clearTimeout(timer); window.removeEventListener('message', receive); options.signal?.removeEventListener('abort', abort); };
    const abort = () => { finish(); window.parent.postMessage({type:'asset-canvas-video-cancel',requestId,revision:version},hostOrigin); reject(new DOMException('Export canceled','AbortError')); };
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== hostOrigin || event.data?.requestId !== requestId || event.data.revision !== version) return;
      if (event.data.type === 'asset-canvas-video-progress') { if(typeof event.data.progress === 'string') options.onProgress?.(event.data.progress); return; }
      if (event.data.type !== 'asset-canvas-export-result') return;
      finish(); if (event.data.error) reject(new Error(String(event.data.error))); else resolve(event.data.result);
    };
    const timer = setTimeout(() => { abort(); }, options.timeout || 120_000);
    window.addEventListener('message', receive); options.signal?.addEventListener('abort',abort,{once:true});
    if(options.signal?.aborted){abort();return;}
    window.parent.postMessage({ type, requestId, revision: version, payload }, hostOrigin);
  });
}
async function renderCanvasPages(pages: HTMLElement[], title: string, width: number, height: number, onProgress?: (page: number, total: number) => void, pixelRatio = 3.125, signal?: AbortSignal) {
  if (!pages.length || pages.length > 60 || width < 1 || height < 1 || width > 2000 || height > 2000) throw new Error('Choose between 1 and 60 pages to export.');
  await document.fonts.ready;
  const images = pages.flatMap(page => [...page.querySelectorAll('img')]);
  await Promise.all(images.map(image => image.decode()));
  const elements = pages.flatMap(page => [page, ...page.querySelectorAll('*')]);
  const fonts = [...new Set(elements.filter(element => getComputedStyle(element).fontFamily.includes('Arial')).map(element => { const style = getComputedStyle(element); return `${style.fontWeight}-${style.fontStyle}`; }))];
  const assets = [...new Set(images.map(image => image.getAttribute('src') || '').filter(src => !src.startsWith('data:')))];
  const prepared = await request<{ fonts: string; assets: Record<string, string> }>('asset-canvas-export-prepare', { fonts, assets });
  const customCss = [...brandFonts.values()].map(font => font.faces.map(face => `@font-face{font-family:"${font.id}";font-weight:${face.weight};font-style:${face.style};src:url(${face.dataUrl})${face.unicodeRange ? `;unicode-range:${face.unicodeRange}` : ''};}`).join('')).join('');
  const originals = images.map(image => ({ image, src: image.getAttribute('src') || '' }));
  const output: { image: string; width: number; height: number }[] = [];
  try {
    originals.forEach(({ image, src }) => { if (prepared.assets[src]) image.src = prepared.assets[src]; });
    await Promise.all(images.map(image => image.decode()));
    for (const [index, page] of pages.entries()) {
      signal?.throwIfAborted(); onProgress?.(index + 1, pages.length);
      const svg = await toSvg(page, { width, height, fontEmbedCSS: prepared.fonts + customCss, style: { position: 'relative', left: '0', top: '0', margin: '0', transform: 'none' }, filter: node => !['SCRIPT', 'IFRAME'].includes(node.nodeName) });
      const bitmap = new Image(); bitmap.src = svg; await bitmap.decode();
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * pixelRatio); canvas.height = Math.round(height * pixelRatio);
      const context = canvas.getContext('2d'); if (!context) throw new Error('The PDF renderer is unavailable.');
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      output.push({ image: canvas.toDataURL('image/png'), width, height });
      canvas.width = 0; canvas.height = 0;
    }
    return output;
  } finally { originals.forEach(({ image, src }) => { image.setAttribute('src', src); }); }
}

export async function exportCanvasPdf(pages: HTMLElement[], title: string, width: number, height: number, onProgress?: (page: number, total: number) => void) {
  const output=await renderCanvasPages(pages,title,width,height,onProgress);
  await request('asset-canvas-export-save',{title:title.slice(0,160),pages:output});
}
export async function exportCanvasVideo(pages: HTMLElement[], title: string, options: {height:number;seconds:number}, signal:AbortSignal, onProgress:(text:string)=>void) {
  if(![720,1080].includes(options.height)||!Number.isFinite(options.seconds)||options.seconds<1||options.seconds>30)throw new Error('Choose 720p or 1080p and 1–30 seconds per slide.');
  const output=await renderCanvasPages(pages,title,1280,720,(page,total)=>onProgress(`Preparing slide ${page} of ${total}`),options.height/720,signal);
  signal.throwIfAborted();
  return request('asset-canvas-video-save',{title:title.slice(0,160),pages:output,...options},{signal,onProgress,timeout:pages.length*options.seconds*1000+120_000});
}

export async function recordCanvasPresentation(pages:HTMLElement[],title:string,signal:AbortSignal,onProgress:(text:string)=>void){
  const output=await renderCanvasPages(pages,title,1280,720,(page,total)=>onProgress(`Preparing slide ${page} of ${total}`),1,signal);
  signal.throwIfAborted();onProgress('Ready to record');
  return request<{saved:boolean;bytes?:number;extension?:string}>('asset-canvas-record-open',{title:title.slice(0,160),pages:output},{signal,onProgress,timeout:3_600_000});
}
