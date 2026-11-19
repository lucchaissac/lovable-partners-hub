import { Dropdown, Switch, TriggerField } from '@asset/ui';
import { StudioShapeNumber } from '../studio/PresentationElementDesign';
import { newShaderEffect, shaderPresets, type ShaderEffect } from './settings';
import './shaders.css';

/** Deliberately uses the existing inspector row, dropdown and number controls. */
export function EffectControl({value,onChange,disabled=false}: {value?:ShaderEffect;onChange:(value:ShaderEffect|undefined)=>void;disabled?:boolean}) {
  if (!import.meta.env.DEV) return null;
  const update = (patch:Partial<ShaderEffect>) => { if(value) onChange({...value,...patch}); };
  return <fieldset className="hcs-design-design-fields" disabled={disabled}>
    <div className="hcs-design-design-row"><span>Effect</span><Dropdown value={value?.preset??'none'} align="end" fitViewport items={shaderPresets.map(item=>({...item,leadingIcon:item.id==='none'?undefined:<span className="shader-swatch" data-effect={item.id} aria-hidden="true">a</span>}))} onChange={preset=>{if(!disabled)onChange(preset==='none'?undefined:newShaderEffect(preset as ShaderEffect['preset']));}} trigger={<TriggerField disabled={disabled} aria-label="Effect">{shaderPresets.find(item=>item.id===value?.preset)?.label??'None'}</TriggerField>}/></div>
    {value&&<><div className="hcs-design-design-row"><span>Intensity</span><StudioShapeNumber label="Effect intensity" value={value.intensity} min={0} max={100} suffix="%" onChange={(intensity:number)=>update({intensity})}/></div>
    <div className="hcs-design-design-row"><span>Animated</span><Switch size="sm" aria-label="Animated effect" checked={value.animated} disabled={disabled} onChange={animated=>update({animated})}/></div>
    {value.animated&&<div className="hcs-design-design-row"><span>Speed</span><StudioShapeNumber label="Effect speed" value={value.speed} min={0} max={200} suffix="%" onChange={(speed:number)=>update({speed})}/></div>}</>}
  </fieldset>;
}
