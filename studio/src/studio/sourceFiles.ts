import { isHtmlSource, sourceLimits, sourceTextLimit, type StudioSource } from './sources';
import { htmlReference } from './htmlSource';
import { compressHtmlReference } from './sourceCompression';

export const sourceFileAccept = '.html,.htm,.txt,.md,.csv,.json,image/png,image/jpeg,image/webp';
const textExtensions = /\.(html?|txt|md|csv|json)$/i;

/** Read HTML as reference code. Never mount it or execute its scripts on upload. */
export async function textFileSource(file: { name: string; size: number; text(): Promise<string> }): Promise<StudioSource> {
  if (!textExtensions.test(file.name)) throw new Error('Choose an image or an HTML, TXT, Markdown, CSV or JSON file.');
  // Retain the extension when shortening long names, since it determines the size limit.
  const extension = file.name.slice(file.name.lastIndexOf('.'));
  const name = file.name.length > 160 ? `${file.name.slice(0, 160 - extension.length)}${extension}` : file.name;
  const limit = sourceTextLimit(name);
  const html = isHtmlSource(name);
  const sizeError = html ? 'This page contains too much source code for one Studio request. Export a single page and try again.' : `Use a text file with 1–${limit.toLocaleString('en-US')} characters.`;
  if (file.size > (html ? sourceLimits.htmlFile : limit * 4)) throw new Error(html ? 'Choose an HTML file smaller than 10 MB.' : sizeError);
  const original = (await file.text()).trim();
  if (!original || original.includes('\u0000')) throw new Error('This file is empty or is not a text file.');
  if (html && new TextEncoder().encode(original).length > sourceLimits.htmlFile) throw new Error('Choose an HTML file smaller than 10 MB.');
  const text = html ? await htmlReference(original) : original;
  if (html && text.length > limit) {
    const compressed = await compressHtmlReference(text);
    if (compressed.length > sourceLimits.encodedHtml) throw new Error('This HTML contains too many embedded resources to attach. Export it with linked images or fonts and try again.');
    return { kind: 'text', name, text: compressed, encoding: 'gzip-base64' };
  }
  if (text.length > limit) throw new Error(sizeError);
  return { kind: 'text', name, text };
}
