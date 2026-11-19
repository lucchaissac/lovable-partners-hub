import { DesignPanelHeader } from '../studio/DesignPanelHeader';
import {useRef,useState,useEffect} from 'react';
import {Button,Icon,Input} from '@asset/ui';
import type {HtmlBlock} from '../studio/htmlEditorModel';
import {importPartnerLogo} from './partnerBadge';
import {ImageAppearanceControls} from './ImageAppearanceControls';
import './partner-badge.css';
import {fittedBrandLogo,type PreparedBrandLogo} from './brandLogo';

type ImageBlock=Extract<HtmlBlock,{kind:'image'}>;
export function BrandLogoControls({block,onChange,onReplaceLogo,locked=false}:{block:ImageBlock;onChange:(block:ImageBlock)=>void;onReplaceLogo?:(logo:PreparedBrandLogo)=>Promise<void>;locked?:boolean}){
 const input=useRef<HTMLInputElement>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const latest=useRef(block);latest.current=block;
 const change=useRef(onChange);change.current=onChange;
 const active=useRef(true);useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const upload=async(file?:File)=>{
  if(!file||busy||locked)return;setBusy(true);setError('');
  try{
   const logo=await importPartnerLogo(file,{vectorResolution:1200}),img=new Image();img.src=logo.src;await img.decode();
   if(active.current){if(onReplaceLogo)await onReplaceLogo({...logo,name:file.name});else change.current(fittedBrandLogo(latest.current,logo.src,file.name,img.naturalWidth,img.naturalHeight));}
  }catch(reason){if(active.current)setError(reason instanceof Error?reason.message:'Could not read this logo.');}
  finally{if(active.current)setBusy(false);if(input.current)input.current.value='';}
 };
 const updateFrame=(key:'x'|'y'|'widthPx'|'height',value:number)=>{
  if(!Number.isFinite(value))return;
  const frame=block.editor??{},ratio=(frame.widthPx??306)/(frame.height??136);
  const size=key==='widthPx'?{widthPx:Math.max(8,value),height:Math.max(8,value)/ratio}:key==='height'?{height:Math.max(8,value),widthPx:Math.max(8,value)*ratio}:{[key]:value};
  onChange({...block,editor:{...frame,...size}});
 };
 return <fieldset className="partner-badge-fields" disabled={locked||busy}>
  <button type="button" className="partner-badge-logo" aria-label="Replace partner logo" onClick={()=>input.current?.click()}><img src={block.value.src} alt="Partner logo preview"/></button>
  <input ref={input} type="file" hidden accept="image/svg+xml,image/png,image/jpeg,image/webp" aria-label="Upload collaboration logo" onChange={event=>void upload(event.target.files?.[0])}/>
  <Button variant="neutral" leadingIcon={<Icon name="upload" size={16}/>} onClick={()=>input.current?.click()}>{busy?'Preparing logo…':'Replace partner logo'}</Button>
  <div className="brand-logo-position">{([['x','X'],['y','Y'],['widthPx','Width'],['height','Height']] as const).map(([key,label])=><label key={key} className="partner-badge-field"><span>{label}</span><Input inputSize="sm" type="number" step={1} aria-label={`Logo ${label.toLowerCase()}`} value={Math.round((block.editor?.[key]??0)*100)/100} onChange={event=>updateFrame(key,event.target.valueAsNumber)}/></label>)}</div>
  <ImageAppearanceControls block={block} onChange={onChange} locked={locked||busy} label="Logo"/>
  {error&&<p className="partner-badge-error" role="alert">{error}</p>}
 </fieldset>;
}
export function BrandLogoDesign({block,onChange,onReplaceLogo,onClose,locked}:{block:ImageBlock;onChange:(block:ImageBlock)=>void;onReplaceLogo?:(logo:PreparedBrandLogo)=>Promise<void>;onClose:()=>void;locked:boolean}){
 return <aside id="html-element-design" className="hcs-design-design-panel partner-badge-panel" aria-label="Collaboration logo design"><DesignPanelHeader title="Partner logo" locked={locked} closeLabel="Close logo design" onClose={onClose}/><div className="hcs-design-design-body"><BrandLogoControls block={block} onChange={onChange} onReplaceLogo={onReplaceLogo} locked={locked}/></div></aside>;
}
