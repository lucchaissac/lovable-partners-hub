// @ts-nocheck -- Generated from the approved presentation prototype. Edit its source, then run scripts/sync-design-panel.py.
import * as React from "react";
import * as Asset from "@asset/ui";
import "./presentation-element-design.css";
import {elementBoxStyle,elementBackgroundImage} from "./htmlElementAppearance";
import {cornerRadiusStyle} from './htmlCornerRadius';
import {communityDisplayFonts} from '../../../shared/assetTypography.mjs';
export const CommunityTypographyContext=React.createContext(false);
const STUDIO_SHAPE_TYPES = [{ id: 'rectangle', label: 'Square', name: 'Rectangle', icon: 'square' }, { id: 'circle', label: 'Circle', name: 'Circle', icon: 'circle' }, { id: 'triangle', label: 'Triangle', name: 'Triangle', icon: 'triangle' }];
function studioShapeType(shape) { if (shape.kind === 'line') return { id: 'line', label: 'Line', name: 'Line', icon: 'slash' }; if (shape.kind === 'image') return { id: 'image', label: 'Image', name: 'Image', icon: 'image' }; if (shape.kind === 'text') return { id: 'text', label: 'Text', name: 'Text', icon: 'type' }; return STUDIO_SHAPE_TYPES.find(type => type.id === shape.kind) || STUDIO_SHAPE_TYPES[0]; }
function studioShapeLabel(shape, index) { return shape.name || `${studioShapeType(shape).name} ${index + 1}`; }
const STUDIO_SHAPE_APPEARANCE = { fill: 'var(--ui-border)', radius: 0, borderWidth: 0, borderColor: 'var(--ui-text)', shadow: 'none', opacity: 100 };
const STUDIO_SHAPE_SHADOWS = { none: 'none', soft: 'var(--ui-shadow-sm)', strong: 'var(--ui-shadow-md)' };
const STUDIO_FONTS = [
  { id: 'Camera Plain', label: 'Camera Plain', css: 'var(--ui-font)' },
  { id: 'Arial', label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { id: 'Impact', label: 'Impact', css: 'Impact, "Arial Narrow", sans-serif' },
  { id: 'Georgia', label: 'Georgia', css: 'Georgia, serif' },
  { id: 'Times New Roman', label: 'Times New Roman', css: '"Times New Roman", Times, serif' },
  { id: 'Verdana', label: 'Verdana', css: 'Verdana, sans-serif' },
  { id: 'Courier New', label: 'Courier New', css: '"Courier New", Courier, monospace' }
];
function studioFontFamily(name) { return ([...STUDIO_FONTS,...communityDisplayFonts].find(font => font.id === name) || STUDIO_FONTS[0]).css; }

function studioShapeAppearance(shape) { return { ...STUDIO_SHAPE_APPEARANCE, ...(shape.kind === 'image' ? { imageFit: 'contain' } : {}), ...(shape.kind === 'line' ? { fill: 'var(--ui-text)', lineWidth: 2, lineStyle: 'solid', lineCap: 'butt' } : {}), ...(shape.kind === 'text' ? studioTextAppearance(shape.appearance) : shape.appearance) }; }

export function StudioShapeColor({ label, value, mixed = false, disabled, onChange }) {
  const [colors, setColors] = React.useState([]);
  const swatch = React.useRef(null);
  const [colorName, setColorName] = React.useState(value.startsWith('#') ? value.toLowerCase() : '');
  React.useLayoutEffect(() => {
    if (!swatch.current) return;
    if (value === 'transparent') { setColorName('#00000000'); return; }
    const color = getComputedStyle(swatch.current).backgroundColor;
    const channels = color.match(/[\d.]+/g)?.map(Number);
    if (color.startsWith('rgb') && channels?.length >= 3) {
      const hex = channels.slice(0, 3).map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('');
      const alpha = channels.length > 3 && channels[3] < 1 ? Math.round(channels[3] * 255).toString(16).padStart(2, '0') : '';
      setColorName(('#' + hex + alpha).toLowerCase());
    } else setColorName(value.toLowerCase());
  }, [value]);
  return <Asset.ColorPicker value={value} align="end" onChange={onChange} customColors={colors} onAddCustomColor={color => setColors(current => [...current, color])} onUpdateCustomColor={(index, color) => setColors(current => current.map((item, i) => i === index ? color : item))} trigger={<Asset.TriggerField trailingIcon={false} className="hcs-design-design-color" aria-label={label} disabled={disabled} leadingIcon={<span ref={swatch} className="hcs-design-design-swatch" data-transparent={value === 'transparent' || undefined} style={{ background: value === 'transparent' ? undefined : value }} />}>{mixed ? "Mixed" : colorName}</Asset.TriggerField>} />;
}
function studioInteger(value, fallback = 0, min = 0, max = 1000) {
  const number = Number(value);
  return Math.max(min, Math.min(max, Math.round(Number.isFinite(number) ? number : fallback)));
}
function studioTextAppearance(appearance = {}) {
  const value = { fill: 'var(--ui-text)', fontFamily: 'Camera Plain', fontSize: 32, fontWeight: 400, italic: false, underline: false, uppercase: false, textAlign: 'left', letterSpacing: 0, lineHeight: 120, ...appearance };
  return { ...value, fontSize: studioInteger(value.fontSize, 32, 1, 1000), letterSpacing: studioInteger(value.letterSpacing, 0, -20, 100), lineHeight: studioInteger(value.lineHeight, 120, 50, 300) };
}
export function StudioShapeNumber({ label, value, min = 0, max = 100, suffix = 'px', onChange }) {
  const normalized = studioInteger(value, min, min, max);
  const [draft, setDraft] = React.useState(String(normalized));
  React.useEffect(() => setDraft(String(normalized)), [normalized]);
  function commit(raw) {
    const next = studioInteger(raw.trim() === '' ? min : raw, normalized, min, max);
    setDraft(String(next)); onChange(next);
  }
  return <Asset.Input className="hcs-design-design-number" type="number" min={min} max={max} step={1} aria-label={label} value={draft} trailingIcon={<span>{suffix}</span>} onChange={event => {
    const raw = event.target.value; setDraft(raw);
    if (raw !== '' && Number.isFinite(Number(raw))) onChange(studioInteger(raw, normalized, min, max));
  }} onBlur={() => commit(draft)} onKeyDown={event => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault(); const current = draft.trim() === '' ? normalized : Number(draft);
      commit(String((Number.isFinite(current) ? current : normalized) + (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 10 : 1)));
    } else if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
  }} />;
}
export function StudioPaddingControls({value,onChange,label='Element',disabled=false}) {
  const sides=['Top','Right','Bottom','Left'];
  const values=sides.map(side=>value[`padding${side}`]??value.padding??0);
  const [split,setSplit]=React.useState(()=>new Set(values).size>1);
  React.useEffect(()=>{if(new Set(values).size>1)setSplit(true);},[values.join(',')]);
  const all=padding=>onChange({padding,paddingTop:undefined,paddingRight:undefined,paddingBottom:undefined,paddingLeft:undefined});
  return <div className="hcs-design-padding"><div className="hcs-design-design-row"><span>Padding</span><div className="hcs-design-padding-controls">{!split&&<StudioShapeNumber label={`${label} padding`} min={0} max={160} value={values[0]} onChange={all}/>}<Asset.SegmentedControl size="sm" aria-label={`${label} padding sides`} value={split?'sides':'all'} onChange={mode=>{setSplit(mode==='sides');if(mode==='all')all(values[0]);}} items={[{value:'all',label:'All sides',iconOnly:true,leadingIcon:<Asset.Icon name="square" size={16}/>},{value:'sides',label:'Individual sides',iconOnly:true,leadingIcon:<Asset.Icon name="scan" size={16}/>}]} /></div></div>{split&&<div className="hcs-design-padding-sides">{sides.map((side,i)=><label key={side}><StudioShapeNumber label={`${label} padding ${side.toLowerCase()}`} min={0} max={160} suffix="" value={values[i]} onChange={n=>onChange({[`padding${side}`]:n})}/><span>{side[0]}</span></label>)}</div>}</div>;
}

