import { htmlEditorSchema } from './htmlEditorModel.js';
import { htmlNavigationSchema } from './htmlNavigationModel.js';
import { htmlWidgetThemeSchema, themeColor } from './htmlWorkspaceTheme.js';
import { z } from 'zod';
import { workspaceWidgetEditSchema, workspaceWidgetsSchema } from './workspaceWidgets.js';
import type { StudioDocument } from './schema.js';

const imageId = z.string().regex(/^[a-zA-Z0-9-]{1,100}$/);
// No remote hosts, SVG markup or executable URLs in direct image replacements.
const imageSource = z.string().max(900000).refine(value => /^\/assets\/[a-zA-Z0-9/_ .-]+\.(?:png|jpe?g|webp|gif)$/i.test(value) && !value.includes('..') || /^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/]+=*$/.test(value));
export const workspaceDesignSchema = z.object({ layout: z.enum(['full-width', 'document']), navigation: htmlNavigationSchema.optional(), sectionNavigation:htmlNavigationSchema.optional(), background:themeColor.optional(), widgetTheme:htmlWidgetThemeSchema.optional(), brandUrl:z.string().url().max(2000).optional(), contentPaddingLeft:z.number().min(0).max(400).optional(),contentPaddingRight:z.number().min(0).max(400).optional(),contentPaddingBottom:z.number().min(0).max(400).optional(),contentTopSpacing: z.number().min(0).max(400).optional() }).strict();
export const workspaceImageSchema = z.object({
  src: imageSource.optional(), alt: z.string().max(500).optional(),
  width: z.number().min(10).max(100).optional(), fit: z.enum(['contain', 'cover']).optional(),
  x: z.number().finite().min(-4000).max(4000).optional(), y: z.number().finite().min(-4000).max(4000).optional(),
  hidden: z.boolean().optional(),
}).strict();
export const workspaceImagesSchema = z.record(imageId, workspaceImageSchema).refine(value => Object.keys(value).length <= 100 && JSON.stringify(value).length <= 2000000);
export const workspaceMoveSchema = z.object({source:imageId,target:imageId,mode:z.enum(['before','after','inside','swap'])}).strict().refine(move=>move.source!==move.target);
export const workspaceLayoutSchema = z.array(workspaceMoveSchema).max(500);
export type WorkspaceMove = z.infer<typeof workspaceMoveSchema>;
export const workspaceBlockSchema = z.object({
  background: z.string().regex(/^(?:#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|transparent)$/).optional(),
  padding: z.number().int().min(0).max(160).optional(), radius: z.number().int().min(0).max(80).optional(),
  columnRatio: z.number().min(20).max(80).optional(),
  alignment: z.enum(['left', 'center', 'right']).optional(),
  x: z.number().finite().min(-4000).max(4000).optional(), y: z.number().finite().min(-4000).max(4000).optional(), hidden: z.boolean().optional(),
}).strict();
export const workspaceBlocksSchema = z.record(imageId, workspaceBlockSchema).refine(value => Object.keys(value).length <= 100);
export type WorkspaceBlockEdit = z.infer<typeof workspaceBlockSchema>;
export const workspaceSnapshotSchema=z.object({
 workspaceManual:htmlEditorSchema.optional(),
 workspaceLayout:workspaceLayoutSchema.optional(),workspaceDesign:workspaceDesignSchema.optional(),
 workspaceBlocks:workspaceBlocksSchema.optional(),workspaceImages:workspaceImagesSchema.optional(),workspaceWidgets:workspaceWidgetsSchema.optional(),
}).strict();
export type WorkspaceSnapshot=z.infer<typeof workspaceSnapshotSchema>;
export function workspaceSnapshot(document:StudioDocument):WorkspaceSnapshot {
 return structuredClone({workspaceManual:document.workspaceManual,workspaceLayout:document.workspaceLayout,workspaceDesign:document.workspaceDesign,workspaceBlocks:document.workspaceBlocks,workspaceImages:document.workspaceImages,workspaceWidgets:document.workspaceWidgets});
}
export const workspaceEditSchema = z.discriminatedUnion('type', [
  z.object({type:z.literal('manual'),value:htmlEditorSchema}).strict(),
  z.object({type:z.literal('restore'),value:workspaceSnapshotSchema}).strict(),
  z.object({type:z.literal('reset-layout')}).strict(),
  z.object({ type:z.literal('move'), value:workspaceMoveSchema }).strict(),
  z.object({ type: z.literal('design'), value: workspaceDesignSchema }).strict(),
  z.object({ type: z.literal('block'), id: imageId, value: workspaceBlockSchema.nullable() }).strict(),
  z.object({ type: z.literal('widget'), id: imageId, value: workspaceWidgetEditSchema.nullable() }).strict(),
  z.object({ type: z.literal('image'), id: imageId, value: workspaceImageSchema.nullable() }).strict(),
]);
export type WorkspaceDesign = z.infer<typeof workspaceDesignSchema>;
export type WorkspaceImageEdit = z.infer<typeof workspaceImageSchema>;
export type WorkspaceEdit = z.infer<typeof workspaceEditSchema>;
export function editWorkspace(document: StudioDocument, input: WorkspaceEdit): StudioDocument {
  if (document.experience !== 'workspace-editor') throw new Error('This page is not a workspace editor.');
  const command = workspaceEditSchema.parse(input);
  if(command.type==='manual')return {...document,workspaceManual:command.value};
  if(command.type==='restore')return {...document,workspaceManual:command.value.workspaceManual,workspaceLayout:command.value.workspaceLayout,workspaceDesign:command.value.workspaceDesign,workspaceBlocks:command.value.workspaceBlocks,workspaceImages:command.value.workspaceImages,workspaceWidgets:command.value.workspaceWidgets};
  if(command.type==='reset-layout')return {...document,workspaceLayout:[],workspaceBlocks:Object.fromEntries(Object.entries(document.workspaceBlocks||{}).map(([id,{x,y,columnRatio,...rest}])=>[id,rest])),workspaceImages:Object.fromEntries(Object.entries(document.workspaceImages||{}).map(([id,{x,y,width,...rest}])=>[id,rest]))};
  if (command.type === 'move') return {...document,workspaceLayout:workspaceLayoutSchema.parse([...(document.workspaceLayout || []),command.value])};
  if (command.type === 'design') return { ...document, workspaceDesign: command.value };
  if (command.type === 'block') {
    const blocks = { ...document.workspaceBlocks };
    if (command.value === null) delete blocks[command.id]; else blocks[command.id] = command.value;
    return { ...document, workspaceBlocks: workspaceBlocksSchema.parse(blocks) };
  }
  if (command.type === 'widget') {
    const widgets = { ...document.workspaceWidgets };
    if (command.value === null) delete widgets[command.id]; else widgets[command.id] = command.value;
    return { ...document, workspaceWidgets: workspaceWidgetsSchema.parse(widgets) };
  }
  const images = { ...document.workspaceImages };
  if (command.value === null) delete images[command.id]; else images[command.id] = command.value;
  return { ...document, workspaceImages: workspaceImagesSchema.parse(images) };
}
// Stable across reloads; identical sources are distinguished by their occurrence.
export function workspaceImageId(source: string, occurrence: number) {
  let hash = 2166136261;
  for (let index = 0; index < source.length; index++) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  return `image-${(hash >>> 0).toString(36)}-${occurrence}`;
}
