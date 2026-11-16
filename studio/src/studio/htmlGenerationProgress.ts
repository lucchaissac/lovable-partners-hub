import { z } from 'zod';
import { canvasImageProgressSchema } from './canvasAgentSchema.js';
import type { HtmlEditorState } from './htmlEditorModel.js';
import type { HtmlAgentOperations, HtmlAgentSelection } from './htmlAgentOperations.js';

/** Transient server progress; never part of saved document or exports. */
export const htmlGenerationProgressSchema = z.object({
  sectionIds: z.array(z.string().max(80)).max(200),
  blockIds: z.array(z.string().max(80)).max(200),
  images: canvasImageProgressSchema,
});
export type HtmlGenerationProgress = z.infer<typeof htmlGenerationProgressSchema>;

export function htmlProgressTargets(state: HtmlEditorState, selection: HtmlAgentSelection, operations?: HtmlAgentOperations): HtmlGenerationProgress {
  const sections = state.pages.flatMap(p => p.sections);
  const sectionIds = new Set<string>(), blockIds = new Set<string>();
  const section = (id: string | null) => { const s = sections.find(s => s.id === id); if (s && !s.locked) sectionIds.add(s.id); };
  const block = (id: string) => { const s = sections.find(s => s.columns.flat().some(b => b.id === id)); const b = s?.columns.flat().find(b => b.id === id); if (b && !b.editor?.locked && !s?.locked) blockIds.add(id); };
  if (operations) for (const op of operations) {
    if (op.action === 'insert-block') section(op.parentId);
    else if (op.action.endsWith('-block') || op.action === 'update-widget') block(op.id);
    else if (op.action.endsWith('-section')) section(op.id);
    else if (op.action.endsWith('-page')) state.pages.find(p => p.id === op.id)?.sections.forEach(s => section(s.id));
  } else if (selection.navigation) { /* Navigation edits do not animate page content. */ }
  else if (selection.blockIds.length) selection.blockIds.forEach(block);
  else if (selection.sectionIds?.length) selection.sectionIds.forEach(section);
  else if (selection.sectionId) section(selection.sectionId);
  else state.pages.find(p => p.id === selection.pageId)?.sections.forEach(s => section(s.id));
  // Selected images show their existing-image animation while the request is being prepared.
  // Later validated plan events replace this optimistic state with the actual targets.
  const images: HtmlGenerationProgress['images'] = operations ? [] : sections.flatMap(s => s.columns.flat().flatMap(b =>
    b.kind === 'image' && blockIds.has(b.id) ? [{ pageId: s.id, shapeId: b.id, placement: 'replace' as const, x: 0, y: 0, width: 600, height: Math.round(Math.min(1120, b.editor?.height || 450)), state: 'editing' as const }] : []
  )).slice(0, 2);
  return { sectionIds: [...sectionIds], blockIds: [...blockIds], images };
}