export function StudioCornerControls({value,onChange,label='Shape',max=160,disabled=false}) {
  const corners=['TopLeft','TopRight','BottomRight','BottomLeft'];
  const names=['top left','top right','bottom right','bottom left'];
  const values=corners.map(corner=>value[`radius${corner}`]??value.radius??0);
  const [split,setSplit]=React.useState(()=>new Set(values).size>1);
  React.useEffect(()=>{if(new Set(values).size>1)setSplit(true);},[values.join(',')]);
  const all=radius=>onChange({radius,radiusTopLeft:undefined,radiusTopRight:undefined,radiusBottomRight:undefined,radiusBottomLeft:undefined});
  return <fieldset disabled={disabled} className="hcs-design-design-fields"><div className="hcs-design-padding"><div className="hcs-design-design-row"><span>Corners</span><div className="hcs-design-padding-controls">{!split&&<StudioShapeNumber label={`${label} corner radius`} min={0} max={max} value={values[0]} onChange={all}/>}<Asset.SegmentedControl size="sm" aria-label={`${label} corners`} value={split?'corners':'all'} onChange={mode=>{setSplit(mode==='corners');if(mode==='all')all(values[0]);}} items={[{value:'all',label:'All corners',iconOnly:true,leadingIcon:<Asset.Icon name="square" size={16}/>},{value:'corners',label:'Individual corners',iconOnly:true,leadingIcon:<Asset.Icon name="scan" size={16}/>}]} /></div></div>{split&&<div className="hcs-design-padding-sides">{corners.map((corner,i)=><label key={corner}><StudioShapeNumber label={`${label} ${names[i]} corner radius`} min={0} max={max} suffix="" value={values[i]} onChange={n=>onChange({[`radius${corner}`]:n})}/><span>{['TL','TR','BR','BL'][i]}</span></label>)}</div>}</div></fieldset>;
}

