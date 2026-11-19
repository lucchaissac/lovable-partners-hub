import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Zip, ZipPassThrough, strToU8 } from 'fflate';
import { Artwork } from './Artwork';
import { assetSchema, assetDimensions, type AssetDocument } from './model';
import { filename, renderExportPng } from './media';
import { canExportVideoAsset } from './assetPlayback';
import { exportVideo } from './videoExport';

export function archiveAssetFolder(asset: AssetDocument, index: number) {
  return `${String(index + 1).padStart(2, '0')} ${filename(asset.title)}`;
}

/** One snapshot, in collection order. PNGs keep the authored still; videos keep
 * their full media cycle. Stream stored ZIP entries rather than compressing MP4s. */
export async function exportAssetArchive(pages: AssetDocument[], parent: HTMLElement, signal: AbortSignal, onProgress: (percent: number) => void) {
  if (!pages.length) throw new Error('Add an asset before exporting.');
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let bytes = 0, archiveError: Error | undefined;
  const zip = new Zip((error, chunk) => {
    if (error) { archiveError = error; return; }
    bytes += chunk.byteLength;
    if (bytes > 500_000_000) { archiveError = new Error('This archive exceeds 500 MB. Export the larger assets individually.'); return; }
    chunks.push(new Uint8Array(chunk));
  });
  const add = (name: string, data: Uint8Array) => {
    signal.throwIfAborted();
    if (archiveError) throw archiveError;
    const file = new ZipPassThrough(name); zip.add(file); file.push(data, true);
    if (archiveError) throw archiveError;
  };
  const host = document.createElement('div'); parent.append(host);
  const root = createRoot(host);
  const weights = pages.map(page => canExportVideoAsset(page) ? 21 : 1), total = weights.reduce((a, b) => a + b, 0);
  let completed = 0;
  try {
    const manifest = [];
    for (const [index, asset] of pages.entries()) {
      signal.throwIfAborted();
      const folder = archiveAssetFolder(asset, index), size = assetDimensions(asset);
      flushSync(() => root.render(<Artwork asset={asset}/>));
      const board = host.querySelector<HTMLElement>('.asset-artwork')!;
      const png = await renderExportPng(board, asset);
      add(`${folder}/Preview.png`, new Uint8Array(await (await fetch(png)).arrayBuffer()));
      add(`${folder}/Editable.asset.json`, strToU8(JSON.stringify(assetSchema.parse(asset), null, 2)));
      completed += 1;
      onProgress(Math.min(99, Math.round(completed / total * 100)));
      let videoName: string | undefined;
      if (canExportVideoAsset(asset)) {
        const video = await exportVideo([asset], parent, signal, percent => onProgress(Math.min(99, Math.round((completed + 20 * percent / 100) / total * 100))), 'asset');
        videoName = video.blob.type === 'video/mp4' ? 'Video.mp4' : 'Video.webm';
        add(`${folder}/${videoName}`, new Uint8Array(await video.blob.arrayBuffer()));
        completed += 20;
      }
      manifest.push({ title: asset.title, ...size, folder, image: 'Preview.png', video: videoName, source: 'Editable.asset.json' });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    add('Contents.json', strToU8(JSON.stringify({ assets: manifest }, null, 2)));
    signal.throwIfAborted(); zip.end();
    if (archiveError) throw archiveError;
    onProgress(100);
    return { blob: new Blob(chunks, { type: 'application/zip' }), name: `${filename(pages[0].title)}-all-assets.zip` };
  } finally {
    zip.terminate(); root.unmount(); host.remove();
  }
}
