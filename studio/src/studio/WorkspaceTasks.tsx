import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { EditorChecklist, SAMPLE_CHECKLIST, type EditorChecklistValue } from '../components/editor-widgets';
import { WorkspaceEditingContext } from './WorkspaceAssets';
import { useWorkspaceInteraction } from './WorkspaceInteraction';
import { useWorkspaceWidgetHost } from './WorkspaceWidgetHost';
import { useWorkspaceWidgetWidth } from './WorkspaceWidgetWidth';
import { editorChecklistSchema } from './workspaceTaskSchema';

type Props = {id:string;title?:string;tasks?:EditorChecklistValue['tasks'];view?:'list'|'card';expandOnPublic?:boolean};
export function WorkspaceTasks({id,title='Tasks',tasks=SAMPLE_CHECKLIST.tasks,view='list',expandOnPublic=false}:Props) {
 const editing=useContext(WorkspaceEditingContext),host=useWorkspaceWidgetHost(),interaction=useWorkspaceInteraction();
 const parsed=editorChecklistSchema.safeParse({title,tasks,view,expandOnPublic});
 const original=parsed.success?parsed.data:{...SAMPLE_CHECKLIST,title:'Tasks'};
 const stored=editing.widgets?.[id];
 const edit=stored&&'kind' in stored&&stored.kind==='tasks'?stored:undefined;
 const persisted=edit&&JSON.stringify(edit.original)===JSON.stringify(original)?edit.value:original;
 const editable=!!editing.onEdit&&!!editing.ramp&&/^[a-zA-Z0-9-]{1,80}$/.test(id);
 const [local,setLocal]=useState(persisted);
 const pending=useRef<string[]>([]);
 const persistedKey=JSON.stringify(persisted);
 useEffect(()=>{
   const acknowledged=pending.current.indexOf(persistedKey);
   if(acknowledged>=0){pending.current.splice(0,acknowledged+1);if(pending.current.length)return;}
   else pending.current=[];
   setLocal(JSON.parse(persistedKey));
 },[persistedKey]);
 const value=local;
 const [theme,setTheme]=useState<CSSProperties>();
 const [error,setError]=useState('');
 const save=(next:EditorChecklistValue)=>{const result=editorChecklistSchema.safeParse(next);if(!result.success){setError(result.error.issues[0]?.message||'Check the task details.');return;}setError('');setLocal(result.data);if(editable){pending.current.push(JSON.stringify(result.data));editing.onEdit?.({type:'widget',id,value:{...edit,kind:'tasks',original,value:result.data}});}};
 const onPanelChange=useCallback((open:boolean)=>host.panelChanged(id,open),[host.panelChanged,id]);
 const selected=interaction.selected?.getAttribute('data-workspace-widget')===id;
 const resize=useWorkspaceWidgetWidth({label:'Tasks width',width:edit?.width,selected,enabled:editable&&!edit?.hidden&&editing.design?.layout!=='document',onChange:width=>editing.onEdit?.({type:'widget',id,value:{...edit,kind:'tasks',original,value,width}})});
 useLayoutEffect(()=>{
   if(!editing.ramp || !resize.ref.current){setTheme(undefined);return;}
   const style=getComputedStyle(resize.ref.current);
   const token=(name:string,fallback:string)=>style.getPropertyValue(name).trim()||fallback;
   setTheme({
     '--ui-font':token('--ramp-font','Arial, sans-serif'),
     '--ui-text':token('--ramp-text','#171714'), '--ui-text-muted':token('--ramp-muted','#6b6b65'),
     '--ui-bg':token('--ramp-surface','#fff'),'--ui-bg-subtle':token('--ramp-soft','#f4f3f0'),'--ui-bg-muted':token('--ramp-soft','#f4f3f0'),
     '--ui-divider':token('--ramp-border','#d9d7d2'),'--ui-border':token('--ramp-border','#d9d7d2'),
     '--ui-accent':token('--ramp-dark','#252521'),'--ui-accent-hover':token('--ramp-text','#171714'),'--ui-accent-active':token('--ramp-dark','#252521'),
     '--workspace-task-lime':token('--ramp-solar','lab(92.1406% -20.4979 84.7726)'),
   } as CSSProperties);
 },[editing.ramp,editing.design?.layout]);
 if(edit?.hidden)return null;
 if(editing.design?.layout==='document')return <section data-workspace-widget={id} data-workspace-widget-label="Tasks"><h3>{value.title}</h3>{value.tasks.map(task=><div key={task.id}><p>{task.complete?'✓ ':''}{task.name}</p>{task.description&&<p>{task.description}</p>}{task.subtasks.map(subtask=><p key={subtask.id}>{subtask.complete?'✓ ':''}{subtask.name}</p>)}</div>)}</section>;
 return <div ref={resize.ref} style={resize.style} className="workspace-inventory-tasks ewb-root" data-workspace-widget={id} data-workspace-widget-label="Tasks" data-workspace-tools="tasks" data-selected={selected||undefined}>
 <EditorChecklist showControls={editable} selectedWidget={selected} showOnHover={interaction.pointer} theme={theme} value={value} onChange={save} panelHost={host.panelHost} active={host.activeId===undefined||host.activeId===id} onPanelChange={onPanelChange} onRemove={editable?()=>{editing.onEdit?.({type:'widget',id,value:{...edit,kind:'tasks',original,value,hidden:true}});interaction.clear();}:undefined}/>{resize.handle}{error&&<p role="alert">{error}</p>}
 </div>;
}

WorkspaceTasks.workspaceWidget = true;
