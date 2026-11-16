import { sourceLimits, type StudioSource } from './sources.js';

/** Lossless transport for standalone exports, including their bundled application code. */
export async function compressHtmlReference(text: string): Promise<string> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}

export async function expandSource(source: StudioSource): Promise<StudioSource> {
  if (source.kind !== 'text' || source.encoding !== 'gzip-base64') return source;
  try {
    const bytes = Uint8Array.from(atob(source.text), character => character.charCodeAt(0));
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const chunks: string[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > sourceLimits.htmlFile) {
          await reader.cancel();
          throw new Error('expanded_limit');
        }
        chunks.push(decoder.decode(value, { stream: true }));
      }
      chunks.push(decoder.decode());
    } finally { reader.releaseLock(); }
    const text = chunks.join('');
    if (!text.trim() || text.includes('\u0000')) throw new Error('invalid_text');
    return { kind: 'text', name: source.name, text };
  } catch {
    throw new Error('This HTML attachment could not be opened. Upload the original HTML file again (up to 10 MB).');
  }
}
