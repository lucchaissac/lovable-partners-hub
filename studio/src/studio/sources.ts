import { z } from 'zod';

export const sourceLimits = { count: 6, image: 200000, total: 600000, text: 20000, html: 500000, encodedHtml: 550000, htmlFile: 10000000 };
export const isHtmlSource = (name: string) => /\.html?$/i.test(name);
export const sourceTextLimit = (name: string) => isHtmlSource(name) ? sourceLimits.html : sourceLimits.text;
const name = z.string().trim().min(1).max(160);
export const deferredSourceText = 'Asset will read this link when the message is sent.';
const fileData = z.string().max(2800000).regex(/^data:application\/(pdf|vnd.openxmlformats-officedocument.presentationml.presentation);base64,[A-Za-z0-9+/=]+$/).optional();
const encoding = z.literal('gzip-base64').optional();
const validSourceText = (source: { name: string; text?: string; encoding?: 'gzip-base64'; kind: string }) => source.encoding
  ? source.kind === 'text' && isHtmlSource(source.name) && (!source.text || (source.text.length <= sourceLimits.encodedHtml && source.text.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(source.text)))
  : !source.text || source.text.length <= (source.kind === 'text' ? sourceTextLimit(source.name) : sourceLimits.text);
export const sourceUrlSchema = z.string().max(2000).url().refine(value => {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}, 'Use a public http or https link.');
export const sourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('image'), name, image: z.string().max(sourceLimits.image).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/) }).strict(),
  z.object({ kind: z.literal('text'), name, text: z.string().trim().min(1).max(sourceLimits.encodedHtml), encoding, fileData }).strict().refine(source=>!(/\.(pdf|pptx)$/i.test(source.name))||!!source.fileData,'Attach this document again.').refine(validSourceText, 'This source file is too large or has an invalid format.'),
  z.object({ kind: z.literal('link'), name, url: sourceUrlSchema, originalUrl:sourceUrlSchema.optional(), text: z.string().trim().min(1).max(sourceLimits.text) }).strict(),
]);
export const sourcesSchema = z.array(sourceSchema).max(sourceLimits.count).refine(value => new TextEncoder().encode(JSON.stringify(value)).length <= (value.some(source => source.kind==='text' && source.fileData) ? 3000000 : sourceLimits.total), 'These sources are too large. Remove a source and try again.');
export type StudioSource = z.infer<typeof sourceSchema>;
// Retain prepared references, including losslessly compressed HTML, so interrupted imports can retry.
export const sourceReferenceSchema = z.object({ kind: z.enum(['image', 'text', 'link']), name, url: sourceUrlSchema.optional(), originalUrl:sourceUrlSchema.optional(), text: z.string().max(sourceLimits.encodedHtml).optional(), encoding, fileData, image: z.string().max(sourceLimits.image).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).optional() }).strict().refine(validSourceText, 'This source file is too large or has an invalid format.');
export type SourceReference = z.infer<typeof sourceReferenceSchema>;
export function latestSourceReferences(sources: SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  return [...sources].reverse().filter(source => {
    const key = source.url || `${source.kind}:${source.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export function sourceReferences(sources: StudioSource[]): SourceReference[] {
  return sources.map(source => ({ kind: source.kind, name: source.name, ...(source.kind === 'link' ? { url: source.url, ...(source.originalUrl?{originalUrl:source.originalUrl}:{}) } : {}), ...(source.kind === 'image' ? { image: source.image } : { text: source.text }), ...(source.kind === 'text' && source.encoding ? { encoding: source.encoding } : {}), ...(source.kind === 'text' && source.fileData ? {fileData:source.fileData} : {}) }));
}

/** Keep older attached references when trimming the text conversation for a follow-up. */
export function conversationForGeneration<T extends { user: boolean; sources?: SourceReference[] }>(messages: T[]): T[] {
  return messages.filter((message, index) => index >= messages.length - 40 || message.user && message.sources?.some(source => source.image || source.fileData || source.text));
}

/** Keep recent attachments downloadable within the existing conversation storage limit. */
export function compactSourcePreviews<T extends { sources?: SourceReference[] }>(messages: T[]): T[] {
  const compact = messages.map((message, index) => ({ ...message, ...(message.sources ? { sources: message.sources.map(({ image: _image, fileData: _file, text, ...source }) => ({ ...source, ...(text && index === messages.length - 1 ? { text } : {}) }) as SourceReference) } : {}) }));
  const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;
  let budget = Math.max(0, 560000 - bytes(compact));
  for (let i = messages.length - 1; i >= 0; i--) {
    messages[i].sources?.forEach((source, index) => {
      const stored = compact[i].sources![index];
      const payload = source.fileData ? {fileData:source.fileData} : source.image ? { image: source.image } : source.text && !stored.text ? { text: source.text } : null;
      if (!payload) return;
      const cost = bytes({ ...stored, ...payload }) - bytes(stored);
      if (cost <= budget) {
        Object.assign(stored, payload);
        budget -= cost;
      }
    });
  }
  return compact;
}

/** Inline links already communicate their attached reference, including redirects. */
export function sourceIsInline(source:SourceReference,text=''):boolean {
 if(source.kind!=='link'||!source.url)return false;
 const key=(value:string)=>{try{const url=new URL(value);return url.hostname.replace(/^www\./,'')+url.pathname.replace(/\/$/,'')+url.search;}catch{return value;}};
 const mentions=(text.match(/https?:\/\/[^\s<>«»]+/g)||[]).map(url=>url.replace(/[.,;:!?)}\]”’"']+$/,''));
 if(mentions.some(url=>key(url)===key(source.url!)||source.originalUrl&&key(url)===key(source.originalUrl)))return true;
 // Older chats did not retain the original URL. Recognize locale-only home redirects.
 try{const target=new URL(source.url),home=/^\/(?:[a-z]{2}(?:[-_][a-z]{2})?)(?:\/[a-z]{2})?\/?$/i.test(target.pathname);
  return home&&!target.search&&mentions.some(value=>{const url=new URL(value);return (!url.pathname||url.pathname==='/')&&!url.search&&url.hostname.replace(/^www\./,'')===target.hostname.replace(/^www\./,'');});
 }catch{return false;}
}
