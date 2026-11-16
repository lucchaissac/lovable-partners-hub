import { useRef, useState } from 'react';
import { Avatar, Button, Dialog, DialogBody, DialogFooter, DialogHeader, Dropdown, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuItemIcon, DropdownMenuItemLabel, DropdownMenuList, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Icon, Input, Tabs, TabsList, TabsTrigger } from '@asset/ui';
import type { EditorContact } from './ContactCardContent';

export type ContactSource = 'existing' | 'roles' | 'scratch';
// Deliberately fictional data: the inventory never reads or writes the workspace directory.
export const DEMO_CONTACT_DIRECTORY: EditorContact[] = [
  { id: 'sam', name: 'Sam Taylor', title: 'Customer success', actions: [{ kind: 'Email', value: 'sam@example.com', label: '' }] },
  { id: 'jordan', name: 'Jordan Lee', title: 'Account executive', actions: [{ kind: 'Email', value: 'jordan@example.com', label: '' }] },
  { id: 'morgan', name: 'Morgan Chen', title: 'Solutions engineer', actions: [] },
  { id: 'avery', name: 'Avery Williams', title: 'Customer success manager', actions: [] },
  { id: 'riley', name: 'Riley Davis', title: 'Project manager', actions: [] },
];
export const DEMO_SAVED_CONTACTS: EditorContact[] = [
  { id: 'jane', name: 'Jane Smith', title: 'Account Manager', actions: [{ kind: 'Email', value: 'jane@example.com', label: '' }] },
  { id: 'casey', name: 'Casey Wilson', title: 'Implementation lead', actions: [] },
];
const DEMO_ROLES: EditorContact[] = ['Sales Lead', 'CS lead', 'CSM'].map((name, index) => ({ id: `role-${index}`, name, actions: [] }));

export function ContactInsert({ index, label, side = 'before', onChoose }: { index: number; label: string; side?: 'before' | 'after'; onChoose: (source: ContactSource, index: number) => void }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <div className="ewb-contact-insert" data-side={side} data-open={open || undefined} onClick={event => { if (event.target === event.currentTarget) setOpen(true); }}>
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger><Button ref={trigger} className="ewb-contact-insert-trigger" variant="primary" size="sm" aria-label={label} aria-expanded={open} onClick={event => event.stopPropagation()} leadingIcon={<Icon name="plus" size={12} />} /></DropdownMenuTrigger>
      <DropdownMenuContent role="menu" aria-label="Add contact from" width={184} align="center" onKeyDown={event => { if(event.key === 'Escape'){event.stopPropagation();setOpen(false);trigger.current?.focus();} }}>
        <DropdownMenuList><DropdownMenuLabel>Add contact from</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onChoose('existing', index)}><DropdownMenuItemIcon><Icon name="users" size={16} /></DropdownMenuItemIcon><DropdownMenuItemLabel>Existing Contact</DropdownMenuItemLabel></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChoose('roles', index)}><DropdownMenuItemIcon><Icon name="contact" size={16} /></DropdownMenuItemIcon><DropdownMenuItemLabel>Project roles</DropdownMenuItemLabel></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onChoose('scratch', index)}><DropdownMenuItemIcon><Icon name="pencil" size={16} /></DropdownMenuItemIcon><DropdownMenuItemLabel>Scratch</DropdownMenuItemLabel></DropdownMenuItem>
      </DropdownMenuList></DropdownMenuContent>
    </DropdownMenu>
  </div>;
}

export function ContactPicker({ source, savedContacts, onDeleteSaved, onAdd, onClose }: { source: Exclude<ContactSource, 'scratch'>; savedContacts: EditorContact[]; onDeleteSaved: (id: string) => void; onAdd: (contacts: EditorContact[]) => void; onClose: () => void }) {
  const [tab, setTab] = useState('users');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const contacts = source === 'roles' ? DEMO_ROLES : tab === 'users' ? DEMO_CONTACT_DIRECTORY : savedContacts;
  const shown = contacts.filter(contact => contact.name.toLocaleLowerCase('en-US').includes(query.trim().toLocaleLowerCase('en-US')));
  const chosen = contacts.filter(contact => selected.includes(contact.id));
  return <Dialog open width={448} dividers ariaLabel="Add Contact cards" className="ewb-contact-picker" data-source={source} overlayClassName="ewb-action-overlay" onClose={onClose} closeOnEscape={false} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <DialogHeader title="Add Contact cards" onClose={onClose} />
    <DialogBody>
      {source === 'existing' && <Tabs value={tab} onValueChange={value => { setTab(value); setQuery(''); setSelected([]); }} variant="underline"><TabsList aria-label="Contact source"><TabsTrigger value="users">Asset users</TabsTrigger><TabsTrigger value="saved">Previously created</TabsTrigger></TabsList></Tabs>}
      <div className="ewb-contact-picker-search"><Input aria-label="Search by name..." placeholder="Search by name..." value={query} onChange={event => setQuery(event.target.value)} trailingIcon={query ? <Button variant="ghost" size="sm" aria-label="Clear search" leadingIcon={<Icon name="x" size={14} />} onClick={() => setQuery('')} /> : <Icon name="search" size={16} />} /></div>
      <div className="ewb-contact-picker-list" role="list" aria-label={source === 'roles' ? 'Project roles' : tab === 'users' ? 'Asset users' : 'Previously created contacts'}>
        {shown.map(contact => <div key={contact.id} className="ewb-contact-picker-row" role="listitem" aria-label={contact.name}>
          <Avatar name={contact.name} src={contact.avatar} tone="muted" style={{ width: 32, height: 32 }} />
          <div className="ewb-contact-picker-person"><span>{contact.name}</span>{contact.title && <small>{contact.title}</small>}</div>
          <Button variant="ghost" size="md" className="ewb-contact-picker-select" aria-label={`${selected.includes(contact.id) ? 'Remove' : 'Add'} ${contact.name}`} onClick={() => setSelected(current => current.includes(contact.id) ? current.filter(id => id !== contact.id) : [...current, contact.id])}>{selected.includes(contact.id) ? 'Remove' : 'Add'}</Button>
          {source === 'existing' && tab === 'saved' && <Dropdown listHeight="auto" align="end" items={[{ id: 'delete', label: 'Delete', leadingIcon: <Icon name="trash-2" size={16} /> }]} onChange={() => { onDeleteSaved(contact.id); setSelected(current => current.filter(id => id !== contact.id)); }} trigger={<Button variant="ghost" size="sm" aria-label={`Contact card options for ${contact.name}`} leadingIcon={<Icon name="ellipsis" size={16} />} />} />}
        </div>)}
        {!shown.length && <div className="ewb-contact-picker-empty" role="status"><img src="/specs/editor-widgets/assety-love.png" alt="" /><strong>No contacts found</strong></div>}
      </div>
    </DialogBody>
    <DialogFooter><span className="ewb-contact-picker-count" aria-live="polite">{chosen.length} {chosen.length === 1 ? 'contact' : 'contacts'} selected</span><Button variant="neutral" onClick={onClose}>Close</Button><Button variant="primary" disabled={!chosen.length} onClick={() => onAdd(chosen)}>Add</Button></DialogFooter>
  </Dialog>;
}
