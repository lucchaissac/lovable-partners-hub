import {cornerRadiusStyle,type CornerRadii} from '../../studio/htmlCornerRadius';
import {StudioCornerControls} from '../../studio/PresentationElementDesign';
import {usePresentationWidgetDesign} from './EditorWidgetDesign';
import { useState, type CSSProperties } from 'react';
import { Button, Icon } from '@asset/ui';
import { ContactColor, ContactSetting, NumberField, CONTACT_SHADOWS, type ContactCardStyle } from './ContactCardDesign';

export type EditorSurfaceStyle = CornerRadii & Pick<ContactCardStyle, 'background'|'radius'|'border'|'borderColor'|'shadow'>;
export type EditorSectionStyle = Record<'section'|'block'|'column', EditorSurfaceStyle>;
export const DEFAULT_SECTION_STYLE: EditorSectionStyle = {
  section: { background:'var(--ui-bg)', radius:10, border:0, borderColor:'var(--ui-divider)', shadow:'soft' },
  block: { background:'transparent', radius:0, border:0, borderColor:'var(--ui-divider)', shadow:'none' },
  column: { background:'transparent', radius:0, border:0, borderColor:'var(--ui-divider)', shadow:'none' },
};
export const surfaceCSS = (value: EditorSurfaceStyle): CSSProperties => ({background:value.background,...cornerRadiusStyle(value),border:`${value.border}px solid ${value.borderColor}`,boxShadow:CONTACT_SHADOWS[value.shadow]});

export function EditorSurfaceDesign({value,onChange,label,shadow = true}: {value:EditorSurfaceStyle;onChange:(value:EditorSurfaceStyle)=>void;label:string;shadow?:boolean}) {
  const presentation=usePresentationWidgetDesign();
  return <>
    {presentation?<StudioCornerControls label={label} value={value} max={100} onChange={(patch:CornerRadii)=>onChange({...value,...patch})}/>:<ContactSetting label="Rounded corners"><NumberField label={`${label} rounded corners`} value={value.radius} suffix="%" onChange={radius=>onChange({...value,radius})} /></ContactSetting>}
    <ContactSetting label="Background"><ContactColor label={`${label} background`} value={value.background} onChange={background=>onChange({...value,background})} /></ContactSetting>
    <ContactSetting label="Border"><NumberField label={`${label} border width`} max={10} value={value.border} onChange={border=>onChange({...value,border})} /><ContactColor label={`${label} border color`} value={value.borderColor} onChange={borderColor=>onChange({...value,borderColor})} /></ContactSetting>
    {shadow && <div className="ewb-setting-group"><span>Shadow</span><div className="ewb-shadow-options">{(['none','soft','strong','retro'] as const).map(shadow=><button key={shadow} type="button" aria-label={`${label} ${shadow} shadow`} aria-pressed={value.shadow===shadow} onClick={()=>onChange({...value,shadow})}><span className="ewb-shadow-sample" data-shadow={shadow}/><span>{shadow[0].toUpperCase()+shadow.slice(1)}</span></button>)}</div></div>}
  </>;
}

export function EditorSectionDesign({value,onChange,onClose,onRemove}: {value:EditorSectionStyle;onChange:(value:EditorSectionStyle)=>void;onClose:()=>void;onRemove:()=>void}) {
  const [open,setOpen] = useState<keyof EditorSectionStyle|null>('section');
  return <aside className="ewb-settings-panel" aria-label="Section design">
    <header><strong>Section</strong><Button size="sm" variant="ghost" aria-label="Close section settings" leadingIcon={<Icon name="panel-right" size={16}/>} onClick={onClose}/></header>
    <div className="ewb-settings-body">{(['section','block','column'] as const).map((target,index)=><div key={target} className="ewb-surface-group">
      <Button variant="ghost" className={`ewb-disclosure${index?' ewb-panel-separator':''}`} aria-expanded={open===target} trailingIcon={<Icon name={open===target?'chevron-down':'chevron-right'} size={14}/>} onClick={()=>setOpen(open===target?null:target)}>{target[0].toUpperCase()+target.slice(1)} Design</Button>
      {open===target && <EditorSurfaceDesign label={target} value={value[target]} onChange={next=>onChange({...value,[target]:next})}/>}
    </div>)}</div>
    <footer className="ewb-panel-footer"><Button variant="primary" onClick={()=>onChange(DEFAULT_SECTION_STYLE)}>Reset all changes</Button><Button variant="neutral" className="ewb-remove-contact" leadingIcon={<Icon name="trash-2" size={12}/>} onClick={onRemove}>Remove section</Button></footer>
  </aside>;
}