function StudioTextControls({ value, locked, onChange }) {
  const community=React.useContext(CommunityTypographyContext);
  const fonts=community?communityDisplayFonts:STUDIO_FONTS;
  const weights = [{ id: '400', label: 'Regular' }, { id: '500', label: 'Medium' }, { id: '600', label: 'Semibold' }, { id: '700', label: 'Bold' }];
  return <>
    <div className="hcs-design-design-row hcs-design-design-section"><span>Font</span><Asset.Dropdown fit value={value.fontFamily} align="end" listHeight="auto" items={fonts.map(font => ({ id: font.id, label: <span style={{ fontFamily: font.css }}>{font.label}</span> }))} onChange={fontFamily => onChange({ fontFamily,...(fontFamily==='Anton'?{fontWeight:400}:value.fontFamily==='Anton'?{fontWeight:700}:{}) })} trigger={<Asset.TriggerField disabled={locked} aria-label="Font family"><span className="studio-font-label">{value.fontFamily}</span></Asset.TriggerField>} /></div>
    <div className="hcs-design-design-row"><span>Size</span><StudioShapeNumber label="Text size" min={1} max={1000} value={value.fontSize} onChange={fontSize => onChange({ fontSize })} /></div>
    <div className="hcs-design-design-row"><span>Weight</span><Asset.Dropdown fit value={String(value.fontWeight)} align="end" listHeight="auto" items={weights} onChange={fontWeight => onChange({ fontWeight: Number(fontWeight) })} trigger={<Asset.TriggerField disabled={locked} aria-label="Text weight">{weights.find(item => item.id === String(value.fontWeight))?.label || 'Regular'}</Asset.TriggerField>} /></div>
    <div className="hcs-design-design-row"><span>Style</span><div className="hcs-design-text-buttons" role="group" aria-label="Text style">{['bold', 'italic', 'underline'].map(mark => {
      const active = mark === 'bold' ? value.fontWeight >= 700 : value[mark];
      const label = mark[0].toUpperCase() + mark.slice(1);
      return <Asset.Tooltip key={mark} label={label} side="bottom"><Asset.Button variant="neutral" aria-label={label} aria-pressed={active} active={active} disabled={locked} leadingIcon={<Asset.Icon name={mark} size={16} />} onClick={() => onChange(mark === 'bold' ? { fontWeight: active ? 400 : 700 } : { [mark]: !active })} /></Asset.Tooltip>;
    })}</div></div>
    <div className="hcs-design-design-row"><span>Alignment</span><div className="hcs-design-text-buttons" role="group" aria-label="Text alignment">{['left', 'center', 'right'].map(align => <Asset.Tooltip key={align} label={`Align ${align}`} side="bottom"><Asset.Button variant="neutral" aria-label={`Align ${align}`} aria-pressed={value.textAlign === align} active={value.textAlign === align} disabled={locked} leadingIcon={<Asset.Icon name={`align-${align}`} size={16} />} onClick={() => onChange({ textAlign: align })} /></Asset.Tooltip>)}</div></div>
    <div className="hcs-design-design-row hcs-design-design-section"><span>Letter spacing</span><StudioShapeNumber label="Letter spacing" min={-20} max={100} value={value.letterSpacing} onChange={letterSpacing => onChange({ letterSpacing })} /></div>
    <div className="hcs-design-design-row"><span>Line height</span><StudioShapeNumber label="Line height" min={50} max={300} suffix="%" value={value.lineHeight} onChange={lineHeight => onChange({ lineHeight })} /></div>
  </>;
}

