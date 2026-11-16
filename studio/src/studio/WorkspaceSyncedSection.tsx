import { useContext } from 'react';
import { useWorkspaceInteraction } from './WorkspaceInteraction';
import { EditorSyncedSection } from '../components/editor-widgets/EditorSyncedSection';
import { WorkspaceEditingContext } from './WorkspaceAssets';
import { useWorkspaceWidgetHost } from './WorkspaceWidgetHost';
import { useWorkspaceWidgetWidth } from './WorkspaceWidgetWidth';
import type { SyncedSectionValue } from './workspaceSyncedSchema';
import { RAMP_SOURCE_ID, RAMP_SYNCED_CONTENT } from './workspaceSyncedSchema';
export function WorkspaceSyncedSection({id,sourceId=RAMP_SOURCE_ID}:{id:string;sourceId?:string}) {
 const editing=useContext(WorkspaceEditingContext),host=useWorkspaceWidgetHost(),interaction=useWorkspaceInteraction();
 const stored=editing.widgets?.[id],source=editing.widgets?.[sourceId];
 const value:SyncedSectionValue=stored&&'kind' in stored&&stored.kind==='synced-section'?stored:{kind:'synced-section' as const,sourceId,linked:true,...RAMP_SYNCED_CONTENT};
 const published=source&&'kind' in source&&source.kind==='synced-source'?source:{...RAMP_SYNCED_CONTENT,version:1};
 const selected=interaction.selected?.getAttribute('data-workspace-widget')===id;
 const resize=useWorkspaceWidgetWidth({label:'Synced section width',width:value.width,selected,enabled:!!editing.onEdit&&!value.hidden&&editing.design?.layout!=='document',onChange:width=>editing.onEdit?.({type:'widget',id,value:{...value,width}})});
 if(value.hidden)return null;
 return <div ref={resize.ref} style={resize.style} className="workspace-synced-section" data-selected={selected||undefined} data-linked={value.linked} data-workspace-widget={id} data-workspace-widget-label="Synced section" data-workspace-tools="synced-section"><EditorSyncedSection value={value} source={{title:published.title,body:published.body}} editable={!!editing.onEdit} contextual={editing.design?.layout!=='document'} selected={selected} onChange={next=>editing.onEdit?.({type:'widget',id,value:next})} onPublish={next=>editing.onEdit?.({type:'widget',id:sourceId,value:{kind:'synced-source',...next,version:published.version+1}})} onRemove={()=>editing.onEdit?.({type:'widget',id,value:{...value,hidden:true}})} panelHost={host.panelHost} onPanelChange={open=>host.panelChanged(id,open)}/>{resize.handle}</div>;
}
WorkspaceSyncedSection.workspaceWidget = true;
