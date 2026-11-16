import { z } from 'zod';
import { sourcesSchema } from './sources.js';

const id = z.string().min(1).max(100);
const color = z.string().regex(/^(#[\da-fA-F]{3,8}|var\(--ui-[a-z-]+\))$/);
const fontFamily = z.string().min(1).max(100).regex(/^[\w -]+$/);
const assetSchema = z.object({ id, name: z.string().max(160), width: z.number().positive(), height: z.number().positive() });
export const canvasRuntimeAssetSchema = assetSchema.extend({ src: z.string().max(2_800_000).regex(/^(\/assets\/[\w/.-]+|data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+)$/) });
export const canvasRuntimeAssetsSchema = z.array(canvasRuntimeAssetSchema).max(10);
const imagePlacement = z.object({ pageId: id, shapeId: id.nullable(), placement: z.enum(['image', 'background', 'replace']), assetId: id,
  x: z.number().int().min(0).max(1280), y: z.number().int().min(0).max(1120), width: z.number().int().min(8).max(1280), height: z.number().int().min(8).max(1120) });
const imageStyle = { radius: z.number().int().min(0).max(640).nullable(), borderWidth: z.number().int().min(0).max(24).nullable(), borderColor: color.nullable(), opacity: z.number().int().min(0).max(100).nullable(), shadow: z.enum(['none', 'soft', 'strong']).nullable(), imageFit: z.enum(['contain', 'cover']).nullable() };
export const canvasBrandSchema = z.object({ name: z.string().max(100), source: z.enum(['saved-settings', 'asset-default']), colors: z.record(z.string().max(30), color), fontFamily, fontLabel: z.string().max(100) });
const fontWeight = z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700)]);
const canvasElementSchema = z.object({
  kind: z.enum(['text', 'rectangle', 'circle', 'triangle', 'image']),
  assetId: id.nullable(),
  text: z.string().max(3000).nullable(),
  x: z.number().int().min(0).max(1280), y: z.number().int().min(0).max(1120),
  width: z.number().int().min(1).max(1280), height: z.number().int().min(1).max(1120),
  fill: color,
  fontFamily: fontFamily.nullable(), fontSize: z.number().int().min(8).max(600).nullable(),
  fontWeight: fontWeight.nullable(), lineHeight: z.number().int().min(80).max(200).nullable(),
  letterSpacing: z.number().int().min(-8).max(24).nullable(), textAlign: z.enum(['left', 'center', 'right']).nullable(),
});
export const canvasSourceSchema = z.object({ name: z.string().max(160), data: z.string().max(2_800_000).regex(/^data:(application\/(pdf|vnd.openxmlformats-officedocument.presentationml.presentation)|text\/plain|image\/(png|jpeg|webp|svg\+xml));base64,[A-Za-z0-9+/=]+$/) });
export const canvasRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(6000),
  format: z.enum(['page', 'presentation']),
  activePageId: id.optional(),
  imageFrames: z.boolean().default(false),
  imageReferences: z.array(canvasRuntimeAssetSchema).max(2).default([]),
  pages: z.array(z.object({ id, title: z.string().max(200), locked: z.boolean().optional(), styleId: z.string().max(40).optional(), layoutId: z.string().max(40).optional(), background: z.string().max(80).optional(), shapes: z.array(z.object({ id, kind: z.string().max(30).optional(), assetId: id.optional(), text: z.string().max(12000).optional(), locked: z.boolean().optional(), x: z.number(), y: z.number(), width: z.number(), height: z.number(), appearance: z.record(z.string(), z.union([z.string().max(100), z.number(), z.boolean()])).optional() })).max(200) })).max(60),
  selection: z.object({ pageIds: z.array(id).max(60), pageId: id.nullable(), shapeIds: z.array(id).max(200) }),
  conversation: z.array(z.object({ text: z.string().max(6000), reply: z.string().max(4000).optional() })).max(12).default([]),
  sources: z.array(canvasSourceSchema).max(1).default([]),
  references: sourcesSchema.default([]),
  brand: canvasBrandSchema.optional(),
  assets: z.array(assetSchema).max(10).default([]),
});
export const canvasResultSchema = z.object({
  summary: z.string().max(4000),
  title: z.string().max(120).nullable(),
  images: z.array(imagePlacement).max(2).default([]),
  pages: z.array(z.object({
    id: id.nullable().describe('Existing page ID to update, or null to append a new page.'),
    title: z.string().max(160),
    layout: z.enum(['cover', 'split', 'columns', 'statement', 'timeline', 'closing']).nullable(),
    style: z.enum(['asset', 'editorial', 'contrast', 'mono']).nullable(),
    background: color.nullable(),
    elements: z.array(canvasElementSchema).min(1).max(40).nullable().describe('Custom composition in back-to-front order. Use for new pages and requested redesigns; null preserves elements or uses the named layout.'),
    texts: z.array(z.object({ slot: z.string().max(40), text: z.string().max(1600) })).max(4),
  })).max(12),
  edits: z.array(z.object({
    pageId: id, shapeId: id,
    text: z.string().max(12000).nullable(),
    fill: color.nullable(), fontSize: z.number().int().min(8).max(300).nullable(),
    fontFamily: fontFamily.nullable(),
    fontWeight: fontWeight.nullable(),
    x: z.number().int().min(-2000).max(4000).nullable(), y: z.number().int().min(-2000).max(4000).nullable(),
    width: z.number().int().min(8).max(4000).nullable(), height: z.number().int().min(8).max(4000).nullable(),
    radius: imageStyle.radius.default(null), borderWidth: imageStyle.borderWidth.default(null), borderColor: imageStyle.borderColor.default(null), opacity: imageStyle.opacity.default(null), shadow: imageStyle.shadow.default(null), imageFit: imageStyle.imageFit.default(null),
  })).max(200),
});
// The provider plans image work; only the server creates and resolves asset IDs.
export const canvasPlanSchema = canvasResultSchema.extend({
  images: z.array(imagePlacement.omit({ assetId: true }).extend({ prompt: z.string().min(1).max(3000), name: z.string().min(1).max(120), sourceId: id.nullable(), background: z.enum(['auto', 'opaque', 'transparent']).default('auto') })).max(2),
  edits: z.array(canvasResultSchema.shape.edits.element.extend(imageStyle)).max(200),
});
export type CanvasRequest = z.infer<typeof canvasRequestSchema>;
export type CanvasResult = z.infer<typeof canvasResultSchema>;
export type CanvasPlan = z.infer<typeof canvasPlanSchema>;
export const canvasImageProgressSchema = z.array(imagePlacement.omit({ assetId: true }).extend({ state: z.enum(['generating', 'editing', 'removing-background']) })).max(2);
export type CanvasImageProgress = z.infer<typeof canvasImageProgressSchema>;

