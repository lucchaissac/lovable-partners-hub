import { z } from 'zod';
import { conversationSchema, documentSchema } from '../studio/schema.js';
import { htmlEditorSchema } from '../studio/htmlEditorModel.js';
import { websiteTokens } from './websiteTokens.js';
import {assetLayoutsSchema,captureBlocks,fitBoxes,resizeEditor,restoreBlocks,repairEditorScale,layoutContentKey} from './layout.js';

export const formats = {
  landscape: { label: 'Landscape', width: 1200, height: 738 },
  square: { label: 'Square', width: 1080, height: 1080 },
  portrait: { label: 'Portrait', width: 1080, height: 1350 },
} as const;
export type AssetFormat = keyof typeof formats;
// The model and renderer use the same website source. No global UI tokens change.
export const palette = {
  ink: websiteTokens['color-ink'], muted: websiteTokens['color-muted'], white: websiteTokens['color-white'], blue: websiteTokens['color-blue'],
  'blue-soft': websiteTokens['color-blue-soft'], mint: websiteTokens['color-mint'], 'yellow-soft': websiteTokens['color-yellow-soft'], 'pink-soft': websiteTokens['color-pink-soft'],
  'media-control': websiteTokens['color-media-control'], border: websiteTokens['color-border'],
} as const;
export const assetColor = (key: keyof typeof palette) => `var(--asset-color-${key})`;
export const backgrounds = ['ink', 'blue-soft', 'mint', 'yellow-soft', 'pink-soft', 'white'] as const;
const color = z.enum(['ink', 'muted', 'white', 'blue', 'blue-soft', 'mint', 'yellow-soft', 'pink-soft', 'media-control', 'border']);
export const assetIcons = ['none', 'play', 'check', 'arrow-right', 'sparkles', 'circle', 'circle-check', 'file-text', 'calendar', 'video', 'message-square', 'book-open', 'users', 'chart-line'] as const;
export const cropSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().positive().max(1), h: z.number().positive().max(1) }).strict();
export const nodeSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/), name: z.string().min(1).max(100),
  kind: z.enum(['panel', 'text', 'image', 'button', 'icon', 'rule', 'badge']),
  x: z.number().min(0).max(1350), y: z.number().min(0).max(1350),
  w: z.number().min(8).max(1350), h: z.number().min(.5).max(1350),
  text: z.string().max(2000), fontSize: z.number().min(12).max(160),
  weight: z.enum(['400', '500', '600', '700']), align: z.enum(['left', 'center', 'right']),
  color, fill: z.enum(['none', 'ink', 'muted', 'white', 'blue', 'blue-soft', 'mint', 'yellow-soft', 'pink-soft', 'media-control', 'border']),
  radius: z.number().min(0).max(100), icon: z.enum(assetIcons), crop: cropSchema,
}).strict();
export const compositionSchema = z.object({
  title: z.string().trim().min(1).max(100),
  background: z.enum(backgrounds), grid: z.boolean(), nodes: z.array(nodeSchema).min(1).max(40),
}).strict();
export const referenceSchema = z.object({
  name: z.string().min(1).max(200),
  src: z.string().max(17_000_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/),
  width: z.number().int().positive().max(20000), height: z.number().int().positive().max(20000),
}).strict();
export const assetSchema = compositionSchema.extend({
  version: z.literal(1), id: z.uuid(), format: z.enum(['landscape', 'square', 'portrait']),
  dimensions: z.object({ width: z.number().min(600).max(1350), height: z.number().min(600).max(1350) }).strict().optional(),
  editor: htmlEditorSchema.optional(),
  layouts: assetLayoutsSchema.optional(),
  messages: conversationSchema.optional(),
  workspaceChats: documentSchema.shape.workspaceChats,
  workspaceActiveChatId: documentSchema.shape.workspaceActiveChatId,
  reference: referenceSchema, updatedAt: z.number().int().nonnegative(),
}).strict().superRefine((doc, ctx) => {
  const errors = compositionErrors(doc, doc.format, assetDimensions(doc));
  for (const message of errors) ctx.addIssue({ code: 'custom', message });
});
export type AssetNode = z.infer<typeof nodeSchema>;
export type Composition = z.infer<typeof compositionSchema>;
export type AssetDocument = z.infer<typeof assetSchema>;
export type AssetReference = z.infer<typeof referenceSchema>;
export function assetDimensions(doc: { format: AssetFormat; dimensions?: { width: number; height: number } }) {
  // Keep files made by the first iteration at their original export dimensions.
  return doc.dimensions ?? (doc.format === 'landscape' ? { width: 1200, height: 630 } : formats[doc.format]);
}
export function compositionErrors(composition: Composition, format: AssetFormat, dimensions = formats[format] as { width: number; height: number }) {
  const { width, height } = dimensions, ids = new Set<string>(), errors: string[] = [];
  for (const node of composition.nodes) {
    if (ids.has(node.id)) errors.push('Each element needs a unique ID.');
    ids.add(node.id);
    if (node.x + node.w > width + .1 || node.y + node.h > height + .1) errors.push(`${node.name} extends beyond the canvas.`);
    if (node.crop.x + node.crop.w > 1.001 || node.crop.y + node.crop.h > 1.001) errors.push(`${node.name} has an invalid image crop.`);
  }
  return errors;
}
export function makeNode(kind: AssetNode['kind'], overrides: Partial<AssetNode> = {}): AssetNode {
  return { id: crypto.randomUUID(), name: kind === 'text' ? 'Text' : kind === 'image' ? 'Original image' : 'Panel', kind,
    x: 80, y: 80, w: 360, h: 80, text: kind === 'text' ? 'Add your text' : '', fontSize: 32,
    weight: '500', align: 'left', color: 'ink', fill: kind === 'panel' ? 'white' : 'none', radius: 8,
    icon: 'none', crop: { x: 0, y: 0, w: 1, h: 1 }, ...overrides };
}
export function referenceDocument(reference: AssetReference, format: AssetFormat): AssetDocument {
  const { width, height } = formats[format], scale = Math.min((width - 112) / reference.width, (height - 112) / reference.height);
  const w = Math.round(reference.width * scale), h = Math.round(reference.height * scale);
  return { version: 1, id: crypto.randomUUID(), title: reference.name.replace(/\.[^.]+$/, '').slice(0, 100) || 'Untitled asset',
    format, dimensions: { width, height }, reference, background: 'blue-soft', grid: true, updatedAt: Date.now(),
    nodes: [makeNode('image', { x: (width - w) / 2, y: (height - h) / 2, w, h })] };
}
export function resizeAsset(doc: AssetDocument, format: AssetFormat): AssetDocument {
  if(doc.editor){const editor=structuredClone(doc.editor);if(repairEditorScale(editor,assetDimensions(doc)))doc={...doc,editor};}
  const contentKey=layoutContentKey(doc.editor);
  const refreshLayout=doc.layouts?.[format]!==undefined&&(doc.layouts[format]?.reflowVersion!==2||doc.layouts[format]?.contentKey!==contentKey);
  if(format===doc.format&&!refreshLayout)return doc;
  const currentLayout={reflowVersion:doc.layouts?.[doc.format]?doc.layouts[doc.format]?.reflowVersion:2 as const,contentKey,dimensions:assetDimensions(doc),nodes:doc.nodes.map(({id,x,y,w,h,fontSize,radius})=>({id,x,y,w,h,fontSize,radius})),blocks:captureBlocks(doc.editor)};
  const layouts={...doc.layouts,[doc.format]:currentLayout},saved=layouts[format];
  const to=saved?.dimensions??formats[format];
  const editor=doc.editor?structuredClone(doc.editor):undefined;
  if(editor){
    // A new format starts from the original landscape arrangement when available.
    // Existing formats keep their own geometry, while text, images and styling stay current.
    if((!saved||refreshLayout)&&layouts.landscape)restoreBlocks(editor,layouts.landscape.blocks);
    resizeEditor(editor,to);
    if(saved&&!refreshLayout){restoreBlocks(editor,saved.blocks);repairEditorScale(editor,to);}
  }
  const fit=fitBoxes(doc.nodes,to),savedNodes=new Map(saved?.nodes.map(n=>[n.id,n])??[]);
  const nodes=doc.nodes.map((node,i)=>({...node,...fit.boxes[i],w:Math.max(8,fit.boxes[i].w),h:Math.max(node.kind==='rule'?.5:8,fit.boxes[i].h),fontSize:Math.max(12,Math.min(160,node.fontSize*fit.scale)),radius:Math.min(100,node.radius*fit.scale),...savedNodes.get(node.id)}));
  if(editor)layouts[format]={reflowVersion:2,contentKey,dimensions:{width:to.width,height:to.height},nodes:nodes.map(({id,x,y,w,h,fontSize,radius})=>({id,x,y,w,h,fontSize,radius})),blocks:captureBlocks(editor)};
  return {...doc,editor,format,dimensions:{width:to.width,height:to.height},layouts,nodes};
}
export function constrainNode(node: AssetNode, format: AssetFormat, dimensions = formats[format] as { width: number; height: number }): AssetNode {
  const { width, height } = dimensions;
  const w = Math.max(8, Math.min(width, node.w)), h = Math.max(node.kind === 'rule' ? .5 : 8, Math.min(height, node.h));
  return { ...node, w, h, x: Math.max(0, Math.min(width - w, node.x)), y: Math.max(0, Math.min(height - h, node.y)) };
}
