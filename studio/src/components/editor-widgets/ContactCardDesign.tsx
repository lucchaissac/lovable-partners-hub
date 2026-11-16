import {StudioCornerControls} from '../../studio/PresentationElementDesign';
import type {CornerRadii} from '../../studio/htmlCornerRadius';
import {usePresentationWidgetDesign,WidgetDesignColor,WidgetDesignNumber,WidgetTextDesign} from './EditorWidgetDesign';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { Button, ColorPicker, ColorSwatch, Dropdown, Icon, Input, Switch, TriggerField } from '@asset/ui';

export type ContactTextStyle = { size: number; weight: number; color: string; italic: boolean; underline: boolean; spacing: number; line: number; uppercase: boolean };
export type ContactCardStyle = CornerRadii & { background: string; radius: number; border: number; borderColor: string; shadow: 'none'|'soft'|'strong'|'retro'; name: ContactTextStyle; title: ContactTextStyle; button: CornerRadii & { background: string; radius: number; size: number; weight: number } };
export const DEFAULT_CONTACT_STYLE: ContactCardStyle = {
  background: 'var(--ui-bg)', radius: 16, border: 1, borderColor: 'var(--ui-divider)', shadow: 'none',
  name: { size: 20, weight: 600, color: 'var(--ui-text)', italic: false, underline: false, spacing: 0, line: 1.2, uppercase: false },
  title: { size: 16, weight: 400, color: 'var(--ui-text-muted)', italic: false, underline: false, spacing: 0, line: 1.5, uppercase: false },
  button: { background: 'var(--ui-accent)', radius: 100, size: 14, weight: 500 },
};
export const CONTACT_SHADOWS = { none: 'none', soft: 'var(--ui-shadow-sm)', strong: 'var(--ui-shadow-md)', retro: '4px 4px 0 var(--ui-border)' };
export const contactTextCSS = (style: ContactTextStyle): CSSProperties => ({ fontSize: style.size, fontWeight: style.weight, color: style.color, fontStyle: style.italic ? 'italic' : 'normal', textDecoration: style.underline ? 'underline' : 'none', letterSpacing: style.spacing, lineHeight: style.line, textTransform: 'none' });
export function ContactSetting({ label, children }: { label: string; children: ReactNode }) { const presentation=usePresentationWidgetDesign();return <div className={presentation?"hcs-design-design-row":"ewb-setting"}><span>{label}</span><div className="ewb-setting-controls">{children}</div></div>; }
export function ContactSelect({ label, value, options, onChange }: { label: string; value: string; options: { id: string; label: string }[]; onChange: (value: string) => void }) {
  const presentation=usePresentationWidgetDesign();
  return <Dropdown value={value} items={options} onChange={onChange} listHeight="auto" align="end" trigger={<TriggerField size={presentation?undefined:"sm"} aria-label={label}>{options.find(option => option.id === value)?.label}</TriggerField>} />;
}
export function NumberField({ label, value, onChange, min = 0, max = 100, step = 1, suffix }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  const presentation=usePresentationWidgetDesign();if(presentation)return <WidgetDesignNumber label={label} value={value} min={min} max={max} step={step} suffix={suffix} onChange={onChange}/>;
  return <Input inputSize="sm" className="ewb-number-field" aria-label={label} type="number" value={value} min={min} max={max} step={step} trailingIcon={suffix ? <span>{suffix}</span> : undefined} onChange={event => { if (event.target.value !== '') onChange(Math.max(min, Math.min(max, Number(event.target.value)))); }} />;
}
export function ContactColor({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  const [colors, setColors] = useState<string[]>([]);const presentation=usePresentationWidgetDesign();
  if(presentation)return <WidgetDesignColor label={label} value={value} onChange={onChange}/>;
  return <ColorPicker value={value} align="end" onChange={onChange} customColors={colors} onAddCustomColor={color => setColors(current => [...current, color])} onUpdateCustomColor={(index, color) => setColors(current => current.map((item, i) => i === index ? color : item))} trigger={<ColorSwatch color={value} aria-label={label} />} />;
}

/** Same setting groups and dropdown choices as the captured Card Design sidebar. */
export function ContactCardDesign({ size, onSizeChange, value, onChange }: { size: 'big'|'small'; onSizeChange: (size: 'big'|'small') => void; value: ContactCardStyle; onChange: (value: ContactCardStyle) => void }) {
  const presentation=usePresentationWidgetDesign();
  const [target, setTarget] = useState<'name'|'title'>('name');
  const [more, setMore] = useState(false); const [buttonOpen, setButtonOpen] = useState(false);
  const font = value[target];
  const change = <K extends keyof ContactCardStyle>(key: K, next: ContactCardStyle[K]) => onChange({ ...value, [key]: next });
  const changeFont = (next: Partial<ContactTextStyle>) => change(target, { ...font, ...next });
  const weights = [{id:'400',label:'Regular'},{id:'500',label:'Medium'},{id:'600',label:'Bold'}];
  if(presentation)return <>
    <ContactSetting label="Card type"><ContactSelect label="Card Type" value={size} options={[{id:'big',label:'Big'},{id:'small',label:'Small'}]} onChange={size=>onSizeChange(size as 'big'|'small')}/></ContactSetting>
    <ContactSetting label="Background"><ContactColor label="Card background" value={value.background} onChange={background=>change('background',background)}/></ContactSetting>
    <StudioCornerControls label="Card" value={value} max={100} onChange={(patch:CornerRadii)=>onChange({...value,...patch})}/>
    <ContactSetting label="Border"><NumberField label="Card border width" max={10} value={value.border} onChange={border=>change('border',border)}/><ContactColor label="Card border color" value={value.borderColor} onChange={borderColor=>change('borderColor',borderColor)}/></ContactSetting>
    <ContactSetting label="Shadow"><ContactSelect label="Card shadow" value={value.shadow} options={['none','soft','strong','retro'].map(id=>({id,label:id[0].toUpperCase()+id.slice(1)}))} onChange={shadow=>change('shadow',shadow as ContactCardStyle['shadow'])}/></ContactSetting>
    <ContactSetting label="Text"><ContactSelect label="Font target" value={target} options={[{id:'name',label:'Name'},{id:'title',label:'Title'}]} onChange={target=>setTarget(target as 'name'|'title')}/></ContactSetting>
    <WidgetTextDesign prefix={target} value={font} onChange={changeFont}/>
    <Button variant="ghost" className="ewb-disclosure" aria-expanded={buttonOpen} trailingIcon={<Icon name={buttonOpen?'chevron-up':'chevron-down'} size={14}/>} onClick={()=>setButtonOpen(!buttonOpen)}>Button design</Button>
    {buttonOpen&&<><ContactSetting label="Background"><ContactColor label="Button background" value={value.button.background} onChange={background=>change('button',{...value.button,background})}/></ContactSetting><StudioCornerControls label="Button" value={value.button} max={100} onChange={(patch:CornerRadii)=>change('button',{...value.button,...patch})}/><ContactSetting label="Size"><NumberField label="Button font size" value={value.button.size} min={8} max={32} onChange={size=>change('button',{...value.button,size})}/></ContactSetting><ContactSetting label="Weight"><ContactSelect label="Button font weight" value={String(value.button.weight)} options={weights} onChange={weight=>change('button',{...value.button,weight:Number(weight)})}/></ContactSetting></>}
  </>;
  return <>
    <ContactSetting label="Card Type"><ContactSelect label="Card Type" value={size} options={[{id:'big',label:'Big'},{id:'small',label:'Small'}]} onChange={size => onSizeChange(size as 'big'|'small')} /></ContactSetting>
    <ContactSetting label="Background"><ContactColor label="Card background" value={value.background} onChange={color => change('background',color)} /></ContactSetting>
    <ContactSetting label="Rounded corners"><NumberField label="Card rounded corners" value={value.radius} suffix="%" onChange={number => change('radius',number)} /></ContactSetting>
    <ContactSetting label="Border"><NumberField label="Card border width" max={10} value={value.border} onChange={number => change('border',number)} /><ContactColor label="Card border color" value={value.borderColor} onChange={color => change('borderColor',color)} /></ContactSetting>
    <div className="ewb-setting-group"><span>Shadow</span><div className="ewb-shadow-options">{(['none','soft','strong','retro'] as const).map(shadow => <button key={shadow} type="button" aria-label={`${shadow} shadow`} aria-pressed={value.shadow === shadow} onClick={() => change('shadow',shadow)}><span className="ewb-shadow-sample" data-shadow={shadow} /><span>{shadow[0].toUpperCase()+shadow.slice(1)}</span></button>)}</div></div>
    <div className="ewb-setting-group"><span>Font</span><ContactSelect label="Font target" value={target} options={[{id:'name',label:'Name'},{id:'title',label:'Title'}]} onChange={target => setTarget(target as 'name'|'title')} /><div className="ewb-font-row"><ContactColor label={`${target} color`} value={font.color} onChange={color => changeFont({color})} /><NumberField label={`${target} font size`} min={8} max={96} value={font.size} onChange={size => changeFont({size})} /><ContactSelect label={`${target} font weight`} value={String(font.weight)} options={weights} onChange={weight => changeFont({weight:Number(weight)})} /></div></div>
    <Button variant="ghost" className="ewb-disclosure" aria-expanded={more} trailingIcon={<Icon name={more ? 'chevron-up' : 'chevron-down'} size={14} />} onClick={() => setMore(!more)}>More text options</Button>
    {more && <>
      <ContactSetting label="Decoration"><div className="ewb-setting-controls">{(['bold','italic','underline'] as const).map(mark => <Button key={mark} size="sm" variant="neutral" aria-label={`${target} ${mark}`} active={mark === 'bold' ? font.weight >= 600 : font[mark]} leadingIcon={<Icon name={mark} size={14} />} onClick={() => changeFont(mark === 'bold' ? {weight:font.weight >= 600 ? 400 : 600} : {[mark]: !font[mark]})} />)}</div></ContactSetting>
      <ContactSetting label="Letter spacing"><NumberField label={`${target} letter spacing`} min={-2} max={10} step={0.1} value={font.spacing} onChange={spacing => changeFont({spacing})} /></ContactSetting>
      <ContactSetting label="Line spacing"><NumberField label={`${target} line spacing`} min={0.8} max={3} step={0.1} value={font.line} onChange={line => changeFont({line})} /></ContactSetting>
    </>}
    <Button variant="ghost" className="ewb-disclosure ewb-panel-separator" aria-expanded={buttonOpen} trailingIcon={<Icon name={buttonOpen ? 'chevron-up' : 'chevron-down'} size={14} />} onClick={() => setButtonOpen(!buttonOpen)}>Button Design</Button>
    {buttonOpen && <>
      <ContactSetting label="Background"><ContactColor label="Button background" value={value.button.background} onChange={background => change('button',{...value.button,background})} /></ContactSetting>
      <ContactSetting label="Rounded corners"><NumberField label="Button rounded corners" value={value.button.radius} suffix="%" onChange={radius => change('button',{...value.button,radius})} /></ContactSetting>
      <ContactSetting label="Font size"><NumberField label="Button font size" min={8} max={32} value={value.button.size} onChange={size => change('button',{...value.button,size})} /></ContactSetting>
      <ContactSetting label="Font weight"><ContactSelect label="Button font weight" value={String(value.button.weight)} options={weights} onChange={weight => change('button',{...value.button,weight:Number(weight)})} /></ContactSetting>
    </>}
  </>;
}
