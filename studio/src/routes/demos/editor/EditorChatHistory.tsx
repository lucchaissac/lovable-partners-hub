import { useId, useRef, useState } from 'react';
import {
  Button, Dialog, DialogBody, DialogFooter, DialogHeader, DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuItemIcon, DropdownMenuItemLabel, DropdownMenuList,
  DropdownMenuSeparator, DropdownMenuTrigger, EmptyState, Icon, Input, SearchInput,
  SidebarItem, SidebarSectionHeader, Tooltip,
} from '@asset/ui';
import { editorChatTitle, type EditorChat } from './useEditorChats';
import './editor-chat-history.css';

type ChatEdit = (id: string, patch: Pick<Partial<EditorChat>, 'title' | 'pinned' | 'archived'>) => void;

function ChatMenu({ chat, busy, onEdit, onRename, onArchive }: {
  chat: EditorChat; busy: boolean; onEdit: ChatEdit; onRename: () => void; onArchive: () => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const label = editorChatTitle(chat);
  return <div className="we-chat-history-menu" data-open={open || undefined}>
    <DropdownMenu open={open} onOpenChange={next => { setOpen(next); if (!next) trigger.current?.focus({ preventScroll: true }); }}>
      <DropdownMenuTrigger><Button ref={trigger} variant="ghost" size="sm" disabled={busy} aria-label={`More options for ${label}`}
        aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} leadingIcon={<Icon name="ellipsis" size={14} />}
        onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); } }} /></DropdownMenuTrigger>
      <DropdownMenuContent id={id} role="menu" aria-label={`Options for ${label}`} width={200} align="end" onKeyDown={event => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }}><DropdownMenuList>
        <DropdownMenuItem autoFocus onClick={() => onEdit(chat.id, chat.archived ? { archived: false } : { pinned: !chat.pinned })}>
          <DropdownMenuItemIcon><Icon name={chat.archived ? 'undo-2' : 'pin'} size={16} /></DropdownMenuItemIcon>
          <DropdownMenuItemLabel>{chat.archived ? 'Restore' : chat.pinned ? 'Unpin' : 'Pin'}</DropdownMenuItemLabel>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRename}><DropdownMenuItemIcon><Icon name="pencil" size={16} /></DropdownMenuItemIcon><DropdownMenuItemLabel>Rename</DropdownMenuItemLabel></DropdownMenuItem>
        {!chat.archived && <><DropdownMenuSeparator /><DropdownMenuItem onClick={onArchive}>
          <DropdownMenuItemIcon><Icon name="archive" size={16} /></DropdownMenuItemIcon><DropdownMenuItemLabel>Archive</DropdownMenuItemLabel>
        </DropdownMenuItem></>}
      </DropdownMenuList></DropdownMenuContent>
    </DropdownMenu>
  </div>;
}

export function EditorChatHistory({ chats, activeId, busy, onSelect, onEdit }: {
  chats: EditorChat[]; activeId: string; busy: boolean; onSelect: (id: string) => void; onEdit: ChatEdit;
}) {
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState(false);
  const [renaming, setRenaming] = useState<EditorChat | null>(null);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const filtered = [...chats].sort((a, b) => b.updatedAt - a.updatedAt).filter(chat => Boolean(chat.archived) === archived &&
    [editorChatTitle(chat), ...chat.turns.flatMap(turn => [turn.text, turn.reply ?? ''])].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const renderChat = (chat: EditorChat) => <div className="we-chat-history-row" key={chat.id}>
    <SidebarItem className="we-chat-history-item" label={editorChatTitle(chat)} title={editorChatTitle(chat)}
      leadingIcon={<Icon name="message-square" size={16} />} selected={activeId === chat.id} aria-current={activeId === chat.id ? 'page' : undefined}
      disabled={busy} onClick={() => { if (chat.archived) onEdit(chat.id, { archived: false }); onSelect(chat.id); }} />
    <ChatMenu chat={chat} busy={busy} onEdit={onEdit} onRename={() => { setRenaming(chat); setName(editorChatTitle(chat)); }}
      onArchive={() => { onEdit(chat.id, { archived: true }); setNotice(chat.id); }} />
  </div>;
  return <section className="we-chat-history" id="we-chat-history" aria-label="Chat history">
    <div className="we-chat-history-search"><SearchInput aria-label="Search chats" placeholder={archived ? 'Search archived chats…' : 'Search chats…'} value={query} onChange={event => setQuery(event.target.value)} /></div>
    <div className="we-chat-history-list">
      {!archived && filtered.some(chat => chat.pinned) && <><SidebarSectionHeader title="Pinned" /><nav aria-label="Pinned chats">{filtered.filter(chat => chat.pinned).map(renderChat)}</nav></>}
      <SidebarSectionHeader title={archived ? 'Archived' : 'Recents'} trailingIcon={<Tooltip label={archived ? 'Back to recents' : 'Archived chats'}>
        <Button variant="ghost" size="sm" aria-label={archived ? 'Back to recents' : 'Archived chats'} leadingIcon={<Icon name={archived ? 'arrow-left' : 'archive'} size={14} />}
          onClick={() => { setArchived(value => !value); setQuery(''); }} /></Tooltip>} />
      <nav aria-label={archived ? 'Archived chats' : 'Recent chats'}>{filtered.filter(chat => archived || !chat.pinned).map(renderChat)}</nav>
      {!filtered.length && <EmptyState size="sm" title={query.trim() ? 'No matching chats' : archived ? 'No archived chats' : 'No chats yet'}
        description={query.trim() ? 'Try another search.' : archived ? 'Chats you archive will appear here.' : 'Start a new chat with Asset AI.'} />}
    </div>
    {notice && <div className="we-chat-history-notice" role="status"><span>Chat archived</span><Button variant="ghost" size="sm" onClick={() => { onEdit(notice, { archived: false }); setNotice(null); }}>Undo</Button>
      <Button variant="ghost" size="sm" aria-label="Dismiss" leadingIcon={<Icon name="x" size={14} />} onClick={() => setNotice(null)} /></div>}
    {renaming && <Dialog open onClose={() => setRenaming(null)} ariaLabel="Rename chat" width={420}>
      <form onSubmit={event => { event.preventDefault(); if (name.trim()) { onEdit(renaming.id, { title: name.trim() }); setRenaming(null); } }}>
        <DialogHeader title="Rename chat" onClose={() => setRenaming(null)} />
        <DialogBody><label className="we-chat-name-label">Chat name<Input autoFocus required maxLength={120} value={name} onFocus={event => event.currentTarget.select()} onChange={event => setName(event.target.value)} /></label></DialogBody>
        <DialogFooter><Button variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button><Button variant="primary" type="submit" disabled={!name.trim()}>Save</Button></DialogFooter>
      </form>
    </Dialog>}
  </section>;
}
