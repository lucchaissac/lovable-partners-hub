import { DesignPanelHeader } from '../studio/DesignPanelHeader';
import { useEffect, useRef, useState } from 'react';
import { Button, Icon, Input } from '@asset/ui';
import { badgeFormats, badgeFormatName, type PartnerBadgeSettings } from './partnerBadgeSettings';
import { importPartnerLogo, renderPartnerBadge } from './partnerBadge';
import { ImageAppearanceControls } from './ImageAppearanceControls';
import type { HtmlBlock } from '../studio/htmlEditorModel';
import './partner-badge.css';

type RenderedBadge = Awaited<ReturnType<typeof renderPartnerBadge>>;
export function PartnerBadgeDesign({block,settings,src,locked,onChange,onAppearanceChange,onClose}:{block:Extract<HtmlBlock,{kind:'image'}>;settings:PartnerBadgeSettings;src:string;locked:boolean;onChange:(settings:PartnerBadgeSettings,image:RenderedBadge)=>void;onAppearanceChange:(block:Extract<HtmlBlock,{kind:'image'}>)=>void;onClose:()=>void}) {
  const [draft,setDraft]=useState(settings),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState('');
  const input=useRef<HTMLInputElement>(null),generation=useRef(0),latest=useRef(draft);latest.current=draft;
  const signature=JSON.stringify(settings);
  useEffect(()=>{generation.current++;setDraft(settings);setBusy(false);},[signature]);
  useEffect(()=>()=>{generation.current++;},[]);
  const update=async(next:PartnerBadgeSettings)=>{
    const token=++generation.current;setDraft(next);setBusy(true);setError('');
    try {const image=await renderPartnerBadge(next);if(token===generation.current)onChange(next,image);}
    catch(reason){if(token===generation.current)setError(reason instanceof Error?reason.message:'Could not update this badge.');}
    finally {if(token===generation.current)setBusy(false);}
  };
  const chooseFormat=(format:PartnerBadgeSettings['format'])=>{
    const wasExpert=draft.format.startsWith('expert'),expert=format.startsWith('expert');
    const detail:[string,string]=[...draft.detail];
    if(expert&&!wasExpert&&['Select','Premier','Elite'].includes(detail[0]))detail[0]='Expert';
    if(!expert&&wasExpert&&detail[0]==='Expert')detail[0]='Select';
    void update({...draft,format,detail});
  };
  const upload=async(file?:File)=>{
    if(!file)return;const token=++generation.current;setUploading(true);setError('');
    try {
      const logo=await importPartnerLogo(file);if(token!==generation.current)return;
      const current=latest.current,format=current.format.endsWith('horizontal')?current.format.replace('horizontal','stacked'):current.format.endsWith('compact')?current.format.replace('compact','symbol'):current.format;
      await update({...current,format:format as PartnerBadgeSettings['format'],partnerImage:logo.src,logoName:file.name.slice(0,200)});
    } catch(reason){if(token===generation.current)setError(reason instanceof Error?reason.message:'Could not open this logo.');}
    finally {setUploading(false);if(input.current)input.current.value='';}
  };
  const expert=draft.format.startsWith('expert'),partner=['stacked','symbol'].some(layout=>draft.format.endsWith(layout));
  const textFields=(key:'role'|'detail',labels:[string,string])=>labels.map((label,index)=><label className="partner-badge-field" key={`${key}-${index}`}><span>{label}</span><Input inputSize="sm" aria-label={label} maxLength={24} value={draft[key][index]} onChange={event=>{const lines:[string,string]=[...draft[key]];lines[index]=event.target.value;void update({...draft,[key]:lines});}}/></label>);
  return <aside id="html-element-design" className="hcs-design-design-panel partner-badge-panel" aria-label="Partner badge design" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();onClose();}}}>
    <DesignPanelHeader title="Partner badge" locked={locked} closeLabel="Close badge design" onClose={onClose}/>
    <div className="hcs-design-design-body"><fieldset disabled={locked||uploading} className="partner-badge-fields" aria-label="Badge content" aria-busy={busy||uploading}>
      <div className="partner-badge-preview"><img src={src} alt="Badge preview"/></div>
      <label className="partner-badge-field"><span>Format</span><span className="partner-badge-select"><select aria-label="Badge format" value={draft.format} onChange={event=>chooseFormat(event.target.value as PartnerBadgeSettings['format'])}>{badgeFormats.map(format=><option key={format} value={format}>{badgeFormatName(format)}</option>)}</select><Icon name="chevron-down" size={14}/></span></label>
      {!expert&&<div className="partner-badge-section"><h3>Partnership block</h3>{textFields('role',['First line','Second line'])}</div>}
      <div className="partner-badge-section"><h3>{expert?'Status block':'Tier block'}</h3>{textFields('detail',[expert?'Status':'Tier','Year'])}</div>
      <div className="partner-badge-section"><h3>Partner logo</h3>
        {draft.partnerImage&&<button type="button" className="partner-badge-logo" aria-label="Replace partner logo" onClick={()=>input.current?.click()}><img src={draft.partnerImage} alt="Partner logo preview"/></button>}
        {partner&&!draft.partnerImage&&<label className="partner-badge-field"><span>Name</span><Input inputSize="sm" aria-label="Partner name" value={draft.partnerName} maxLength={40} onChange={event=>void update({...draft,partnerName:event.target.value})}/></label>}
        <input ref={input} type="file" hidden accept="image/svg+xml,image/png,image/jpeg,image/webp" aria-label="Upload partner logo" onChange={event=>void upload(event.target.files?.[0])}/>
        <Button variant="neutral" leadingIcon={<Icon name="upload" size={16}/>} onClick={()=>input.current?.click()}>{uploading?'Preparing logo…':draft.partnerImage?'Replace logo':'Upload logo'}</Button>
        {draft.partnerImage&&<Button variant="ghost" onClick={()=>void update({...draft,partnerImage:'',logoName:undefined})}>Remove logo</Button>}
        <p>SVG, PNG or JPG. Plain backgrounds are removed automatically. Your logo is centered and fitted.</p>
      </div>
    </fieldset><ImageAppearanceControls block={block} onChange={onAppearanceChange} locked={locked||uploading||busy} label="Badge"/>{error&&<p className="partner-badge-error" role="alert">{error}</p>}</div>
  </aside>;
}