/** Shared canvas layout controls, including native widgets with their own design panels. */
export function PresentationElementAdvanced({id,value,locked=false,onChange,padding=true,label='Element',onSpacingPreview,spacingAfter=0,onSpacingAfter,absolutePosition=false,onAbsolutePosition,resizeWithSection=true,onResizeWithSection=undefined as undefined | ((follow:boolean)=>void)}) {
  const [hover,setHover]=React.useState(null),[focus,setFocus]=React.useState(null);
  React.useEffect(()=>{onSpacingPreview?.(focus??hover);return()=>onSpacingPreview?.(null);},[focus,hover,onSpacingPreview]);
  const preview=kind=>({onMouseEnter:()=>setHover(kind),onMouseLeave:()=>setHover(null),onFocus:()=>setFocus(kind),onBlur:event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocus(null);}});
  return <details className="hcs-design-advanced"><summary><span>Advanced</span><Asset.Icon name="chevron-down" size={16}/></summary><fieldset disabled={locked} className="hcs-design-design-fields hcs-design-advanced-body">
    {padding&&<div {...preview('padding')}><StudioPaddingControls key={id} value={value} label={label} disabled={locked} onChange={onChange}/></div>}
    {onSpacingAfter&&!absolutePosition&&<div className="hcs-design-design-row" {...preview('after')}><span>Spacing after</span><StudioShapeNumber label={`${label} spacing after`} min={0} max={400} value={spacingAfter} onChange={onSpacingAfter}/></div>}
    {onResizeWithSection&&<div className="hcs-design-design-row"><span>Resize with section</span><Asset.Switch size="sm" aria-label="Resize with section" checked={resizeWithSection} disabled={locked} onChange={onResizeWithSection}/></div>}
    {onAbsolutePosition&&<div className="hcs-design-design-row"><span>Absolute position</span><Asset.Switch size="sm" aria-label="Absolute position" checked={absolutePosition} disabled={locked} onChange={onAbsolutePosition}/></div>}
  </fieldset></details>;
}

