import type { CanvasRequest } from './canvasAgentSchema';

/** Bound edit references independently of the original asset kept on the canvas. */
export async function canvasImageReference(asset: CanvasRequest['imageReferences'][number]) {
  if (typeof asset.src !== 'string' || asset.src.length > 14_000_000 || !/^(\/assets\/[\w/.-]+|data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+)$/.test(asset.src)) throw new Error('Choose an uploaded or library image to edit.');
  const image = new Image();
  // The preview has an opaque sandbox origin, including for our own /assets files.
  // Opt into their existing public CORS policy before starting the image request.
  if (asset.src.startsWith('/assets/')) image.crossOrigin = 'anonymous';
  image.src = asset.src; await image.decode();
  const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d'); if (!context) throw new Error('Could not prepare the selected image.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let src: string;
  try {
    src = canvas.toDataURL('image/webp', .88);
    if (src.length > 800_000) src = canvas.toDataURL('image/webp', .65);
  } catch (error) {
    if (error instanceof Error && error.name === 'SecurityError') throw new Error('This image could not be prepared for editing. Upload it as a PNG, JPEG or WebP and try again. Your document is unchanged.');
    throw error;
  }
  if (src.length > 800_000) throw new Error('This image is too large to edit. Choose a smaller image.');
  return { ...asset, width: canvas.width, height: canvas.height, src };
}
