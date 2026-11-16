import { loadLibrary, rasterLibraryAsset } from './badgeLibrary';
import { makeNode, referenceDocument, type AssetDocument } from './model';
import { nativeDocument } from './nativeDocument';

export function starterAsset(): AssetDocument {
  const canvas = document.createElement('canvas');
  canvas.width = 172; canvas.height = 176;
  const context = canvas.getContext('2d')!;
  context.scale(4, 4);
  context.fillStyle = '#ffffff';
  context.fill(new Path2D('M12.7548 0C19.7991 0 25.5096 5.72557 25.5096 12.7884V17.6488H29.7544C36.7987 17.6488 42.5092 23.3744 42.5092 30.4373C42.5092 37.5001 36.7987 43.2257 29.7544 43.2257H0V12.7884C0 5.72557 5.71052 0 12.7548 0Z'));
  const asset: AssetDocument = {
    version: 1, id: crypto.randomUUID(), title: 'Grow your business',
    format: 'landscape', dimensions: { width: 1200, height: 738 },
    reference: { name: 'Lovable symbol', src: canvas.toDataURL('image/png'), width: 172, height: 176 },
    background: 'ink', grid: false, updatedAt: Date.now(),
    nodes: [
      makeNode('text', { name: 'Headline', text: 'Grow your\nbusiness', x: 64, y: 436, w: 790, h: 248, fontSize: 122, weight: '700', color: 'white' }),
    ],
  };
  const editor = nativeDocument(asset);
  const blocks = editor.pages[0].sections[0].columns[0];
  blocks[0].editor!.appearance!.lineHeight = 96;
  blocks.unshift({ id: 'starter-motion', kind: 'media', format: 'Video', name: 'Lovable motion', src: '/gallery/motion-8-960.mp4', poster: '/gallery/motion-8.webp', editor: { position: 'absolute', x: 0, y: 0, widthPx: 1200, height: 738, appearance: { imageFit: 'cover' } } });
  blocks.push({ id: 'starter-badge', kind: 'image', value: { src: '/studio/partner-badge.svg', alt: 'Solution Partner · Select 2026', caption: '', alignment: 'center', width: 100 }, editor: { position: 'absolute', x: 924, y: 471, widthPx: 212, height: 198, appearance: { imageFit: 'contain' } } });
  return { ...asset, editor };
}

export async function badgeAsset(formatId: string): Promise<AssetDocument> {
  const badge = (await loadLibrary()).find(asset => asset.id === formatId);
  if (!badge) throw new Error('This badge format could not be found.');
  const reference = await rasterLibraryAsset(badge);
  return { ...referenceDocument(reference, 'landscape'), title: badge.name, background: 'ink', grid: false };
}
