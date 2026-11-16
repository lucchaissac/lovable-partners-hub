import {cornerRadiusStyle} from '../../studio/htmlCornerRadius';
import {usePresentationWidgetDesign,WidgetAdvancedDesign} from './EditorWidgetDesign';
import {EditorWidgetToolbar} from './EditorWidgetToolbar';
import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Avatar, Button, Dialog, DialogBody, DialogFooter, DialogHeader, Dropdown, Icon, Input, SegmentedControl, Switch } from '@asset/ui';
import { ContactCardDesign, ContactColor, ContactSetting, CONTACT_SHADOWS, DEFAULT_CONTACT_STYLE, type ContactCardStyle } from './ContactCardDesign';
import { ContactCardContent, type EditorContact } from './ContactCardContent';
import { ContactInsert, ContactPicker, DEMO_SAVED_CONTACTS, type ContactSource } from './ContactPicker';
import { EditorSurfaceDesign, surfaceCSS, type EditorSurfaceStyle } from './EditorSurfaceDesign';
export type { EditorContact } from './ContactCardContent';
import './editor-widget-blocks.css';

export type EditorContactsValue = { contacts: EditorContact[]; size: 'big'|'small'; columns?: number; alignment: 'left'|'center'|'right'; cardStyle?: ContactCardStyle; showTitle?: boolean; showLogo?: boolean; title?: string; titleColor?: string; logoSrc?: string; background?: string; widgetStyle?: EditorSurfaceStyle };
export const SAMPLE_CONTACTS: EditorContactsValue = { contacts: [{ id: 'example', name: 'Example contact', title: 'Customer success', actions: [] }], size: 'big', alignment: 'center' };

