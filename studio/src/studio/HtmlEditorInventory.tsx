import { useCallback } from 'react';
import { EditorProjectPlan, EditorTimeline, EditorSalesQuote, EditorLibraryList, EditorTable, EditorForm, SAMPLE_PROJECT, SAMPLE_TIMELINE, SAMPLE_QUOTE, SAMPLE_LIBRARY, SAMPLE_TABLE, SAMPLE_FORM } from '../components/editor-widgets';
import { useWorkspaceWidgetHost } from './WorkspaceWidgetHost';
import type { HtmlInventory } from './htmlInventorySchema';
export const inventoryDefaults: Record<HtmlInventory['type'],HtmlInventory> = {
 'Project plan':{type:'Project plan',value:SAMPLE_PROJECT},'Timeline':{type:'Timeline',value:SAMPLE_TIMELINE},
 'Sales quote':{type:'Sales quote',value:SAMPLE_QUOTE},'Library list':{type:'Library list',value:SAMPLE_LIBRARY},
 'Table':{type:'Table',value:SAMPLE_TABLE},'Forms':{type:'Forms',value:SAMPLE_FORM},
};
export function HtmlEditorInventory({id,content,onChange}:{id:string;content:HtmlInventory;onChange:(value:HtmlInventory)=>void}) {
 const host=useWorkspaceWidgetHost();
 const panelChanged=useCallback((open:boolean)=>host.panelChanged(id,open),[host.panelChanged,id]);
 const panel={panelHost:host.panelHost,active:host.activeId===id,onPanelChange:panelChanged};
 return <div className="ewb-root hev-inventory" data-inventory={content.type}>
  {content.type==='Project plan'&&<EditorProjectPlan {...panel} value={content.value} onChange={value=>onChange({type:content.type,value})}/>}
  {content.type==='Timeline'&&<EditorTimeline value={content.value} onChange={value=>onChange({type:content.type,value})}/>}
  {content.type==='Sales quote'&&<EditorSalesQuote value={content.value} onChange={value=>onChange({type:content.type,value})}/>}
  {content.type==='Library list'&&<EditorLibraryList {...panel} value={content.value} onChange={value=>onChange({type:content.type,value})}/>}
  {content.type==='Table'&&<EditorTable {...panel} value={content.value} onChange={value=>onChange({type:content.type,value})}/>}
  {content.type==='Forms'&&<EditorForm value={content.value} onChange={value=>onChange({type:content.type,value})}/>}
 </div>;
}
