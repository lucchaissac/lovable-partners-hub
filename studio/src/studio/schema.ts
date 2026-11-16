import { htmlEditorSchema } from './htmlEditorModel.js';
import { z } from 'zod';
import { workspaceWidgetsSchema } from './workspaceWidgets.js';
import { workspaceDesignSchema, workspaceImagesSchema, workspaceBlocksSchema, workspaceLayoutSchema } from './workspaceEditing.js';
import { sourceReferenceSchema, sourceLimits, compactSourcePreviews } from './sources.js';

export const baseSchema = z.enum(['canvas', 'app', 'editor']);
export const starterSchema = z.enum(['editor', 'home', 'accounts', 'workspaces', 'tasks', 'templates', 'library', 'courses', 'reports', 'settings']);
export const studioIcons = ['file-text', 'settings', 'users', 'chart-column', 'list-checks', 'briefcase', 'mail', 'calendar', 'folder', 'panels-top-left'] as const;
const text = z.string().max(500);
export const textEditSchema = z.object({
  original: z.string().max(8000),
  runs: z.array(z.object({ text: z.string().max(8000), bold: z.boolean().optional(), italic: z.boolean().optional(), underline: z.boolean().optional() }).strict()).max(200),
}).strict().refine(edit => edit.runs.reduce((length, run) => length + run.text.length, 0) <= 8000);
export type StudioTextEdit = z.infer<typeof textEditSchema>;
const prototypeCodeSchema = z.object({ source: z.string().max(400000), compiled: z.string().max(700000), route: z.string().max(40), summary: z.string().max(600) }).strict();
const common = { id: z.string().regex(/^[a-zA-Z0-9-]{1,60}$/), title: z.string().max(100), description: text, tab: z.string().max(40) };
export const blockSchema = z.discriminatedUnion('kind', [
  z.object({ ...common, kind: z.literal('text'), body: z.string().max(4000) }).strict(),
  z.object({ ...common, kind: z.literal('stats'), items: z.array(z.object({ label: z.string().max(80), value: z.string().max(40) }).strict()).min(1).max(4) }).strict(),
  z.object({ ...common, kind: z.literal('table'), columns: z.array(z.string().max(60)).min(1).max(6), rows: z.array(z.array(z.string().max(200)).max(6)).max(20) }).strict(),
  z.object({ ...common, kind: z.literal('cards'), items: z.array(z.object({ title: z.string().max(100), body: text, icon: z.enum(studioIcons) }).strict()).min(1).max(6) }).strict(),
  z.object({ ...common, kind: z.literal('settings'), items: z.array(z.object({ label: z.string().max(100), description: text, enabled: z.boolean() }).strict()).min(1).max(8) }).strict(),
]);
export const documentSchema = z.object({
  schemaVersion: z.literal(1), base: baseSchema, contentMode: z.enum(['original', 'custom']), title: z.string().min(1).max(100),
  experience: z.literal('workspace-editor').optional(),
  workspaceContent: prototypeCodeSchema.optional(),
  workspaceDesign: workspaceDesignSchema.optional(),
  workspaceManual: htmlEditorSchema.optional(),
  workspaceImages: workspaceImagesSchema.optional(),
  workspaceLayout: workspaceLayoutSchema.optional(),
  workspaceBlocks: workspaceBlocksSchema.optional(),
  workspaceWidgets: workspaceWidgetsSchema.optional(),
  workspaceChats: z.array(z.object({ id: z.string().regex(/^[a-zA-Z0-9-]{1,80}$/), title: z.string().min(1).max(120), updatedAt: z.number().finite().nonnegative(), pinned: z.boolean().optional(), archived: z.boolean().optional(), deleted: z.boolean().optional(), minimalThinking: z.boolean().optional() }).strict()).max(25).optional(),
  workspaceActiveChatId: z.string().regex(/^[a-zA-Z0-9-]{1,80}$/).optional(),
  textEdits: z.record(z.string().regex(/^[a-zA-Z0-9-]{1,80}$/), textEditSchema).refine(value => Object.keys(value).length <= 100).optional(),
  description: text, icon: z.enum(studioIcons), action: z.string().max(40),
  starter: starterSchema.optional(),
  catalog: z.object({ route: z.string().regex(/^\/(?:protos\/[a-z0-9-]+|ai)$/), search: z.string().max(2000) }).strict().optional(),
  code: prototypeCodeSchema.optional(),
  tabs: z.array(z.string().min(1).max(40)).max(6), blocks: z.array(blockSchema).max(12),
}).strict();
export type StudioDocument = z.infer<typeof documentSchema>;
export type StudioBlock = z.infer<typeof blockSchema>;
export type StudioBase = z.infer<typeof baseSchema>;
export const generationAgentSchema = z.object({ id: z.string().min(1).max(160), name: z.string().min(1).max(80), task: z.string().min(1).max(240), status: z.enum(['running', 'completed', 'failed']) }).strict();
export const conversationSchema = z.array(z.object({ channel: z.enum(['studio', 'workspace']).optional(), workspaceChatId: z.string().regex(/^[a-zA-Z0-9-]{1,80}$/).optional(), id: z.uuid().optional(), createdAt: z.iso.datetime().optional(), author: z.object({ id: z.string().max(160), name: z.string().min(1).max(100) }).strict().optional(), text: z.string().max(4000), user: z.boolean(), hiddenInChat: z.boolean().optional(), context: z.string().max(500).optional(), sources: z.array(sourceReferenceSchema).max(sourceLimits.count).optional(), agents: z.array(generationAgentSchema).max(12).optional(), version: z.number().int().positive().optional(), pendingRequest: z.object({ id: z.uuid(), failure: z.string().max(1200).optional(), visual: z.object({ context: z.string().max(6000).optional(), page: z.string().max(200).optional(), needsImage: z.boolean() }).optional() }).optional() }).strict()).max(1040).transform(compactSourcePreviews);
export type StudioMessage = z.infer<typeof conversationSchema>[number];
export function parseDocument(value: unknown): StudioDocument {
  const doc = documentSchema.parse(value);
  if (doc.workspaceChats && new Set(doc.workspaceChats.map(chat => chat.id)).size !== doc.workspaceChats.length) throw new Error('Each chat needs a unique ID.');
  if (new Set(doc.blocks.map(block => block.id)).size !== doc.blocks.length) throw new Error('Each section needs a unique ID.');
  if (new Set(doc.tabs).size !== doc.tabs.length) throw new Error('Each tab needs a unique name.');
  for (const block of doc.blocks) {
    if (block.tab && !doc.tabs.includes(block.tab)) throw new Error('A section references a missing tab.');
    if (block.kind === 'table' && block.rows.some(row => row.length !== block.columns.length)) throw new Error('Table rows must match the column count.');
  }
  return doc;
}
