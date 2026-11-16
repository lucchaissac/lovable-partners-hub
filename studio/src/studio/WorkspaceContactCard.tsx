import { useCallback, useContext, useState } from 'react';
import { EditorContactCards, type EditorContactsValue } from '../components/editor-widgets';
import { DEFAULT_CONTACT_STYLE } from '../components/editor-widgets/ContactCardDesign';
import { WorkspaceEditingContext } from './WorkspaceAssets';
import { useWorkspaceInteraction } from './WorkspaceInteraction';
import { useWorkspaceWidgetHost } from './WorkspaceWidgetHost';
import { useWorkspaceWidgetWidth } from './WorkspaceWidgetWidth';
import { contactCardSchema, editorContactsSchema, resolvedContactCard, type ContactCardValue } from './workspaceWidgets';
import './workspace-widgets.css';

type Props = { id: string; name: string } & Partial<Omit<ContactCardValue, 'name'>>;

export function contactInventory(value: ContactCardValue, ramp: boolean): EditorContactsValue {
  const style = DEFAULT_CONTACT_STYLE;
  return {size:value.layout==='horizontal'?'small':'big',alignment:'left',
    widgetStyle:{background:'transparent',radius:0,border:0,borderColor:'transparent',shadow:'none'},
    cardStyle:ramp?{...style,background:'var(--ramp-soft, #f4f3f0)',borderColor:'var(--ramp-border, #d9d7d2)',name:{...style.name,color:'var(--ramp-text, #171714)'},title:{...style.title,color:'var(--ramp-muted, #6b6b65)'},button:{...style.button,background:'var(--ramp-dark, #252521)',radius:8}}:style,
    contacts:[{id:'primary',name:value.name,title:[value.role,value.company].filter(Boolean).join(' · '),description:value.description || undefined,actions:[
      ...(value.email?[{kind:'Email' as const,value:value.email,label:value.email}]:[]),
      ...(value.phone?[{kind:'Phone' as const,value:value.phone,label:value.phone}]:[]),
      ...(value.website?[{kind:'Website' as const,value:value.website,label:new URL(value.website).hostname}]:[]),
      ...(value.actionUrl?[{kind:'Calendar' as const,value:value.actionUrl,label:value.actionLabel}]:[]),
    ]}],
  };
}

/** The inventory widget, persisted in the prototype's own revision model. */
export function WorkspaceContactCard({id,...props}: Props) {
  const editing = useContext(WorkspaceEditingContext);
  const host = useWorkspaceWidgetHost();
  const interaction = useWorkspaceInteraction();
  const parsed = contactCardSchema.safeParse(props);
  const original = parsed.success?parsed.data:contactCardSchema.parse({name:props.name?.trim()?.slice(0,100)||'Contact'});
  const edit = resolvedContactCard(original,editing.widgets?.[id]);
  const value = edit.inventory ?? contactInventory(edit.value,!!editing.ramp);
  const canEdit = !!editing.onEdit && !!editing.ramp && /^[a-zA-Z0-9-]{1,80}$/.test(id);
  const selected = interaction.selected?.getAttribute('data-workspace-widget')===id;
  const resize = useWorkspaceWidgetWidth({width:edit.width ?? (edit.fullWidth?100:undefined),enabled:canEdit && !edit.hidden && editing.design?.layout!=='document',selected,onChange:width=>editing.onEdit?.({type:'widget',id,value:{...edit,inventory:value,width,fullWidth:undefined}})});
  const [error,setError] = useState('');
  const onPanelChange = useCallback((panel:'card'|'widget'|null)=>host.panelChanged(id,!!panel),[host.panelChanged,id]);
  const save = (inventory:EditorContactsValue) => {
    const parsed = editorContactsSchema.safeParse(inventory);
    if(!parsed.success){setError(parsed.error.issues[0]?.message||'Check the contact details.');return;}
    setError(''); editing.onEdit?.({type:'widget',id,value:{...edit,inventory:parsed.data}});
  };
  if(editing.ramp && editing.design?.layout==='document') return edit.hidden?null:<div className="workspace-document-contacts" data-workspace-widget={id}>{value.contacts.map(contact=><section key={contact.id}>
    <strong contentEditable={canEdit} suppressContentEditableWarning aria-label={`Contact name ${contact.id}`} onBlur={event=>save({...value,contacts:value.contacts.map(item=>item.id===contact.id?{...item,name:event.currentTarget.textContent||''}:item)})}>{contact.name}</strong>
    {contact.title && <p>{contact.title}</p>}{contact.description && <p>{contact.description}</p>}
    {contact.actions?.map(action=><p key={action.kind}>{action.label && action.label!==action.value ? `${action.label}: ` : ''}{action.value}</p>)}
  </section>)}</div>;
  return <div ref={resize.ref} style={resize.style} className="workspace-inventory-contact ewb-root" data-resized={resize.resized || undefined} data-workspace-widget={id} data-workspace-tools="contact" data-selected={selected || undefined}>
    <EditorContactCards value={value} onChange={save} editable={canEdit} showSectionTitle={false} showRemovalNotice={false} hidden={edit.hidden ?? false} onHiddenChange={hidden=>{editing.onEdit?.({type:'widget',id,value:{...edit,inventory:value,hidden}});if(hidden)interaction.clear();}} panelHost={host.panelHost} active={host.activeId===undefined || host.activeId===id} onPanelChange={onPanelChange} openLink={editing.openLink}/>
    {resize.handle}
    {error && <p role="alert">{error}</p>}
  </div>;
}

WorkspaceContactCard.workspaceWidget = true;