export function PresentationElementDesign({ shape, label, locked, onChange, onReplace, onUndo = undefined, onRedo = undefined, absolutePosition = false, onAbsolutePosition = undefined as undefined | ((absolute: boolean) => void), resizeWithSection = true, onResizeWithSection = undefined as undefined | ((follow: boolean) => void), onSpacingPreview=undefined as undefined | ((kind:'padding'|'after'|null)=>void), spacingAfter=0, onSpacingAfter=undefined as undefined | ((value:number)=>void), onFillImage=undefined as undefined | (()=>void), onClose }) {
  const value = studioShapeAppearance(shape);
  const defaults = studioShapeAppearance({ kind: shape.kind });
  const changed = Object.keys(value).some(key => value[key] !== defaults[key]);
  return <aside id="html-element-design" className="hcs-design-design-panel" aria-label="Shape design" onKeyDown={event => { if ((onUndo || onRedo) && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.stopPropagation(); (event.shiftKey ? onRedo : onUndo)?.(); return; } if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); event.stopPropagation(); onClose(); } }}>
    <header className="we-panel-header"><span className="hcs-design-design-title"><Asset.Icon name={studioShapeType(shape).icon} size={16} /><Asset.Tooltip label={label} onlyWhenTruncated><strong tabIndex={0}>{label}</strong></Asset.Tooltip>{locked && <Asset.Icon name="lock" size={14} />}</span><Asset.Tooltip label="Close design" side="bottom"><Asset.Button variant="ghost" size="sm" aria-label="Close shape design" leadingIcon={<Asset.Icon name="panel-right" size={16} />} onClick={onClose} /></Asset.Tooltip></header>
    <div className="hcs-design-design-body">
      <fieldset disabled={locked} className="hcs-design-design-fields" aria-label="Shape appearance">{shape.kind==="image"&&<div className="hcs-design-design-section" style={{display:"grid",gap:"var(--ui-space-3)",paddingBottom:"var(--ui-space-4)"}}><span>Image</span><img src={shape.src} alt={label} style={{width:"100%",height:120,objectFit:"contain",background:"var(--ui-bg-subtle)",borderRadius:"var(--ui-radius-section)"}}/><Asset.Button variant="neutral" disabled={locked} leadingIcon={<Asset.Icon name="image" size={16}/>} onClick={onReplace}>Replace image</Asset.Button></div>}
        {shape.kind !== "image" && <div className="hcs-design-design-row"><span>{['text', 'line'].includes(shape.kind) ? 'Color' : 'Fill'}</span><StudioShapeColor label={shape.kind === "text" ? "Text color" : "Shape fill"} value={value.fill} disabled={locked} onChange={fill => onChange({ fill })} /></div>}
        {['text','image'].includes(shape.kind)&&<div className="hcs-design-design-row"><span>Background</span><StudioShapeColor label="Element background" value={value.background??'transparent'} disabled={locked} onChange={background=>onChange({background})}/></div>}
        {shape.kind==='image'&&<div className="hcs-design-design-row"><span>Content</span><Asset.Dropdown value={value.imageVisible===false?'color':'image'} items={[{id:'image',label:'Image'},{id:'color',label:'Color'}]} onChange={mode=>onChange({imageVisible:mode==='image',...(mode==='color'&&!value.background?{background:'var(--ui-bg-subtle)'}:{})})} trigger={<Asset.TriggerField aria-label="Image content" disabled={locked}>{value.imageVisible===false?'Color':'Image'}</Asset.TriggerField>}/></div>}
        {onFillImage&&!['text','image','line'].includes(shape.kind)&&<div className="hcs-design-design-section"><div className="hcs-design-design-row"><span>Image fill</span><Asset.Button variant="neutral" disabled={locked} leadingIcon={<Asset.Icon name="image" size={16}/>} onClick={onFillImage}>{value.backgroundImage?'Replace':'Add image'}</Asset.Button></div>{value.backgroundImage&&<><img src={value.backgroundImage} alt="Shape fill" style={{width:'100%',height:96,objectFit:'contain',borderRadius:'var(--ui-radius-section)',background:'var(--ui-bg-subtle)'}}/><div className="hcs-design-design-row"><Asset.Button variant="ghost" disabled={locked} onClick={()=>onChange({backgroundImage:undefined})}>Remove image</Asset.Button><Asset.Dropdown value={value.backgroundFit??'cover'} items={[{id:'contain',label:'Fit'},{id:'cover',label:'Fill'}]} onChange={backgroundFit=>onChange({backgroundFit})} trigger={<Asset.TriggerField aria-label="Shape image fit">{value.backgroundFit==='contain'?'Fit':'Fill'}</Asset.TriggerField>}/></div></>}</div>}
        <div className="hcs-design-design-row"><span>Opacity</span><StudioShapeNumber label="Shape opacity" suffix="%" value={value.opacity} onChange={opacity => onChange({ opacity })} /></div>
        {shape.kind === 'line' && <><div className="hcs-design-design-row"><span>Thickness</span><StudioShapeNumber label="Line thickness" min={1} max={24} value={value.lineWidth || 2} onChange={lineWidth => onChange({ lineWidth })} /></div><div className="hcs-design-design-row"><span>Dashed</span><Asset.Switch size="sm" aria-label="Dashed line" checked={value.lineStyle === 'dashed'} onChange={dashed => onChange({ lineStyle: dashed ? 'dashed' : 'solid' })} /></div></>}
        {shape.kind !== 'line' && shape.kind !== 'circle' && shape.kind !== 'text' && (shape.kind==='triangle'?<div className="hcs-design-design-row"><span>Corners</span><StudioShapeNumber label="Shape corner radius" value={value.radius} max={Math.floor(Math.min(shape.width,shape.height)/2)} onChange={radius=>onChange({radius})}/></div>:<StudioCornerControls key={shape.id??label} value={value} disabled={locked} max={Math.floor(Math.min(shape.width,shape.height)/2)} onChange={onChange}/>)}
        {shape.kind === 'image' && <div className="hcs-design-design-row"><span>Fit</span><Asset.Dropdown value={value.imageFit} align="end" listHeight="auto" items={[{ id: 'contain', label: 'Fit' }, { id: 'cover', label: 'Fill' }]} onChange={imageFit => onChange({ imageFit })} trigger={<Asset.TriggerField className="hcs-design-design-shadow" aria-label="Image fit" disabled={locked} trailingIcon={<Asset.Icon name="chevron-down" size={14} />}>{value.imageFit === 'cover' ? 'Fill' : 'Fit'}</Asset.TriggerField>} /></div>}
        {shape.kind === "text" && <StudioTextControls value={value} locked={locked} onChange={onChange} />}
        {shape.kind !== 'line' && shape.kind !== "text" && <><div className="hcs-design-design-section">
          <div className="hcs-design-design-row"><span>Border</span><StudioShapeNumber label="Shape border width" value={value.borderWidth} max={24} onChange={borderWidth => onChange({ borderWidth })} /></div>
          <div className="hcs-design-design-row"><span>Color</span><StudioShapeColor label="Shape border color" value={value.borderColor} disabled={locked} onChange={borderColor => onChange({ borderColor })} /></div>
        </div>
        <div className="hcs-design-design-row hcs-design-design-section"><span>Shadow</span><Asset.Dropdown value={value.shadow} align="end" listHeight="auto" items={[{ id: 'none', label: 'None' }, { id: 'soft', label: 'Soft' }, { id: 'strong', label: 'Strong' }]} onChange={shadow => onChange({ shadow })} trigger={<Asset.TriggerField className="hcs-design-design-shadow" aria-label="Shape shadow" disabled={locked} trailingIcon={<Asset.Icon name="chevron-down" size={14} />}>{value.shadow === 'strong' ? 'Strong' : value.shadow === 'soft' ? 'Soft' : 'None'}</Asset.TriggerField>} /></div></>}
        {(onAbsolutePosition || onSpacingAfter || (shape.kind === 'image' && onResizeWithSection)) && <PresentationElementAdvanced id={shape.id??label} value={value} locked={locked} onChange={onChange} padding={shape.kind!=='line'} onSpacingPreview={onSpacingPreview} spacingAfter={spacingAfter} onSpacingAfter={onSpacingAfter} absolutePosition={absolutePosition} onAbsolutePosition={onAbsolutePosition} resizeWithSection={resizeWithSection} onResizeWithSection={shape.kind==='image'?onResizeWithSection:undefined}/>}
      </fieldset>
    </div>
    <footer className="hcs-design-design-footer"><Asset.Button variant="neutral" disabled={locked || !changed} onClick={() => onChange({...Object.fromEntries(Object.keys(value).map(key=>[key,undefined])),...defaults})}>Reset style</Asset.Button></footer>
  </aside>;
}

