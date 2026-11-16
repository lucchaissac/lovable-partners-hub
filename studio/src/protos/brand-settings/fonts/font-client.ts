import { useEffect, useState } from 'react';
import { type BrandTheme, type ImportedFont, validImportedFont } from '../model';
import catalog from './google-fonts.json';

export const GOOGLE_FONTS = catalog;
export const MAX_FONT_BYTES = 2 * 1024 * 1024;
export type WebsiteFamily = { name: string; recommended: boolean; faces: { url: string; weight: string; style: string; unicodeRange?: string }[] };
const googleLoads = new Map<string, Promise<void>>();

/** Load only visible font names in the picker, then full styles when selected. */
export function loadGoogleFont(name: string, preview = false): Promise<void> {
  const font = catalog.find(item => item.name === name);
  if (!font) return Promise.reject(new Error('This Google font is not available. Choose another font.'));
  const key = `${name}:${preview ? 'preview' : 'full'}`;
  const cached = googleLoads.get(key);
  if (cached) return cached;
  const promise = new Promise<void>((resolve, reject) => {
    const weights = font.weights.split(';');
    const preferred = preview ? [weights.includes('400') ? '400' : weights[0]] : weights.filter(w => ['400', '500', '600', '700'].includes(w));
    const requested = (preferred.length ? preferred : [weights[0]]).join(';');
    const url = new URL('https://fonts.googleapis.com/css2');
    url.searchParams.set('family', `${name}:wght@${requested}`);
    url.searchParams.set('display', 'swap');
    if (preview) url.searchParams.set('text', name);
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = url.href;
    const timeout = window.setTimeout(() => fail(), 20000);
    const fail = () => { window.clearTimeout(timeout); link.remove(); googleLoads.delete(key); reject(new Error('Could not load this Google font. Check your connection and try again.')); };
    link.onerror = fail;
    link.onload = () => {
      Promise.all(requested.split(';').map(weight => document.fonts.load(`${weight} 16px "${name}"`, preview ? name : 'Brand workspace'))).then(loaded => {
        if (!loaded.every(faces => faces.length > 0)) { fail(); return; }
        window.clearTimeout(timeout); resolve();
      }, fail);
    };
    document.head.append(link);
  });
  googleLoads.set(key, promise);
  return promise;
}

export async function requestFontService<T>(path: 'inspect' | 'import', body: unknown, signal: AbortSignal): Promise<T> {
  let response: Response;
  try { response = await fetch(`http://127.0.0.1:5198/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal }); }
  catch (error) {
    if (signal.aborted) throw error;
    throw new Error('Website import is unavailable right now. You can still upload a font or choose Google Fonts.');
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not import this font.');
  return result as T;
}

export function loadImportedFont(font: ImportedFont) {
  if (!validImportedFont(font)) return Promise.reject(new Error('This font could not be read. Try another WOFF or WOFF2 file.'));
  return Promise.all(font.faces.map(face => new FontFace(font.id, `url(${face.dataUrl})`, {
    weight: face.weight, style: face.style, ...(face.unicodeRange ? { unicodeRange: face.unicodeRange } : {}), display: 'swap',
  }).load()));
}

export async function readFontFile(file: File): Promise<ImportedFont> {
  if (!/\.woff2?$/i.test(file.name) || file.size > MAX_FONT_BYTES) throw new Error('Choose a WOFF or WOFF2 file under 2 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const magic = String.fromCharCode(...bytes.subarray(0, 4));
  if (!['wOFF', 'wOF2'].includes(magic)) throw new Error('This file is not a valid WOFF or WOFF2 font.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = () => reject(new Error('This font could not be opened.'));
    reader.onload = () => resolve(`data:font/${magic === 'wOF2' ? 'woff2' : 'woff'};base64,${String(reader.result).split(',')[1]}`); reader.readAsDataURL(file);
  });
  return { id: `AssetBrandFont_${crypto.randomUUID()}`, name: file.name.replace(/\.woff2?$/i, '').replace(/[-_]/g, ' ').slice(0, 150), source: 'Uploaded font', faces: [{ dataUrl, weight: '400', style: 'normal' }] };
}

/** Keep fonts alive when navigating between preview tabs, including after reload. */
export function useBrandFont(theme: BrandTheme) {
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let faces: FontFace[] = [];
    setError('');
    if (theme.customFont) loadImportedFont(theme.customFont).then(loaded => {
      if (!active) return;
      faces = loaded; faces.forEach(face => document.fonts.add(face));
    }).catch(() => { if (active && theme.font === 'Custom') setError('The saved font could not be loaded. Import it again.'); });
    if (theme.font === 'Google Fonts' && theme.googleFont) loadGoogleFont(theme.googleFont).catch(error => { if (active) setError(error.message); });
    return () => { active = false; faces.forEach(face => document.fonts.delete(face)); };
  }, [theme.font, theme.googleFont, theme.customFont]);
  return error;
}
