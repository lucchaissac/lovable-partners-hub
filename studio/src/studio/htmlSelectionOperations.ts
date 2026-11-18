import type { HtmlBlock, HtmlEditorState } from './htmlEditorModel';
export type ElementFrame = NonNullable<HtmlBlock['editor']>;
export type SelectionAction = 'duplicate' | 'delete' | 'lock' | 'unlock' | 'up' | 'down' | 'first' | 'last';
export function htmlSectionSelectionAction(state: HtmlEditorState, ids: string[], action: SelectionAction, freshId = () => crypto.randomUUID()) {
  const selected = new Set(ids), copies: Record<string,string> = {}, next = structuredClone(state), duplicated: string[] = [];
  const picked = state.pages.flatMap(p=>p.sections).filter(s=>selected.has(s.id));
  if (action!=='lock' && action!=='unlock' && picked.some(s=>s.locked)) return {state,copies,ids};
  if (action==='duplicate' && state.pages.some(p=>p.sections.length+p.sections.filter(s=>selected.has(s.id)).length>40)) return {state,copies,ids};
  for (const page of next.pages) {
    const sections=page.sections.filter(s=>selected.has(s.id));
    if (!sections.length) continue;
    if (action==='lock'||action==='unlock') { for(const section of sections)section.locked=action==='lock'; }
    else if(action==='delete') page.sections=page.sections.filter(s=>!selected.has(s.id));
    else if(action==='duplicate') {
      const clones=sections.map(section=>{const copy=structuredClone(section);copy.id=freshId();duplicated.push(copy.id);copy.name=`${copy.name} (copy)`.slice(0,100);for(const block of copy.columns.flat()){const id=freshId();copies[block.id]=id;block.id=id;}return copy;});
      page.sections.splice(page.sections.findIndex(s=>s.id===sections.at(-1)!.id)+1,0,...clones);
    } else if(action==='first')page.sections=[...sections,...page.sections.filter(s=>!selected.has(s.id))];
    else if(action==='last')page.sections=[...page.sections.filter(s=>!selected.has(s.id)),...sections];
    else if(action==='up')for(let i=1;i<page.sections.length;i++){if(selected.has(page.sections[i].id)&&!selected.has(page.sections[i-1].id))[page.sections[i-1],page.sections[i]]=[page.sections[i],page.sections[i-1]];}
    else if(action==='down')for(let i=page.sections.length-2;i>=0;i--){if(selected.has(page.sections[i].id)&&!selected.has(page.sections[i+1].id))[page.sections[i+1],page.sections[i]]=[page.sections[i],page.sections[i+1]];}
  }
  return {state:next,copies,ids:action==='duplicate'?duplicated:action==='delete'?[]:ids};
}
export function htmlSelectionAction(state: HtmlEditorState, ids: string[], action: SelectionAction, freshId = () => crypto.randomUUID()) {
  const selected = new Set(ids), copies: Record<string, string> = {}, next = structuredClone(state), groups = new Map<string,string>();
  for (const page of next.pages) for (const section of page.sections) section.columns = section.columns.map(column => {
    const picked = column.filter(b => selected.has(b.id));
    if (!picked.length) return column;
    if (action === 'lock' || action === 'unlock') return column.map(b => selected.has(b.id) ? { ...b, editor: { ...b.editor, locked: action === 'lock' } } : b);
    if (picked.some(b => b.editor?.locked)) return column;
    if (action === 'delete') return column.filter(b => !selected.has(b.id));
    if (action === 'duplicate') return column.flatMap(b => {
      if (!selected.has(b.id)) return [b];
      const id = freshId(); copies[b.id] = id;
      const clone={...structuredClone(b),id};
      clone.editor={...clone.editor,motionId:b.editor?.motionId??b.id};
      if(clone.editor?.groupId){const group=clone.editor.groupId;if(!groups.has(group))groups.set(group,freshId());clone.editor.groupId=groups.get(group)!;}
      return [b, clone];
    });
    if (action === 'first') return [...picked, ...column.filter(b => !selected.has(b.id))];
    if (action === 'last') return [...column.filter(b => !selected.has(b.id)), ...picked];
    const result = [...column];
    if (action === 'up') for (let i = 1; i < result.length; i++) { if (selected.has(result[i].id) && !selected.has(result[i - 1].id)) [result[i - 1], result[i]] = [result[i], result[i - 1]]; }
    if (action === 'down') for (let i = result.length - 2; i >= 0; i--) { if (selected.has(result[i].id) && !selected.has(result[i + 1].id)) [result[i + 1], result[i]] = [result[i], result[i + 1]]; }
    return result;
  });
  return { state: next, copies, ids: action === 'duplicate' ? Object.values(copies) : action === 'delete' ? [] : ids };
}
export function patchHtmlFrames(state: HtmlEditorState, frames: Record<string, ElementFrame>) {
  return { ...state, pages: state.pages.map(p => ({ ...p, sections: p.sections.map(s => ({ ...s, columns: s.columns.map(c => c.map(b => frames[b.id] ? { ...b, editor: { ...b.editor, ...frames[b.id] } } : b)) })) })) };
}
export type Rect = { left: number; top: number; width: number; height: number };
export function selectionBounds(boxes: Rect[]): Rect | null {
  if (!boxes.length) return null;
  const left = Math.min(...boxes.map(b => b.left)), top = Math.min(...boxes.map(b => b.top));
  return { left, top, width: Math.max(...boxes.map(b => b.left + b.width)) - left, height: Math.max(...boxes.map(b => b.top + b.height)) - top };
}
