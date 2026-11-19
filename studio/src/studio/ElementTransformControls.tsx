import {EffectControl} from '../shaders/EffectControl';
import {createContext,useContext} from 'react';
import {Button,Dropdown,Icon,TriggerField} from '@asset/ui';
import {StudioShapeNumber} from './PresentationElementDesign';
import type {ElementFrame} from './htmlSelectionOperations';
import type {ElementAppearance} from './htmlElementAppearance';
import {blendModeItems} from '../../../shared/blendModes.mjs';

export const ElementTransformContext=createContext<{frame:ElementFrame;locked:boolean;onChange:(patch:Partial<ElementFrame>)=>void}|null>(null);
export const ElementBlendPreviewContext=createContext<((mode:ElementAppearance['blendMode'])=>void)|undefined>(undefined);
export function ElementBlendControl({value={},onChange,mixed=false,disabled=false}:{value?:ElementAppearance;onChange:(patch:ElementAppearance)=>void;mixed?:boolean;disabled?:boolean}){
 const preview=useContext(ElementBlendPreviewContext);
 return <div className="hcs-design-design-row"><span>Blend mode</span><Dropdown value={mixed?undefined:value.blendMode??'normal'} items={blendModeItems} fitViewport onPreview={disabled?undefined:mode=>preview?.(mode as ElementAppearance['blendMode'])} onChange={blendMode=>{if(!disabled)onChange({blendMode:blendMode as ElementAppearance['blendMode']});}} trigger={<TriggerField disabled={disabled} aria-label="Blend mode">{mixed?'Mixed':blendModeItems.find(item=>item.id===value.blendMode)?.label??'Normal'}</TriggerField>}/></div>;
}
export function ElementBlurControl({value={},onChange,mixed=false,disabled=false}:{value?:ElementAppearance;onChange:(patch:ElementAppearance)=>void;mixed?:boolean;disabled?:boolean}){
 return <fieldset disabled={disabled} className="hcs-design-design-fields"><div className="hcs-design-design-row"><span>Blur</span><StudioShapeNumber label="Element blur" value={value.blur??0} mixed={mixed} min={0} max={100} suffix="px" onChange={(blur:number)=>onChange({blur})}/></div></fieldset>;
}
export function ElementTransformSection(){
 const context=useContext(ElementTransformContext);if(!context)return null;
 const {frame,locked,onChange}=context,perspective=frame.perspective??800;
 return <details className="hcs-design-advanced"><summary><span>Transform</span><Icon name="chevron-down" size={16}/></summary><fieldset className="hcs-design-design-fields hcs-design-advanced-body" disabled={locked}>
  {([['rotationX','Rotate X'],['rotationY','Rotate Y'],['rotation','Rotate Z']] as const).map(([key,label])=><div className="hcs-design-design-row" key={key}><span>{label}</span><StudioShapeNumber label={label} value={frame[key]??0} min={-360} max={360} suffix="°" onChange={(value:number)=>onChange({[key]:value})}/></div>)}
  <div className="hcs-design-design-row"><span>Depth</span><StudioShapeNumber label="Transform depth" value={frame.depth??0} min={-2000} max={Math.min(2000,Math.floor(perspective*.9))} onChange={(depth:number)=>onChange({depth})}/></div>
  <div className="hcs-design-design-row"><span>Perspective</span><StudioShapeNumber label="Perspective" value={perspective} min={100} max={5000} onChange={(perspective:number)=>onChange({perspective,...((frame.depth??0)>perspective*.9?{depth:perspective*.9}:{})})}/></div>
  <Button variant="ghost" size="sm" disabled={locked||!(frame.rotationX||frame.rotationY||frame.rotation||frame.depth||frame.perspective)} onClick={()=>onChange({rotationX:undefined,rotationY:undefined,rotation:0,depth:undefined,perspective:undefined})}>Reset transform</Button>
 </fieldset></details>;
}
export function NativeElementEffects(){
 const context=useContext(ElementTransformContext);if(!context)return null;
 const onChange=(appearance:ElementAppearance)=>context.onChange({appearance:{...context.frame.appearance,...appearance}});
 return <div className="hcs-design-design-fields hcs-design-design-section"><ElementBlendControl value={context.frame.appearance} disabled={context.locked} onChange={onChange}/><ElementBlurControl value={context.frame.appearance} disabled={context.locked} onChange={onChange}/><EffectControl value={context.frame.appearance?.shader} disabled={context.locked} onChange={shader=>onChange({shader})}/><ElementTransformSection/></div>;
}
