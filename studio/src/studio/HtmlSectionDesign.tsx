import { DesignPanelHeader } from './DesignPanelHeader';
import {useEffect,useState} from 'react';
import {Button,Dropdown,Icon,Tooltip,TriggerField} from '@asset/ui';
import {StudioShapeColor,StudioShapeNumber,StudioPaddingControls,StudioCornerControls} from './PresentationElementDesign';
import type {HtmlSection} from './htmlEditorModel';
export type SectionSpacingPreview = 'padding'|'after'|'gap';
export function HtmlSectionDesign({section,onChange,onClose,onSpacingPreview,fixedCanvas=false}:{section:HtmlSection;fixedCanvas?:boolean;onChange:(patch:Partial<HtmlSection>)=>void;onClose:()=>void;onSpacingPreview?:(kind:SectionSpacingPreview|null)=>void}){
 const [hover,setHover]=useState<SectionSpacingPreview|null>(null),[focus,setFocus]=useState<SectionSpacingPreview|null>(null);
 useEffect(()=>{onSpacingPreview?.(focus??hover);return()=>onSpacingPreview?.(null);},[focus,hover,onSpacingPreview]);
 const preview=(kind:SectionSpacingPreview)=>({onMouseEnter:()=>setHover(kind),onMouseLeave:()=>setHover(null),onFocus:()=>setFocus(kind),onBlur:(event:React.FocusEvent<HTMLDivElement>)=>{if(!event.currentTarget.contains(event.relatedTarget))setFocus(null);}});

 return <aside className="hcs-design-design-panel" aria-label="Section design"><DesignPanelHeader title={section.name} locked={section.locked} closeLabel="Close section design" onClose={onClose}/><div className="hcs-design-design-body"><fieldset disabled={section.locked} className="hcs-design-design-fields">
 <div className="hcs-design-design-row"><span>Background</span><StudioShapeColor label="Section background" value={section.background} disabled={section.locked} onChange={(background:string)=>onChange({background})}/></div>
 <StudioCornerControls key={section.id} label="Section" value={section} max={160} disabled={section.locked} onChange={onChange}/>
 {!fixedCanvas&&<div className="hcs-design-design-row"><span>Shadow</span><Dropdown value={section.shadow??'none'} items={[{id:'none',label:'None'},{id:'subtle',label:'Subtle'},{id:'soft',label:'Soft'},{id:'strong',label:'Strong'}]} onChange={shadow=>onChange({shadow:shadow as HtmlSection['shadow']})} trigger={<TriggerField aria-label="Section shadow">{{none:'None',subtle:'Subtle',soft:'Soft',strong:'Strong'}[section.shadow??'none']}</TriggerField>}/></div>}
 <details className="hcs-design-advanced"><summary><span>Advanced</span><Icon name="chevron-down" size={16}/></summary><div className="hcs-design-advanced-body">
 <div className="hcs-design-design-row hcs-section-width"><span>Width</span><Dropdown value={section.widthPx!==undefined?'fixed':'fluid'} items={[{id:'fixed',label:'Pixels'},{id:'fluid',label:'Percent'}]} onChange={value=>onChange(value==='fluid'?{widthPx:undefined,width:100}:{widthPx:970})} trigger={<TriggerField aria-label="Section width unit">{section.widthPx!==undefined?'px':'%'}</TriggerField>}/><StudioShapeNumber label="Section width" min={section.widthPx!==undefined?160:20} max={section.widthPx!==undefined?4000:100} suffix={section.widthPx!==undefined?'px':'%'} value={section.widthPx??section.width??100} onChange={(width:number)=>onChange(section.widthPx!==undefined?{widthPx:width}:{width})}/></div>
 <div className="hcs-design-design-row hcs-design-design-section"><span>Columns</span><Dropdown value={String(section.columns.length)} items={[{id:'1',label:'One column'},{id:'2',label:'Two columns'},{id:'3',label:'Three columns'}]} onChange={value=>{const n=Number(value),columns=structuredClone(section.columns);if(n<columns.length)columns.splice(n-1,columns.length-n+1,columns.slice(n-1).flat());else while(columns.length<n)columns.push([]);onChange({columns,weights:undefined});}} trigger={<TriggerField aria-label="Section columns">{section.columns.length}</TriggerField>}/></div>
 <div {...preview('padding')}><StudioPaddingControls key={section.id} value={section} label="Section" disabled={section.locked} onChange={onChange}/></div>
 <div className="hcs-design-design-row"><span>Item gap</span><StudioShapeNumber label="Item gap" min={0} max={160} value={section.blockGap??24} onChange={(blockGap:number)=>onChange({blockGap})}/></div>
 <div className="hcs-design-design-row" {...preview('after')}><span>Spacing after</span><StudioShapeNumber label="Section spacing after" min={0} max={400} value={section.spacingAfter??0} onChange={(spacingAfter:number)=>onChange({spacingAfter})}/></div>
 <div className="hcs-design-design-row" {...preview('gap')}><span>Column gap</span><StudioShapeNumber label="Column gap" min={0} max={160} value={section.gap??40} onChange={(gap:number)=>onChange({gap})}/></div>
 <div className="hcs-design-design-row"><span>Alignment</span><div className="hcs-design-text-buttons">{(['start','center','end'] as const).map((verticalAlign,i)=><Tooltip key={verticalAlign} label={['Top','Center','Bottom'][i]}><Button variant="neutral" active={(section.verticalAlign??'start')===verticalAlign} aria-label={`Align columns ${['top','center','bottom'][i]}`} leadingIcon={<Icon name={['align-start-horizontal','align-center-horizontal','align-end-horizontal'][i]} size={16}/>} onClick={()=>onChange({verticalAlign})}/></Tooltip>)}</div></div>
 </div></details>
 </fieldset></div></aside>;
}