/** Interactive inventory pilot: observed staging controls, with local data. */
export function EditorContactCards({ value, onChange, editable = true, headerHost, panelHost, overlayHost, onPanelChange, onSectionDesign, showSectionTitle = true, showRemovalNotice = true, hidden, onHiddenChange, active, openLink }: { value: EditorContactsValue; onChange: (value: EditorContactsValue) => void; editable?: boolean; headerHost?: HTMLElement | null; panelHost?: HTMLElement | null; overlayHost?: HTMLElement | null; onPanelChange?: (panel: 'card'|'widget'|null) => void; onSectionDesign?: () => void; showSectionTitle?: boolean; showRemovalNotice?: boolean; hidden?: boolean; onHiddenChange?: (hidden: boolean) => void; active?: boolean; openLink?: (url: string) => void }) {
  const presentationDesign=usePresentationWidgetDesign();
  const [panel, setPanel] = useState<'card'|'widget'|null>(null);
  const [designContact, setDesignContact] = useState<string>();
  const [locallyRemoved, setLocallyRemoved] = useState(false);
  const removed = hidden ?? locallyRemoved;
  const setRemoved = (next: boolean) => { setLocallyRemoved(next); onHiddenChange?.(next); };
  useEffect(() => { if (active === false) setPanel(null); }, [active]);
  const [removeContact, setRemoveContact] = useState<string>();
  const [cardDesignOpen, setCardDesignOpen] = useState(true);
  const [widgetGroup, setWidgetGroup] = useState<'widget'|'cards'|null>('widget');
  const [picker, setPicker] = useState<{ source: 'existing'|'roles'; index: number }>();
  const [savedContacts, setSavedContacts] = useState(DEMO_SAVED_CONTACTS);
  useEffect(() => { onPanelChange?.(panel); return () => onPanelChange?.(null); }, [panel, onPanelChange]);
  useLayoutEffect(() => {
    if ((!picker && !panel) || !overlayHost) return;
    const frame = requestAnimationFrame(() => overlayHost.scrollIntoView({ block: 'center', behavior: 'instant' }));
    return () => cancelAnimationFrame(frame);
  }, [picker, panel, overlayHost]);
  const current = value.contacts.find(contact => contact.id === designContact);
  const style = current?.design ?? value.cardStyle ?? DEFAULT_CONTACT_STYLE;
  const widgetStyle: EditorSurfaceStyle = value.widgetStyle ?? {background:value.background ?? 'var(--ui-bg)',radius:0,border:1,borderColor:'transparent',shadow:'none'};
  function updateContact(id: string, changes: Partial<EditorContact>) { onChange({ ...value, contacts: value.contacts.map(contact => contact.id === id ? { ...contact, ...changes } : contact) }); }
  function insert(contacts: EditorContact[], index: number) {
    const added = contacts.map(contact => ({ ...contact, id: crypto.randomUUID(), actions: contact.actions?.map(action => ({ ...action })) }));
    onChange({ ...value, contacts: [...value.contacts.slice(0,index), ...added, ...value.contacts.slice(index)] });
    setPicker(undefined); setPanel(null);
  }
  function chooseSource(source: ContactSource, index: number) {
    setPanel(null);
    if (source === 'scratch') insert([{ id: '', name: '', title: '', actions: [] }], index);
    else setPicker({ source, index });
  }
  const pickerDialog = picker && <ContactPicker source={picker.source} savedContacts={savedContacts} onDeleteSaved={id => setSavedContacts(current => current.filter(contact => contact.id !== id))} onAdd={contacts => insert(contacts,picker.index)} onClose={() => setPicker(undefined)} />;
  const settings = panel && (editable || presentationDesign) && !removed ? <aside className={presentationDesign?"hcs-design-design-panel hcs-native-design-panel":"ewb-settings-panel"} aria-label={panel === 'card' ? 'Contact card design' : 'Contact cards widget design'}>
    <header className={presentationDesign?"we-panel-header":undefined}><strong>{panel === 'card' ? (current?.name || 'Contact card') : 'Contact card'}</strong><Button variant="ghost" size="sm" aria-label="Close contact settings" leadingIcon={<Icon name="panel-right" size={16} />} onClick={() => setPanel(null)} /></header>
    <div className={presentationDesign?"hcs-design-design-body hcs-native-design-body":"ewb-settings-body"}>
      {panel === 'card' && <>
        {current && <Button variant="ghost" className="ewb-disclosure" aria-expanded={cardDesignOpen} trailingIcon={<Icon name={cardDesignOpen ? 'chevron-down' : 'chevron-right'} size={14} />} onClick={() => setCardDesignOpen(!cardDesignOpen)}>Card Design</Button>}
        {(!current || cardDesignOpen) && <ContactCardDesign size={current?.size ?? value.size} onSizeChange={size => current ? updateContact(current.id,{size}) : onChange({ ...value, size })} value={style} onChange={cardStyle => current ? updateContact(current.id,{design:cardStyle}) : onChange({ ...value, cardStyle })} />}
      </>}
      {panel === 'widget' && <>
        <Button variant="ghost" className="ewb-disclosure" aria-expanded={widgetGroup==='widget'} trailingIcon={<Icon name={widgetGroup==='widget'?'chevron-down':'chevron-right'} size={14}/>} onClick={()=>setWidgetGroup(widgetGroup==='widget'?null:'widget')}>Widget Design</Button>
        {widgetGroup==='widget' && <>
          <ContactSetting label="Title">{value.showTitle && <ContactColor label="Widget title color" value={value.titleColor ?? 'var(--ui-text)'} onChange={titleColor=>onChange({...value,titleColor})}/>}<Switch aria-label="Show widget title" size="sm" checked={value.showTitle ?? false} onChange={showTitle => onChange({ ...value, showTitle })} /></ContactSetting>
          <ContactSetting label="Logo"><Switch aria-label="Show widget logo" size="sm" checked={value.showLogo ?? false} onChange={showLogo => onChange({ ...value, showLogo })} /></ContactSetting>
          <ContactSetting label="Columns"><SegmentedControl size="sm" animateSelection aria-label="Card alignment" value={value.alignment} items={['left','center','right'].map(align => ({ value: align, label: <span className="ewb-sr-only">Align {align}</span>, leadingIcon: <Icon name={`align-${align}`} size={14} />, iconOnly: true }))} onChange={alignment => onChange({ ...value, alignment: alignment as EditorContactsValue['alignment'] })} /><Input inputSize="sm" className="ewb-number-field" aria-label="Card columns" type="number" min={1} max={6} placeholder="Auto" value={value.columns ?? ''} onChange={event => onChange({ ...value, columns: event.target.value ? Math.max(1, Math.min(6,Number(event.target.value))) : undefined })} /></ContactSetting>
          <EditorSurfaceDesign label="Widget" value={widgetStyle} shadow={false} onChange={widgetStyle=>onChange({...value,widgetStyle})}/>
        </>}
        <Button variant="ghost" className="ewb-disclosure ewb-panel-separator" aria-expanded={widgetGroup==='cards'} trailingIcon={<Icon name={widgetGroup==='cards'?'chevron-down':'chevron-right'} size={14}/>} onClick={()=>setWidgetGroup(widgetGroup==='cards'?null:'cards')}>Card Design</Button>
        {widgetGroup==='cards' && <ContactCardDesign size={value.size} onSizeChange={size=>onChange({...value,size})} value={value.cardStyle ?? DEFAULT_CONTACT_STYLE} onChange={cardStyle=>onChange({...value,cardStyle})}/>}
      </>}

      <WidgetAdvancedDesign/>
    </div>
    <footer className={presentationDesign?"hcs-design-design-footer hcs-native-design-footer":"ewb-panel-footer"}>
      <Button variant="primary" onClick={() => current ? updateContact(current.id,{design:undefined,size:undefined}) : onChange({...value,cardStyle:DEFAULT_CONTACT_STYLE,size:'big',widgetStyle:undefined,background:undefined,showTitle:false,showLogo:false,columns:undefined,alignment:'center'})}>Reset all changes</Button>
      <Button variant="neutral" className="ewb-remove-contact" leadingIcon={<Icon name="trash-2" size={12} />} onClick={() => { if(current)setRemoveContact(current.id);else {setRemoved(true);setPanel(null);} }}>Remove {current ? 'contact card' : 'widget'}</Button>
    </footer>
  </aside> : null;
  const removeDialog = removeContact && <Dialog open width={400} dividers role="alertdialog" ariaLabel="Remove contact card" className="ewb-contact-confirm" overlayClassName="ewb-action-overlay" onClose={() => setRemoveContact(undefined)} closeOnEscape={false} onKeyDown={event => {if(event.key === 'Escape'){event.stopPropagation();setRemoveContact(undefined);}}}>
    <DialogHeader title="Remove contact card" showClose={false} />
    <DialogBody>Are you sure?</DialogBody>
    <DialogFooter><Button variant="neutral" size="sm" onClick={() => setRemoveContact(undefined)}>Cancel</Button><Button variant="destructive" size="sm" onClick={() => {onChange({...value,contacts:value.contacts.filter(contact=>contact.id!==removeContact)});setRemoveContact(undefined);setPanel(null);}}>Remove</Button></DialogFooter>
  </Dialog>;
  const sectionTitle = editable && showSectionTitle && <div className="ewb-contact-section-title"><Icon name="rectangle-horizontal" size={12} /><span>Contact cards</span><Button size="sm" variant="ghost" aria-label={onSectionDesign?'Section Design':'Widget Design'} leadingIcon={<Icon name="paintbrush-vertical" size={14} />} onClick={() => {setDesignContact(undefined);if(onSectionDesign){setPanel(null);onSectionDesign();}else setPanel('widget');}} /></div>;
  if (removed && (!editable || !showRemovalNotice)) return null;
  if (removed) return <>{sectionTitle && (headerHost ? createPortal(sectionTitle,headerHost) : sectionTitle)}<div className="ewb-contact-empty">Widget removed.<Button variant="neutral" size="sm" onClick={() => setRemoved(false)}>Undo</Button></div></>;
  return <div className="ewb-contacts">
    {sectionTitle && (headerHost ? createPortal(sectionTitle,headerHost) : sectionTitle)}
    <div className="ewb-contact-widget" style={surfaceCSS(widgetStyle)} data-editable={editable || undefined} data-selected={!!panel || !!picker || undefined}>
    {editable && <EditorWidgetToolbar className="ewb-contacts-toolbar" role="toolbar" aria-label="Contact card controls">
      <Icon name="contact" size={14} /><span>Contact card</span>
      <Button size="sm" variant="ghost" aria-label="Widget Design" leadingIcon={<Icon name="paintbrush-vertical" size={14} />} onClick={() => {setDesignContact(undefined);setWidgetGroup('widget');setPanel('widget');}} />
      <Dropdown items={[{id:'remove',label:'Remove',leadingIcon:<Icon name="trash-2" size={16} />}]} onChange={() => {setRemoved(true);setPanel(null);}} listHeight="auto" trigger={<Button size="sm" variant="ghost" aria-label="Contact widget options" leadingIcon={<Icon name="ellipsis" size={16} />} />} />
    </EditorWidgetToolbar>}
    {(value.showTitle || value.showLogo) && <div className="ewb-contact-widget-heading" data-alignment={value.alignment}>
      {value.showLogo && <Avatar name={value.title || 'Asset'} aria-label="Widget logo" size="sm" src={value.logoSrc} tone="muted" style={{width:32,height:32}}/>}
      {value.showTitle && <div role={editable?'textbox':undefined} aria-label="Widget title" contentEditable={editable} suppressContentEditableWarning style={{color:value.titleColor ?? 'var(--ui-text)'}} onBlur={event=>onChange({...value,title:event.currentTarget.textContent ?? ''})}>{value.title ?? 'Asset'}</div>}
    </div>}
    <div className="ewb-contact-grid" data-alignment={value.alignment} style={{ '--ewb-card-columns': value.columns ?? Math.max(1,value.contacts.length) } as CSSProperties}>
      {value.contacts.map((contact,index) => { const cardStyle=contact.design ?? value.cardStyle ?? DEFAULT_CONTACT_STYLE; return <div className="ewb-contact-slot" key={contact.id}>
        {editable && <ContactInsert index={index} label={`Add contact before ${contact.name || 'untitled contact'}`} onChoose={chooseSource} />}
        <article className="ewb-contact-card" tabIndex={editable ? 0 : undefined} aria-label={`Design ${contact.name || 'contact'}`} onClick={event => {if(editable && !(event.target as HTMLElement).closest('button,a,input,[contenteditable="true"]')){setDesignContact(contact.id);setPanel('card');setCardDesignOpen(true);}}} onKeyDown={event => {if(editable && event.target === event.currentTarget && event.key === 'Enter'){setDesignContact(contact.id);setPanel('card');setCardDesignOpen(true);}}} data-size={contact.size ?? value.size} style={{ background:cardStyle.background,...cornerRadiusStyle(cardStyle),border:`${cardStyle.border}px solid ${cardStyle.borderColor}`,boxShadow:CONTACT_SHADOWS[cardStyle.shadow] }}>
        <ContactCardContent contact={contact} size={contact.size ?? value.size} style={cardStyle} editable={editable} onChange={changes=>updateContact(contact.id,changes)} overlayHost={overlayHost} openLink={openLink} />
      </article>
        {editable && index === value.contacts.length - 1 && <ContactInsert side="after" index={value.contacts.length} label={"Add contact after " + (contact.name || 'untitled contact')} onChoose={chooseSource} />}
      </div>;})}
      {!value.contacts.length && <div className="ewb-contact-empty"><Icon name="contact" size={28} /><p>No contacts yet.</p>{editable && <Dropdown heading="Add contact from" listHeight="auto" items={[{id:'existing',label:'Existing Contact',leadingIcon:<Icon name="users" size={16} />},{id:'roles',label:'Project roles',leadingIcon:<Icon name="contact" size={16} />},{kind:'separator'},{id:'scratch',label:'Scratch',leadingIcon:<Icon name="pencil" size={16} />}]} onChange={source=>chooseSource(source as ContactSource,0)} trigger={<Button variant="neutral" size="sm">Add contact</Button>} />}</div>}
    </div>
    </div>
    {pickerDialog && createPortal(pickerDialog,overlayHost ?? document.body)}
    {removeDialog && createPortal(removeDialog,overlayHost ?? document.body)}
    {settings && (panelHost ? createPortal(settings,panelHost) : settings)}
  </div>;
}
