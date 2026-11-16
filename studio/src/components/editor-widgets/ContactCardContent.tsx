import {cornerRadiusStyle} from '../../studio/htmlCornerRadius';
import { forwardRef, useId, useRef, useState, type ButtonHTMLAttributes, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Avatar, Button, Dialog, DialogBody, DialogFooter, DialogHeader, Dropdown, Icon, Input } from '@asset/ui';
import type { ContactCardStyle } from './ContactCardDesign';
import { contactTextCSS } from './ContactCardDesign';

export type ContactAction = { kind: 'Email'|'Phone'|'LinkedIn'|'Calendar'|'Website'; value: string; label: string };
export type EditorContact = { id: string; name: string; title?: string; size?: 'big'|'small'; description?: string; avatar?: string; hideAvatar?: boolean; actions?: ContactAction[]; design?: ContactCardStyle };
const actionIcon = { Email: 'mail', Phone: 'smartphone', LinkedIn: 'linkedin', Calendar: 'calendar', Website: 'globe' };
const actionHref = (action: ContactAction) => action.kind === 'Email' ? `mailto:${action.value}` : action.kind === 'Phone' ? `tel:${action.value}` : /^https?:\/\//i.test(action.value) ? action.value : undefined;

// Dropdown controls `active`; do not forward this non-DOM prop to native buttons.
const ContactControlTrigger = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }>(function ContactControlTrigger({ active, ...props }, ref) {
  return <button ref={ref} data-active={active || undefined} {...props} />;
});

