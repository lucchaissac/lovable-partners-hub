import { z } from 'zod';
import { htmlBlockMinWidth } from './htmlElementSizing.js';
import { htmlBlockSchema, htmlSectionSchema, htmlEditorSchema, type HtmlEditorState } from './htmlEditorModel.js';
import { htmlNavigationSchema } from './htmlNavigationModel.js';
import { workspaceWidgetsSchema } from './workspaceWidgets.js';
import type { StudioDocument } from './schema.js';
import { workspaceDesignSchema } from './workspaceEditing.js';

export const htmlAgentSelectionSchema = z.object({pageId:z.string().max(80).nullable(),sectionId:z.string().max(80).nullable(),blockIds:z.array(z.string().max(80)).max(200),navigation:z.boolean().optional(),sectionIds:z.array(z.string().max(80)).max(40).optional()});
export type HtmlAgentSelection=z.infer<typeof htmlAgentSelectionSchema>;
export const htmlAgentOperationsSchema=z.array(z.object({
 action:z.enum(['update-block','update-section','update-page','insert-block','insert-section','insert-page','delete-block','delete-section','delete-page','update-widget','update-navigation','update-workspace-design']),
 id:z.string().max(80),parentId:z.string().max(80).nullable(),column:z.number().int().min(0).max(2).nullable(),index:z.number().int().min(0).max(500).nullable(),
 value:z.string().max(200000).describe('JSON object: partial patch for updates; complete new object for insertions; {} for deletions. Never change an existing id.'),
})).max(100);
export type HtmlAgentOperations=z.infer<typeof htmlAgentOperationsSchema>;
export function htmlAgentSelection(context='',state?:HtmlEditorState):HtmlAgentSelection {
 const explicit=/HTML_SELECTION (\{[^\n]*\})/.exec(context);
 if(explicit)return htmlAgentSelectionSchema.parse(JSON.parse(explicit[1]));
 const target=/HTML editor target: (block|section)-([\w-]+)/.exec(context);
 const section=state?.pages.flatMap(p=>p.sections).find(s=>target&&(target[1]==='section'?s.id===target[2]:s.columns.flat().some(b=>b.id===target[2])));
 return {pageId:state?.pages.find(p=>p.sections.includes(section!))?.id||state?.pages[0]?.id||null,sectionId:target?.[1]==='section'?target[2]:null,blockIds:target?.[1]==='block'?[target[2]]:[]};
}
function merge(base:any,patch:any):any {
 if(!patch||typeof patch!=='object'||Array.isArray(patch))return patch;
 const next={...base};for(const [key,value] of Object.entries(patch)){if(['__proto__','constructor','prototype'].includes(key))throw new Error('Invalid property.');if(value===null&&['widthPx','height','minHeight','backgroundImage','paddingTop','paddingRight','paddingBottom','paddingLeft','radiusTopLeft','radiusTopRight','radiusBottomRight','radiusBottomLeft'].includes(key)){delete next[key];continue;}next[key]=value&&typeof value==='object'&&!Array.isArray(value)?merge(base?.[key],value):value;}return next;
}
function parseBlock(value:unknown) {
 const block=htmlBlockSchema.parse(value),minimum=htmlBlockMinWidth(block);
 if(minimum&&block.editor?.widthPx!==undefined)block.editor.widthPx=Math.max(minimum,block.editor.widthPx);
 return block;
}
export function applyHtmlAgentOperations(document:StudioDocument,operations:HtmlAgentOperations,selection:HtmlAgentSelection):StudioDocument {
 if(!document.workspaceManual)throw new Error('This editor has no page content.');
 const next=structuredClone(document),state=next.workspaceManual!,original=document.workspaceManual;
 const originalBlocks=original.pages.flatMap(p=>p.sections.flatMap(s=>s.columns.flat().map(b=>({p,s,b}))));
 const selectedSections=new Set([...(selection.sectionIds||[]),...(selection.sectionId?[selection.sectionId]:[])]);
 const narrow=selectedSections.size>0||selection.blockIds.length>0;
 const allowedSection=(id:string)=>!narrow||selectedSections.has(id)||originalBlocks.some(x=>x.s.id===id&&selection.blockIds.includes(x.b.id));
 const allowedBlock=(id:string,sectionId:string)=>selection.blockIds.length?selection.blockIds.includes(id):allowedSection(sectionId);
 for(const op of htmlAgentOperationsSchema.parse(operations)){
  const data=JSON.parse(op.value);if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Expected an object.');
  if(data.id!==undefined&&data.id!==op.id)throw new Error('Existing IDs must be preserved.');
  const page=state.pages.find(p=>p.id===(op.action.includes('page')?op.id:op.parentId));
  const parent=state.pages.find(p=>p.sections.some(s=>s.id===(op.action==='insert-block'?op.parentId:op.id)));
  const section=parent?.sections.find(s=>s.id===(op.action==='insert-block'?op.parentId:op.id));
  const location=state.pages.flatMap(p=>p.sections.flatMap(s=>s.columns.flatMap((c,ci)=>c.map((b,bi)=>({p,s,c,ci,b,bi}))))).find(x=>x.b.id===op.id);
  if(selection.navigation && op.action!=='update-navigation' && !(op.action==='update-page'&&Object.keys(data).every(key=>['name','icon','hidden'].includes(key))))throw new Error('Only navigation design and page labels/icons/visibility can change in this selection.');
  if(op.action==='update-workspace-design'){
   if(narrow||selection.navigation)throw new Error('Workspace design is outside the selection.');
   next.workspaceDesign=workspaceDesignSchema.parse(merge(next.workspaceDesign||{layout:'full-width'},data));
  }else if(op.action==='update-navigation'){
   if(narrow)throw new Error('The navigation is outside the selection. Select Page navigation first.');
   next.workspaceDesign={...next.workspaceDesign,layout:next.workspaceDesign?.layout||'full-width',navigation:htmlNavigationSchema.parse(merge(next.workspaceDesign?.navigation||{},data))};
  }else if(op.action==='insert-page'){
   if(narrow)throw new Error('Clear the selection before adding a page.');
   const value={...data,id:op.id};state.pages.splice(op.index??state.pages.length,0,value as any);
  }else if(op.action==='update-page'||op.action==='delete-page'){
   if(!page||narrow)throw new Error('The page is outside the selection.');
   if(op.action==='delete-page')state.pages.splice(state.pages.indexOf(page),1);else Object.assign(page,merge(page,data));
  }else if(op.action==='insert-section'){
   if(!page||narrow)throw new Error('The section is outside the selection.');
   page.sections.splice(op.index??page.sections.length,0,htmlSectionSchema.parse({...data,id:op.id}));
  }else if(op.action==='update-section'||op.action==='delete-section'){
   if(!section||section.locked||!allowedSection(section.id)||selection.blockIds.length)throw new Error('The section is locked or outside the selection.');
   if(op.action==='delete-section')parent!.sections.splice(parent!.sections.indexOf(section),1);else parent!.sections[parent!.sections.indexOf(section)]=htmlSectionSchema.parse(merge(section,data));
  }else if(op.action==='insert-block'){
   if(!section||section.locked||!allowedSection(section.id))throw new Error('The section is locked or outside the selection.');
   const column=section.columns[op.column??0];if(!column)throw new Error('Choose an existing column.');
   column.splice(op.index??column.length,0,parseBlock({...data,id:op.id}));
  }else{
   if(!location||location.s.locked||location.b.editor?.locked||!allowedBlock(op.id,location.s.id))throw new Error('The element is locked or outside the selection.');
   if(op.action==='delete-block')location.c.splice(location.bi,1);
   else if(op.action==='update-widget'){
    const current=next.workspaceWidgets?.[op.id];
    // Accept the unambiguous checklist design shorthand while still validating every field.
    const {design,...rest}=data;
    const patch=current&&'kind'in current&&current.kind==='tasks'&&design!==undefined
      ? {...rest,value:merge(rest.value||{},{design})}:data;
    next.workspaceWidgets=workspaceWidgetsSchema.parse({...next.workspaceWidgets,[op.id]:merge(current,patch)});
   }
   else location.c[location.bi]=parseBlock(merge(location.b,data));
  }
 }
 // Parent changes may never bypass element locks or touch unselected elements.
 for(const {s,b} of originalBlocks){
  const after=state.pages.flatMap(p=>p.sections.flatMap(s=>s.columns.flat())).find(item=>item.id===b.id);
  if((s.locked||b.editor?.locked||!allowedBlock(b.id,s.id))&&JSON.stringify(after)!==JSON.stringify(b))throw new Error('A locked or unselected element would change.');
 }
 for(const s of original.pages.flatMap(p=>p.sections))if((s.locked||selectedSections.size>0&&!selectedSections.has(s.id))&&JSON.stringify(state.pages.flatMap(p=>p.sections).find(item=>item.id===s.id))!==JSON.stringify(s))throw new Error('A locked section would change.');
 next.workspaceManual=htmlEditorSchema.parse(state);return next;
}