function studioShapeSurfaceStyle(shape) {
  const value = studioShapeAppearance(shape);
  return { boxSizing: 'border-box', background: value.fill, ...elementBackgroundImage(value), ...(shape.kind==='circle'?{borderRadius:'50%'}:cornerRadiusStyle(value)), border: `${value.borderWidth}px solid ${value.borderColor}`, boxShadow: STUDIO_SHAPE_SHADOWS[value.shadow] || 'none', opacity: value.opacity / 100 };
}
function studioTrianglePath(width, height, radius, inset = 0) {
  const points = [[width / 2, inset], [width - inset, height - inset], [inset, height - inset]];
  const corners = points.map((point, index) => {
    const previous = points[(index + 2) % 3], next = points[(index + 1) % 3];
    const incoming = Math.hypot(previous[0] - point[0], previous[1] - point[1]);
    const outgoing = Math.hypot(next[0] - point[0], next[1] - point[1]);
    const distance = Math.min(Math.max(0, radius), incoming / 2, outgoing / 2);
    return { point, start: point.map((value, axis) => value + (previous[axis] - value) * distance / incoming), end: point.map((value, axis) => value + (next[axis] - value) * distance / outgoing) };
  });
  return corners.map(({ point, start, end }, index) => `${index ? 'L' : 'M'} ${start.join(' ')} Q ${point.join(' ')} ${end.join(' ')}`).join(' ') + ' Z';
}
function studioShadowLayers(shadow) {
  if (!shadow || shadow === 'none') return [];
  return shadow.split(/,(?![^(]*\))/).map(layer => {
    const lengths = [...layer.matchAll(/(-?[\d.]+)px/g)].map(match => Number(match[1]));
    return { color: layer.replace(/-?[\d.]+px/g, '').trim(), dx: lengths[0] || 0, dy: lengths[1] || 0, blur: lengths[2] || 0, spread: lengths[3] || 0 };
  });
}
export function PresentationShapeSurface({ shape, style, className }) {
  const value = studioShapeAppearance(shape);
  const triangle = shape.kind === 'triangle';
  const shadowProbe = React.useRef(null);
  const shadowId = `shape-shadow-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [shadows, setShadows] = React.useState([]);
  React.useLayoutEffect(() => {
    if (triangle && shadowProbe.current) setShadows(studioShadowLayers(getComputedStyle(shadowProbe.current).boxShadow));
  }, [triangle, value.shadow]);
  if (shape.kind === "image") return <div className={className} style={{ ...studioShapeSurfaceStyle(shape), backgroundColor: value.background??'transparent', ...elementBoxStyle(value), overflow: 'hidden', ...style }}><img src={shape.src} alt={shape.name || "Image"} draggable={false} style={{ visibility:value.imageVisible===false?'hidden':undefined, display: 'block', width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', objectFit: value.imageFit === 'cover' ? 'cover' : 'contain' }} /></div>;
  if (shape.kind === 'line') return <div className={className} style={{position:'relative',opacity:value.opacity/100,...style}}><div style={{position:'absolute',left:0,right:0,top:'50%',height:0,borderTop:`${value.lineWidth||2}px ${value.lineStyle==='dashed'?'dashed':'solid'} ${value.fill}`,borderRadius:value.lineCap==='round'?(value.lineWidth||2):0,transform:'translateY(-50%)'}}/></div>;
  if (shape.kind === "text") return <div className={className} data-studio-text-size={value.fontSize} style={{ ...studioTextStyle(shape), ...style }}>{shape.text || ""}</div>;
  if (!triangle) return <div className={className} style={{ ...studioShapeSurfaceStyle(shape), ...style }} />;
  const stroke = Math.min(value.borderWidth, Math.min(shape.width, shape.height) / 2);
  return <div className={className} style={{ ...style, position: 'relative', opacity: value.opacity / 100 }}>
    <span ref={shadowProbe} aria-hidden="true" style={{ position: 'absolute', visibility: 'hidden', width: 1, height: 1, boxShadow: STUDIO_SHAPE_SHADOWS[value.shadow] || 'none' }} />
    <svg viewBox={`0 0 ${shape.width} ${shape.height}`} width="100%" height="100%" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      {!!shadows.length && <defs><filter id={shadowId} x="-200%" y="-200%" width="500%" height="500%" colorInterpolationFilters="sRGB">
        {shadows.map((shadow, index) => <React.Fragment key={index}>
          <feMorphology in="SourceAlpha" operator={shadow.spread < 0 ? 'erode' : 'dilate'} radius={Math.abs(shadow.spread)} result={`spread-${index}`} />
          <feGaussianBlur in={`spread-${index}`} stdDeviation={shadow.blur / 2} result={`blur-${index}`} />
          <feOffset in={`blur-${index}`} dx={shadow.dx} dy={shadow.dy} result={`offset-${index}`} />
          <feFlood floodColor={shadow.color} result={`color-${index}`} />
          <feComposite in={`color-${index}`} in2={`offset-${index}`} operator="in" result={`shadow-${index}`} />
        </React.Fragment>)}
        <feMerge>{shadows.map((_, index) => <feMergeNode key={index} in={`shadow-${shadows.length - 1 - index}`} />)}<feMergeNode in="SourceGraphic" /></feMerge>
      </filter></defs>}
      {value.backgroundImage&&<defs><pattern id={`${shadowId}-image`} patternUnits="userSpaceOnUse" width={shape.width} height={shape.height}><image href={value.backgroundImage} width={shape.width} height={shape.height} preserveAspectRatio={value.backgroundFit==='contain'?'xMidYMid meet':'xMidYMid slice'}/></pattern></defs>}
      <path d={studioTrianglePath(shape.width, shape.height, value.radius, stroke / 2)} fill={value.backgroundImage?`url(#${shadowId}-image)`:value.fill} stroke={value.borderColor} strokeWidth={stroke} strokeLinejoin="round" filter={shadows.length ? `url(#${shadowId})` : undefined} />
    </svg>
  </div>;
}
function studioTextStyle(shape) {
  const value = studioShapeAppearance(shape);
  return { color: value.fill, opacity: value.opacity / 100, fontFamily: studioFontFamily(value.fontFamily), fontSize: value.fontSize, fontWeight: value.fontWeight, fontStyle: value.italic ? 'italic' : 'normal', textDecoration: value.underline ? 'underline' : 'none', textTransform: 'none', letterSpacing: value.letterSpacing, lineHeight: value.lineHeight / 100, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', textAlign: value.textAlign };
}

export function PresentationShapeMenu({ disabled, onAdd, includeLine = false }) {
  const [open, setOpen] = React.useState(false);
  const content = React.useRef(null), trigger = React.useRef(null);
  function focusItem(index) { requestAnimationFrame(() => content.current?.querySelectorAll('[role="menuitem"]')[index]?.focus()); }
  function close() { setOpen(false); requestAnimationFrame(() => trigger.current?.querySelector('button')?.focus({ preventScroll: true })); }
  return <div ref={trigger}><Asset.DropdownMenu open={open} onOpenChange={setOpen}>
    <Asset.DropdownMenuTrigger><StudioInsertTool label="Shapes" icon="shapes" disabled={disabled} aria-haspopup="menu" aria-expanded={open} onKeyDown={event => {
      if (['ArrowDown', 'Enter', ' '].includes(event.key)) { event.preventDefault(); setOpen(true); focusItem(0); }
    }} /></Asset.DropdownMenuTrigger>
    <Asset.DropdownMenuContent ref={content} fit="content" align="center" className="studio-shape-menu" role="menu" aria-label="Shapes" onKeyDown={event => {
      const items = Array.from(content.current.querySelectorAll('[role="menuitem"]')), index = items.indexOf(document.activeElement);
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + items.length) % items.length; items[next]?.focus(); }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    }}>
      {[...STUDIO_SHAPE_TYPES, ...(includeLine ? [{ id: 'line', label: 'Line', icon: 'slash' }] : [])].map(shape => <StudioInsertTool key={shape.id} label={shape.label} icon={shape.icon} role="menuitem" onClick={() => { onAdd(shape.id); close(); }} />)}
    </Asset.DropdownMenuContent>
  </Asset.DropdownMenu></div>;
}

function StudioInsertTool({label,icon,...props}) {return <Asset.Tooltip label={label} side="bottom"><span className="studio-insert-tool"><Asset.Button variant="ghost" aria-label={label} leadingIcon={<Asset.Icon name={icon} size={16}/>} {...props}/></span></Asset.Tooltip>;}