/** Inline text, avatar menu, and per-action dialogs mirror the observed staging card. */
export function ContactCardContent({ contact, size, style, editable, onChange, overlayHost, openLink }: { contact: EditorContact; size: 'big'|'small'; style: ContactCardStyle; editable: boolean; onChange: (changes: Partial<EditorContact>) => void; overlayHost?: HTMLElement | null; openLink?: (url: string) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const formId = useId();
  const [draft, setDraft] = useState<ContactAction>(); const [existing, setExisting] = useState(false);
  const [error, setError] = useState('');
  const actions = contact.actions ?? [];
  const startAction = (kind: ContactAction['kind']) => { const action = actions.find(action=>action.kind === kind); setExisting(!!action); setDraft(action ?? {kind,value:'',label:kind}); };
  const field = (key: 'name'|'title'|'description', label: string, textStyle: CSSProperties) => <div className="ewb-contact-inline" data-empty={!contact[key] || undefined}>
    <div role={editable ? 'textbox' : undefined} aria-label={`${label} for ${contact.id}`} contentEditable={editable} suppressContentEditableWarning className="ewb-contact-editable" style={textStyle} data-placeholder={label} onBlur={event=>onChange({[key]:event.currentTarget.textContent ?? ''})} onPaste={event=>{event.preventDefault();document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));}}>{contact[key]}</div>
    {editable && key !== 'name' && <Button className="ewb-contact-field-remove" size="sm" variant="neutral" aria-label={`Remove ${label.toLowerCase()}`} leadingIcon={<Icon name="trash-2" size={12} />} onClick={()=>onChange({[key]:undefined})} />}
  </div>;
  const avatar = <Avatar name={contact.name} src={contact.avatar} tone="muted" style={{width:size==='big'?120:56,height:size==='big'?120:56,fontSize:size==='big'?40:20}} />;
  const dialog = draft && <Dialog open width={336} className="ewb-action-dialog" overlayClassName="ewb-action-overlay" ariaLabel={`${existing?'Edit':'Add'} ${draft.kind}`} onClose={()=>setDraft(undefined)} closeOnEscape={false} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setDraft(undefined);}}} dividers>
    <DialogHeader title={`${existing?'Edit':'Add'} ${draft.kind}`} onClose={()=>setDraft(undefined)} />
    <DialogBody><form id={formId} onSubmit={event=>{event.preventDefault();onChange({actions:[...actions.filter(action=>action.kind!==draft.kind),draft]});setDraft(undefined);}}>
      <label>{draft.kind}<Input autoFocus aria-label={draft.kind} placeholder={`Enter ${draft.kind}`} type={draft.kind==='Email'?'email':draft.kind==='Phone'?'tel':'url'} value={draft.value} onChange={event=>setDraft({...draft,value:event.target.value})} required /></label><label>Label<Input aria-label="Label" placeholder="Enter Label" value={draft.label} onChange={event=>setDraft({...draft,label:event.target.value})} /></label>
    </form></DialogBody>
      <DialogFooter><Button variant="neutral" size="sm" onClick={()=>setDraft(undefined)}>Cancel</Button><Button variant="primary" size="sm" type="submit" form={formId}>Save</Button></DialogFooter>
  </Dialog>;
  return <>
    {!contact.hideAvatar && (editable ? <Dropdown listHeight="auto" items={[{id:'edit',label:'Edit',leadingIcon:<Icon name="pencil" size={16} />},{id:'remove',label:'Remove',leadingIcon:<Icon name="trash-2" size={16} />}]} onChange={action=>action==='edit'?file.current?.click():onChange({hideAvatar:true})} trigger={<ContactControlTrigger className="ewb-avatar-trigger" aria-label={`Avatar for ${contact.name || 'contact'}`} type="button">{avatar}</ContactControlTrigger>} /> : avatar)}
    <input ref={file} type="file" hidden accept="image/png,image/jpeg,image/gif" aria-label="Contact image file" onChange={event=>{const image=event.target.files?.[0];event.target.value='';if(!image)return;if(!['image/png','image/jpeg','image/gif'].includes(image.type)){setError('Choose a PNG, JPG or GIF image.');return;}if(image.size>1400000){setError('Choose an image smaller than 1.4 MB.');return;}const reader=new FileReader();reader.onload=()=>{onChange({avatar:String(reader.result),hideAvatar:false});setError('');};reader.readAsDataURL(image);}} />
    <div className="ewb-contact-copy">
      {field('name','Name',contactTextCSS(style.name))}
      {contact.title !== undefined && field('title','Title',contactTextCSS(style.title))}
      {contact.description !== undefined && field('description','Description',{...contactTextCSS(style.title),fontSize:14})}
      {editable && (contact.title === undefined || contact.description === undefined || contact.hideAvatar) && <Dropdown listHeight="auto" items={[...(contact.hideAvatar?[{id:'avatar',label:'Image',leadingIcon:<Icon name="image" size={16} />}]:[]),...(contact.title === undefined?[{id:'title',label:'Title'}]:[]),...(contact.description === undefined?[{id:'description',label:'Description'}]:[])]} onChange={field=>field==='avatar'?file.current?.click():onChange({[field]:''})} trigger={<ContactControlTrigger type="button" className="ewb-contact-add-line" aria-label="Add contact field"><Icon name="plus" size={12} /></ContactControlTrigger>} />}
      <div className="ewb-contact-buttons">{actions.map(action=>editable?<Dropdown key={action.kind} listHeight="auto" items={[{id:'edit',label:'Edit',leadingIcon:<Icon name="pencil" size={16} />},{id:'remove',label:'Remove',leadingIcon:<Icon name="trash-2" size={16} />}]} onChange={next=>next==='edit'?startAction(action.kind):onChange({actions:actions.filter(item=>item.kind!==action.kind)})} trigger={<ContactControlTrigger type="button" className="ewb-contact-action" aria-label={`${action.kind}: ${action.label || action.kind}`} style={{background:style.button.background,...cornerRadiusStyle(style.button),fontSize:style.button.size,fontWeight:style.button.weight}}><Icon name={actionIcon[action.kind]} size={14} />{action.label}</ContactControlTrigger>} />:<a key={action.kind} className="ewb-contact-action" href={actionHref(action)} onClick={event=>{if(openLink && actionHref(action)){event.preventDefault();openLink(actionHref(action)!);}}} style={{background:style.button.background,...cornerRadiusStyle(style.button),fontSize:style.button.size,fontWeight:style.button.weight}}><Icon name={actionIcon[action.kind]} size={14}/>{action.label}</a>)}</div>
      {editable && actions.length<4 && <Dropdown listHeight="auto" items={(Object.keys(actionIcon) as ContactAction['kind'][]).filter(kind=>kind !== 'Website' && !actions.some(action=>action.kind===kind)).map(kind=>({id:kind,label:kind,leadingIcon:<Icon name={actionIcon[kind]} size={16}/>}))} onChange={kind=>startAction(kind as ContactAction['kind'])} trigger={<ContactControlTrigger type="button" className="ewb-contact-add-line ewb-contact-action-add" aria-label="Add contact action"><Icon name="plus" size={12} /></ContactControlTrigger>} />}
      {error && <p role="alert">{error}</p>}
    </div>
    {dialog && createPortal(dialog,overlayHost ?? document.body)}
  </>;
}
