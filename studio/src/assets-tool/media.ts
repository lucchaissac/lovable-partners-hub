import { toPng } from 'html-to-image';
import { assetSchema, assetDimensions, type AssetDocument, type AssetReference } from './model';
import {fontFacesForAsset} from '../../../shared/assetTypography.mjs';
import {communityGradientMaster,communityGradientPreview} from '../../../shared/communityPreparedArtwork.mjs';
import {editableAssetCollection} from './assetCollection';

export async function readReference(file: File): Promise<AssetReference> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPG or WebP image.');
  if (file.size > 12_000_000) throw new Error('Choose an image smaller than 12 MB.');
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('This image could not be read.')); reader.readAsDataURL(file);
  });
  const image = new Image(); image.src = src;
  try { await image.decode(); } catch { throw new Error('This image could not be opened. Try another file.'); }
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > 20000 || image.naturalHeight > 20000 || image.naturalWidth * image.naturalHeight > 60_000_000) throw new Error('This image is too large. Choose an image below 60 megapixels.');
  return { name: file.name.slice(0, 200), src, width: image.naturalWidth, height: image.naturalHeight };
}
/** Only the vision reference is resized. The editable file retains the original bytes. */
export async function visionReference(reference: AssetReference) {
  const image = new Image(); image.src = reference.src; await image.decode();
  const scale = Math.min(1, 1600 / Math.max(reference.width, reference.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(reference.width * scale); canvas.height = Math.round(reference.height * scale);
  const context = canvas.getContext('2d'); if (!context) throw new Error('Could not prepare the image.');
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { ...reference, src: canvas.toDataURL('image/jpeg', .9) };
}
export function download(blob: Blob, name: string) {
  let host = document;
  try { if (window.parent.location.origin === window.location.origin) host = window.parent.document; } catch { /* Cross-origin hosts keep downloads in this document. */ }
  const url = URL.createObjectURL(blob), link = host.createElement('a');
  link.href = url; link.download = name; host.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export const filename = (title: string) => title.replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 100) || 'Asset asset';
export function exportSource(asset: AssetDocument) {
  download(new Blob([JSON.stringify(assetSchema.parse(asset), null, 2)], { type: 'application/json' }), `${filename(asset.title)}.asset.json`);
}
export function exportCollectionSource(pages:AssetDocument[],activeId:string){
  const collection=editableAssetCollection(pages,activeId);
  download(new Blob([JSON.stringify(collection,null,2)],{type:'application/json'}),`${filename(collection.title)}.collection.json`);
}
const fontCss=new Map<string,Promise<string>>();
export async function embeddedAssetFonts(asset:AssetDocument) {
 return (await Promise.all(fontFacesForAsset(asset).map(face=>{
  let pending=fontCss.get(face.src);if(pending)return pending;
  pending=fetch(face.src).then(async response => {
    if (!response.ok) throw new Error('The design font could not load. Please try again.');
    const blob = await response.blob();
    const source = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return `@font-face{font-family:"${face.family}";font-weight:${face.weight};font-style:${face.style};src:url(${source}) format("woff2");}`;
  }).catch(error => { fontCss.delete(face.src); throw error; });
  fontCss.set(face.src,pending);return pending;
 }))).join('\n');
}
export type PngExportScale = 1 | 2;
export async function renderPng(element: HTMLElement, asset: AssetDocument, scale:PngExportScale=1) {
  await document.fonts.ready;
  await Promise.all(Array.from(element.querySelectorAll('img')).map(image => image.decode()));
  const { width, height } = assetDimensions(asset);
  // Embed only the local brand fonts; unrelated third-party stylesheets may not expose cssRules.
  const fontEmbedCSS = await embeddedAssetFonts(asset);
  const data = await toPng(element, { width, height, pixelRatio: scale, fontEmbedCSS,
    style: { transform: 'none', margin: '0' }, filter: node => !(node instanceof Element && node.hasAttribute('data-editor-only')) });
  return data;
}
export async function renderExportPng(element:HTMLElement, asset:AssetDocument, scale:PngExportScale=1) {
  const {width,height}=assetDimensions(asset);
  const community=asset.editor?.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat())).filter(block=>block.kind==='image'&&block.ambassador)??[];
  let board=element,clone:HTMLElement|undefined;
  try {
    if(community.length){
      // Gallery thumbnails make opening instant; downloads regenerate the source artwork at export size.
      clone=element.cloneNode(true) as HTMLElement;clone.removeAttribute('id');element.parentElement!.append(clone);board=clone;
      for(const image of clone.querySelectorAll<HTMLImageElement>('img'))if(image.getAttribute('src')===communityGradientPreview)image.src=communityGradientMaster;
      const {renderAmbassador}=await import('./ambassadorAsset');
      for(const block of community){if(block.kind!=='image'||!block.ambassador)continue;const image=await renderAmbassador(block.ambassador,{pixels:Math.min(4000,Math.max(width*scale,height*scale,1600)),element:block.ambassadorElement});for(const target of clone.querySelectorAll<HTMLImageElement>('img'))if(target.getAttribute('src')===block.value.src)target.src=image.src;}
    }
    return await renderPng(board,asset,scale);
  }finally{clone?.remove();}
}
export async function exportPng(element:HTMLElement, asset:AssetDocument, scale:PngExportScale=1) {
  const {width,height}=assetDimensions(asset);
  const data=await renderExportPng(element,asset,scale);
  download(await (await fetch(data)).blob(), `${filename(asset.title)}-${width*scale}x${height*scale}.png`);
}