/** Validate the entire plan before any mutation, including page and element locks. */
export function validateCanvasTargets(input: CanvasRequest, result: CanvasResult) {
  const selected = input.selection;
  const availableFont = (font: string | null) => !font || ['Arial', 'Arial', 'Impact', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New'].includes(font) || font === input.brand?.fontFamily;
  for (const op of result.pages) {
    if (op.elements) {
      const [width, height] = input.format === 'presentation' ? [1280, 720] : [800, 1120];
      if (op.layout || op.texts.length) throw new Error('Choose a custom composition or a preset layout.');
      for (const element of op.elements) {
        if (element.x + element.width > width || element.y + element.height > height) throw new Error('An element extends beyond the page.');
        if (element.kind === 'text' && (!element.text || !element.fontSize || !element.fontFamily)) throw new Error('Text needs content and typography.');
        if (!availableFont(element.fontFamily)) throw new Error('Use an available font.');
        if (element.kind === 'image' && !input.assets.some(asset => asset.id === element.assetId)) throw new Error('Use an available image asset.');
      }
    }
    if (!op.id) { if (!op.layout && !op.elements) throw new Error('A new page needs a composition.'); continue; }
    const page = input.pages.find(page => page.id === op.id);
    if (!page || page.locked || selected.shapeIds.length || (selected.pageIds.length && !selected.pageIds.includes(op.id))) throw new Error('The request tried to change a page outside the editable selection.');
    if (page.shapes.some(shape => shape.locked) && (op.layout || op.texts.length || op.elements)) throw new Error('Unlock the elements before changing this page layout.');
  }
  for (const op of result.edits) {
    if (!availableFont(op.fontFamily)) throw new Error('Use an available font.');
    const page = input.pages.find(page => page.id === op.pageId), shape = page?.shapes.find(shape => shape.id === op.shapeId);
    if (!page || page.locked || !shape || shape.locked || (selected.shapeIds.length ? selected.pageId !== page.id || !selected.shapeIds.includes(shape.id) : selected.pageIds.length && !selected.pageIds.includes(page.id))) throw new Error('The request tried to change an element outside the editable selection.');
  }
  const imageTargets = new Set<string>();
  for (const op of result.images || []) {
    const added = /^new:(\d+)$/.exec(op.pageId);
    const pageOp = added ? result.pages[Number(added[1])] : undefined;
    const page = added && pageOp && !pageOp.id ? { id: op.pageId, shapes: [], locked: false } : input.pages.find(page => page.id === op.pageId);
    const shape = page?.shapes.find(shape => shape.id === op.shapeId);
    const insertingOnSelectedPage = op.placement === 'image' && !op.shapeId && selected.pageId === page?.id;
    if (!page || page.locked || (selected.pageIds.length && !selected.pageIds.includes(page.id)) || (selected.shapeIds.length && (selected.pageId !== page.id || (!insertingOnSelectedPage && (!op.shapeId || !selected.shapeIds.includes(op.shapeId)))))) throw new Error('The image is outside the editable selection.');
    const canFillFrame = input.imageFrames && op.placement === 'replace' && shape?.kind === 'rectangle';
    if ((op.placement === 'replace' && !op.shapeId) || (op.placement === 'image' && op.shapeId) || (op.shapeId && (!shape || (shape.kind !== 'image' && !canFillFrame) || shape.locked))) throw new Error('Choose an unlocked image or rectangle to fill.');
    const composition = added ? pageOp : result.pages.find(update => update.id === page.id && (update.elements || update.layout));
    // Rebuilding replaces old shape IDs. A new image can join the new custom layout
    // atomically, but replacing an old shape or obscuring editable text cannot.
    if (composition && (op.shapeId || (!added && !composition.elements))) throw new Error('Add a new image to a custom composition instead of replacing a rebuilt element.');
    if (composition?.elements && op.placement === 'image' && composition.elements.some(element => element.kind === 'text' && op.x < element.x + element.width && op.x + op.width > element.x && op.y < element.y + element.height && op.y + op.height > element.y)) throw new Error('Reserve space for the image without covering editable text.');
    const target = `${page.id}:${op.shapeId || (op.placement === 'background' ? 'background' : result.images.indexOf(op))}`;
    if (imageTargets.has(target)) throw new Error('Only one image change per target is allowed.');
    imageTargets.add(target);
    const [width, height] = input.format === 'presentation' ? [1280, 720] : [800, 1120];
    if (op.placement !== 'replace' && (op.x + op.width > width || op.y + op.height > height)) throw new Error('An image extends beyond the page.');
    if (!input.assets.some(asset => asset.id === op.assetId)) throw new Error('Use an available image asset.');
    if (!op.shapeId && page.shapes.length >= 200) throw new Error('This page has too many elements.');
  }
  if (input.pages.length + result.pages.filter(page => !page.id).length > 60) throw new Error('This document can contain up to 60 pages.');
  return result;
}
