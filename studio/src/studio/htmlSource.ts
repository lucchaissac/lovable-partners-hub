import { z } from 'zod';

const assetSchema = z.object({
  mime: z.string().max(100).regex(/^[\w.+-]+\/[\w.+-]+$/),
  compressed: z.boolean().optional(),
  data: z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/),
});
const manifestSchema = z.record(z.uuid(), assetSchema).refine(value => Object.keys(value).length <= 256);
const referencesSchema = z.array(z.object({ id: z.string().max(2000), uuid: z.uuid() })).max(512);
const fontMime = /^(?:font\/|application\/(?:x-)?font-|application\/vnd\.ms-fontobject)/i;
const textMime = /^(?:text\/|application\/(?:javascript|json|xhtml\+xml)|image\/svg\+xml)/i;
const assetLimit = 1000000;

function bundledLibrary(text: string): string | undefined {
  // Only recognize vendor headers, never infer from app code mentioning React.
  if (/^\s*\/\*\*[\s\S]{0,160}@license React\b[\s\S]{0,100}react(?:-dom)?\.production\.min\.js/.test(text)) return 'React runtime';
  if (text.startsWith('// GENERATED from dc-runtime/src/*.ts — do not edit.')) return 'Export custom-element runtime';
}

async function decodeAsset(asset: z.infer<typeof assetSchema>): Promise<Uint8Array> {
  const bytes = Uint8Array.from(atob(asset.data), character => character.charCodeAt(0));
  if (!asset.compressed) {
    if (bytes.length > assetLimit) throw new Error('This HTML contains an embedded asset that is too large.');
    return bytes;
  }
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > assetLimit) { await reader.cancel(); throw new Error('This HTML contains an embedded asset that is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

function base64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Decode exported page bundles as inert reference data, without running their loader. */
export async function htmlReference(html: string): Promise<string> {
  const islands = new Map<string, string>();
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const type = match[1].match(/(?:^|\s)type\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const value = type?.[1] || type?.[2] || type?.[3];
    if (value?.startsWith('__bundler/')) {
      if (islands.has(value)) throw new Error('This HTML export contains duplicate bundle data. Export the page again.');
      islands.set(value, match[2]);
    }
  }
  if (!islands.has('__bundler/template') && !islands.has('__bundler/manifest')) return html;
  try {
    const template = z.string().min(1).parse(JSON.parse(islands.get('__bundler/template') || 'null'));
    const manifest = manifestSchema.parse(JSON.parse(islands.get('__bundler/manifest') || 'null'));
    const references = referencesSchema.parse(JSON.parse(islands.get('__bundler/ext_resources') || '[]'));
    const pages = z.array(z.uuid()).max(256).parse(JSON.parse(islands.get('__bundler/page_order') || '[]'));
    const resources: { id: string; mime: string; note?: string; text?: string; dataUrl?: string }[] = [];
    let decodedBytes = 0;
    for (const [id, asset] of Object.entries(manifest)) {
      if (fontMime.test(asset.mime)) {
        // Font binaries are not useful to the model; retain the CSS font declarations and asset identity.
        resources.push({ id, mime: asset.mime, note: 'Embedded font binary omitted from reference. Use the font family, weight and style declared in the page CSS.' });
        continue;
      }
      const bytes = await decodeAsset(asset);
      decodedBytes += bytes.length;
      if (decodedBytes > 4000000) throw new Error('This HTML export contains too much embedded content. Export a single page.');
      const text = textMime.test(asset.mime) ? new TextDecoder('utf-8', { fatal: true }).decode(bytes) : undefined;
      const library = text && bundledLibrary(text);
      resources.push({ id, mime: asset.mime, ...(library
        ? { note: `${library} omitted. Reimplement page interactions with the supplied React and Asset components; this library is not page content.` }
        : text !== undefined ? { text } : { dataUrl: `data:${asset.mime};base64,${base64(bytes)}` }) });
    }
    // Keep page markup, CSS, application scripts, images and resource aliases. Download loaders,
    // binary fonts and recognized vendor runtimes are replaced by a readable inventory.
    return `${template}\n\nEmbedded resource reference (IDs match the HTML above):\n${JSON.stringify({ resources, references, pages })}`;
  } catch (error) {
    if (error instanceof Error && /too large|too much embedded/.test(error.message)) throw error;
    throw new Error('This HTML export could not be unpacked. Export the page again and retry.');
  }
}
