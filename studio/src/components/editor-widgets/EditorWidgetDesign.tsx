import {useContext,type ReactNode} from 'react';
import {Button,Dropdown,Icon,Input,Switch,Tooltip,TriggerField} from '@asset/ui';
import {EditorWidgetToolbarContext} from './EditorWidgetToolbar';
import {StudioShapeColor,StudioShapeNumber} from '../../studio/PresentationElementDesign';
import type {CellStyle} from './libraryTableModels';

export const usePresentationWidgetDesign=()=>!!useContext(EditorWidgetToolbarContext);
export function WidgetAdvancedDesign(){return useContext(EditorWidgetToolbarContext)?.advancedDesign??null;}
export function WidgetDesignColor(props:{label:string;value:string;onChange:(v:string)=>void}){const context=useContext(EditorWidgetToolbarContext);return <StudioShapeColor {...props} disabled={context?.disabled||false}/>;}
export function WidgetDesignNumber({step=1,suffix='px',...props}:{label:string;value:number;min?:number;max?:number;step?:number;suffix?:string;onChange:(v:number)=>void}){
 if(step===1)return <StudioShapeNumber {...props} suffix={suffix}/>;
 return <Input className="hcs-design-design-number" type="number" aria-label={props.label} value={props.value} min={props.min} max={props.max} step={step} trailingIcon={<span>{suffix}</span>} onChange={e=>{if(e.target.value!==''&&Number.isFinite(Number(e.target.value)))props.onChange(Math.max(props.min??0,Math.min(props.max??100,Number(e.target.value))));}}/>;
}
export function WidgetDesignRow({label,children,section=false}:{label:string;children:ReactNode;section?:boolean}){return <div className={`hcs-design-design-row${section?' hcs-design-design-section':''}`}><span>{label}</span><div className="hcs-widget-design-controls">{children}</div></div>;}
export function WidgetDesignPanel({title,icon,onClose,closeLabel,children,onReset}:{title:string;icon:string;onClose:()=>void;closeLabel:string;children:ReactNode;onReset?:()=>void}){
 const context=useContext(EditorWidgetToolbarContext);
 return <aside className="hcs-design-design-panel" aria-label={`${title} Design`}><header className="we-panel-header"><span className="hcs-design-design-title"><Icon name={icon} size={16}/><strong>{title}</strong></span><Tooltip label={closeLabel}><Button variant="ghost" size="sm" aria-label={closeLabel} leadingIcon={<Icon name="panel-right" size={16}/>} onClick={onClose}/></Tooltip></header><div className="hcs-design-design-body"><fieldset className="hcs-design-design-fields" disabled={context?.disabled}>{children}<WidgetAdvancedDesign/></fieldset></div>{onReset&&<footer className="hcs-design-design-footer"><Button variant="neutral" disabled={context?.disabled} onClick={onReset}>Reset style</Button></footer>}</aside>;
}
type TextStyle={color:string;size:number;weight:number;italic?:boolean;underline?:boolean;spacing?:number;line?:number;uppercase?:boolean;align?:'left'|'center'|'right';vertical?:'top'|'middle'|'bottom'};
export function WidgetTextDesign({value,onChange,prefix='Text',maxSize=96}:{value:TextStyle;onChange:(v:Partial<TextStyle>)=>void;prefix?:string;maxSize?:number}){
 return <>
  <WidgetDesignRow label="Color"><WidgetDesignColor label={`${prefix} color`} value={value.color} onChange={(color:string)=>onChange({color})}/></WidgetDesignRow>
  <WidgetDesignRow label="Size"><WidgetDesignNumber label={`${prefix} font size`} min={8} max={maxSize} value={value.size} onChange={size=>onChange({size})}/></WidgetDesignRow>
  <WidgetDesignRow label="Weight"><Dropdown value={String(value.weight)} items={[{id:'400',label:'Regular'},{id:'500',label:'Medium'},{id:'600',label:'Bold'}]} onChange={weight=>onChange({weight:Number(weight)})} trigger={<TriggerField aria-label={`${prefix} font weight`}>{value.weight>=600?'Bold':value.weight>=500?'Medium':'Regular'}</TriggerField>}/></WidgetDesignRow>
  {value.italic!==undefined&&<WidgetDesignRow label="Style"><div className="hcs-design-text-buttons">{(['bold','italic','underline'] as const).map(mark=><Tooltip key={mark} label={mark[0].toUpperCase()+mark.slice(1)}><Button variant="neutral" active={mark==='bold'?value.weight>=600:!!value[mark]} aria-label={`${prefix} ${mark}`} leadingIcon={<Icon name={mark} size={16}/>} onClick={()=>onChange(mark==='bold'?{weight:value.weight>=600?400:600}:{[mark]:!value[mark]})}/></Tooltip>)}</div></WidgetDesignRow>}
  {value.align!==undefined&&<WidgetDesignRow label="Alignment"><div className="hcs-design-text-buttons">{(['left','center','right'] as const).map(align=><Tooltip key={align} label={`Align ${align}`}><Button variant="neutral" active={value.align===align} aria-label={`Align ${align}`} leadingIcon={<Icon name={`align-${align}`} size={16}/>} onClick={()=>onChange({align})}/></Tooltip>)}</div></WidgetDesignRow>}
  {value.vertical!==undefined&&<WidgetDesignRow label="Vertical alignment"><div className="hcs-design-text-buttons">{(['top','middle','bottom'] as const).map((vertical,i)=><Tooltip key={vertical} label={`Align ${vertical==='middle'?'center':vertical}`}><Button variant="neutral" active={value.vertical===vertical} aria-label={`Align cell ${vertical}`} leadingIcon={<Icon name={['align-start-horizontal','align-center-horizontal','align-end-horizontal'][i]} size={16}/>} onClick={()=>onChange({vertical})}/></Tooltip>)}</div></WidgetDesignRow>}
  {value.spacing!==undefined&&<WidgetDesignRow label="Letter spacing"><WidgetDesignNumber label={`${prefix} letter spacing`} value={value.spacing} min={-2} max={10} step={.1} onChange={spacing=>onChange({spacing})}/></WidgetDesignRow>}
  {value.line!==undefined&&<WidgetDesignRow label="Line height"><WidgetDesignNumber label={`${prefix} line height`} value={Math.round(value.line*100)} min={80} max={300} suffix="%" onChange={line=>onChange({line:line/100})}/></WidgetDesignRow>}
 </>;
}
export function WidgetCellDesign({label,value,onChange,onClose,onReset}:{label:string;value:CellStyle;onChange:(value:Partial<CellStyle>)=>void;onClose:()=>void;onReset:()=>void}){
 return <WidgetDesignPanel title={label.replace(' - ',' ')} icon="table" closeLabel="Close cell design" onClose={onClose} onReset={onReset}><WidgetDesignRow label="Background"><WidgetDesignColor label="Cell background" value={value.background} onChange={(background:string)=>onChange({background})}/></WidgetDesignRow><WidgetTextDesign prefix="Cell" value={value} onChange={onChange}/></WidgetDesignPanel>;
}
