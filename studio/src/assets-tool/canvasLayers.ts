import type {HtmlBlock,HtmlEditorState} from '../studio/htmlEditorModel';

export type CanvasLayer={id:string;group:boolean;blocks:HtmlBlock[]};
/** Frontmost first, with authored groups kept together in the tree. */
export function canvasLayers(column:HtmlBlock[]):CanvasLayer[]{
 const seen=new Set<string>();
 return [...column].reverse().flatMap<CanvasLayer>(block=>{
  const group=block.editor?.groupId;
  if(!group)return [{id:block.id,group:false,blocks:[block]}];
  if(seen.has(group))return [];seen.add(group);
  return [{id:`group:${group}`,group:true,blocks:column.filter(item=>item.editor?.groupId===group).reverse()}];
 });
}
export function canvasLayerName(block:HtmlBlock){
 if(block.kind==='text')return block.value.runs.map(run=>run.text).join('').trim().slice(0,70)||'Text';
 if(block.kind==='image')return block.value.alt?.trim()||'Image';
 if(block.kind==='shape')return block.icon?'Icon':block.shape==='line'?'Line':block.shape==='rectangle'?'Rectangle':block.shape==='circle'?'Circle':'Triangle';
 if(block.kind==='media')return block.format;
 return block.kind==='divider'?'Divider':'Element';
}
/** Tree order is the reverse of paint order. Crossing another group moves the
 * complete group; dropping inside one's own group reorders its children only. */
export function reorderCanvasLayers(state:HtmlEditorState,ids:string[],targetIds:string[],side:'before'|'after'):HtmlEditorState{
 const picked=new Set(ids),target=new Set(targetIds);
 if(!picked.size||!target.size||ids.some(id=>target.has(id)))return state;
 for(const page of state.pages)for(const section of page.sections)for(const column of section.columns){
  if(!ids.every(id=>column.some(block=>block.id===id))||!targetIds.every(id=>column.some(block=>block.id===id)))continue;
  if(section.locked)return state;
  const first=column.find(block=>picked.has(block.id))!,destination=column.find(block=>target.has(block.id))!;
  const sameGroup=first.editor?.groupId&&first.editor.groupId===destination.editor?.groupId&&ids.every(id=>column.find(block=>block.id===id)?.editor?.groupId===first.editor?.groupId);
  if(!sameGroup){
   const groups=new Set(column.filter(block=>picked.has(block.id)).map(block=>block.editor?.groupId).filter(Boolean));
   for(const block of column){if(block.editor?.groupId&&groups.has(block.editor.groupId))picked.add(block.id);if(destination.editor?.groupId&&block.editor?.groupId===destination.editor.groupId)target.add(block.id);}
  }
  const moving=column.filter(block=>picked.has(block.id));
  if(moving.some(block=>block.editor?.locked||target.has(block.id)))return state;
  const rest=column.filter(block=>!picked.has(block.id)),indices=rest.flatMap((block,index)=>target.has(block.id)?[index]:[]);
  const at=side==='before'?Math.max(...indices)+1:Math.min(...indices);
  const reordered=[...rest.slice(0,at),...moving,...rest.slice(at)];
  if(reordered.every((block,index)=>block===column[index]))return state;
  return {...state,pages:state.pages.map(p=>p!==page?p:{...p,sections:p.sections.map(s=>s!==section?s:{...s,columns:s.columns.map(c=>c===column?reordered:c)})})};
 }
 return state;
}

export type CanvasLayerAction='group'|'ungroup'|'lock'|'unlock'|'hide'|'show';
/** One undoable document edit. Group edits include existing group siblings and
 * never move or flatten their artwork. A locked layer can still be shown/unlocked. */
export function canvasLayerAction(state:HtmlEditorState,ids:string[],action:CanvasLayerAction,groupId?:string):HtmlEditorState{
 if(!ids.length)return state;
 for(const page of state.pages)for(const section of page.sections)for(const column of section.columns){
  if(!ids.every(id=>column.some(block=>block.id===id)))continue;
  if(section.locked)return state;
  const picked=new Set(ids),grouping=action==='group'||action==='ungroup';
  if(grouping){
   const groups=new Set(column.filter(block=>picked.has(block.id)).map(block=>block.editor?.groupId).filter(Boolean));
   for(const block of column)if(block.editor?.groupId&&groups.has(block.editor.groupId))picked.add(block.id);
   const members=column.filter(block=>picked.has(block.id));
   if(members.some(block=>block.editor?.locked))return state;
   if(action==='group'&&(!groupId||members.length<2||members.every(block=>block.editor?.groupId&&block.editor.groupId===members[0].editor?.groupId)))return state;
   if(action==='ungroup'&&!groups.size)return state;
  }
  let changed=false;
  const edited=column.map(block=>{
   if(!picked.has(block.id))return block;
   const editor={...block.editor};
   if(action==='group')editor.groupId=groupId;
   else if(action==='ungroup')delete editor.groupId;
   else if(action==='lock'||action==='unlock')editor.locked=action==='lock';
   else editor.hidden=action==='hide';
   if(JSON.stringify(editor)===JSON.stringify(block.editor??{}))return block;
   changed=true;return {...block,editor};
  });
  if(!changed)return state;
  return {...state,pages:state.pages.map(p=>p!==page?p:{...p,sections:p.sections.map(s=>s!==section?s:{...s,columns:s.columns.map(c=>c===column?edited:c)})})};
 }
 return state;
}
