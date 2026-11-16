import {usePresentationWidgetDesign,WidgetDesignPanel,WidgetDesignRow,WidgetDesignColor,WidgetTextDesign} from './EditorWidgetDesign';
import { Button, Icon } from '@asset/ui';
import { ContactColor, ContactSelect, ContactSetting, NumberField } from './ContactCardDesign';
import type { EditorChecklistDesignValue } from '../../studio/workspaceTaskTypes';

export const DEFAULT_CHECKLIST_DESIGN:EditorChecklistDesignValue={background:'transparent',accent:'var(--ui-accent)',color:'var(--ui-text)',size:16,weight:400};
/** Inspected on staging: Mutual Plan Design, shared by Checklist and Kanban. */
export function EditorChecklistDesign({value,onChange,onClose,onReset,label='Checklist'}:{label?:string;value:EditorChecklistDesignValue;onChange:(value:EditorChecklistDesignValue)=>void;onClose:()=>void;onReset:()=>void}){
 const presentation=usePresentationWidgetDesign();
 if(presentation)return <WidgetDesignPanel title={label} icon={label==='Kanban'?'columns-3':'list-checks'} closeLabel="Close checklist design" onClose={onClose} onReset={onReset}><WidgetDesignRow label="Background"><WidgetDesignColor label="Checklist background" value={value.background} onChange={(background:string)=>onChange({...value,background})}/></WidgetDesignRow><WidgetDesignRow label="Accent color"><WidgetDesignColor label="Task accent color" value={value.accent} onChange={(accent:string)=>onChange({...value,accent})}/></WidgetDesignRow><WidgetTextDesign prefix="Task" maxSize={32} value={value} onChange={patch=>onChange({...value,...patch})}/></WidgetDesignPanel>;
 return <aside className="ewb-settings-panel ewt-design-panel" aria-label="Mutual Plan Design">
  <header><strong>Mutual Plan Design</strong><Button variant="ghost" size="sm" aria-label="Close checklist design" leadingIcon={<Icon name="panel-right" size={16}/>} onClick={onClose}/></header>
  <div className="ewb-settings-body"><span className="ewt-design-label">Layout</span><strong>Widget design</strong>
   <ContactSetting label="Background"><ContactColor label="Checklist background" value={value.background} onChange={background=>onChange({...value,background})}/></ContactSetting>
   <div className="ewt-design-group"><strong>Task design</strong><ContactSetting label="Accent color"><ContactColor label="Task accent color" value={value.accent} onChange={accent=>onChange({...value,accent})}/></ContactSetting></div>
   <div className="ewt-design-group"><span>Font</span><div className="ewb-font-row"><ContactColor label="Task font color" value={value.color} onChange={color=>onChange({...value,color})}/><NumberField label="Task font size" min={8} max={32} value={value.size} onChange={size=>onChange({...value,size})}/><ContactSelect label="Task font weight" value={String(value.weight)} options={[{id:'400',label:'Regular'},{id:'500',label:'Medium'},{id:'600',label:'Bold'}]} onChange={weight=>onChange({...value,weight:Number(weight)})}/></div></div>
   <Button variant="neutral" onClick={onReset}>Reset to defaults</Button>
  </div>
 </aside>;
}
