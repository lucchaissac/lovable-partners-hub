import { useId, useRef, useState } from 'react';
import {
  Button, Dialog, DialogBody, DialogFooter, DialogHeader, DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuItemIcon, DropdownMenuItemLabel, DropdownMenuList,
  DropdownMenuTrigger, Icon, Input,
} from '@asset/ui';
import { editorChatTitle, type EditorChat } from './useEditorChats';

export function EditorChatTitle({ chat, busy, onEdit, onDelete, onRestore }: {
  chat: EditorChat;
  busy: boolean;
  onEdit: (id: string, patch: Pick<Partial<EditorChat>, 'title' | 'minimalThinking'>) => void;
  onDelete: (id: string) => void;
  onRestore: (chat: EditorChat) => void;
}) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [deleted, setDeleted] = useState<EditorChat | null>(null);
  const [notice, setNotice] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const title = editorChatTitle(chat);
  return <>
    <div className="we-chat-title-menu">
      <DropdownMenu open={open} onOpenChange={next => { setOpen(next); if (!next) trigger.current?.focus({ preventScroll: true }); }}>
        <DropdownMenuTrigger><Button ref={trigger} className="we-chat-title-trigger" variant="ghost"
          aria-label={`Chat options: ${title}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
          title={title} trailingIcon={<Icon name="chevron-down" size={14} />}
          onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); } }}>
          {title}
        </Button></DropdownMenuTrigger>
        <DropdownMenuContent id={menuId} className="we-chat-title-options" role="menu" aria-label="Chat options" width={232}
          onKeyDown={event => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)'));
            const index = items.indexOf(document.activeElement as HTMLButtonElement);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
            items[next]?.focus();
          }}>
          <DropdownMenuList>
            <DropdownMenuItem autoFocus closeOnSelect={false} role="menuitemcheckbox" aria-checked={!!chat.minimalThinking}
              className="we-chat-thinking" disabled={busy} onClick={() => onEdit(chat.id, { minimalThinking: !chat.minimalThinking })}>
              <DropdownMenuItemLabel>Minimal thinking</DropdownMenuItemLabel>
              <span aria-hidden="true" className="ui-switch" data-size="sm" data-state={chat.minimalThinking ? 'on' : 'off'}><span className="ui-switch-thumb" /></span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={busy} onClick={() => { setName(title); setRenaming(true); }}><DropdownMenuItemIcon><Icon name="pencil" size={16} /></DropdownMenuItemIcon><DropdownMenuItemLabel>Edit title</DropdownMenuItemLabel></DropdownMenuItem>
            <DropdownMenuItem onClick={async () => { try { await navigator.clipboard.writeText(chat.id); setNotice('Chat ID copied'); } catch { setNotice('Could not copy chat ID'); } }}><DropdownMenuItemIcon><Icon name="copy" size={16} /></DropdownMenuItemIcon><DropdownMenuItemLabel>Copy chat ID</DropdownMenuItemLabel></DropdownMenuItem>
            <DropdownMenuItem className="we-chat-delete" disabled={busy} onClick={() => { setDeleted(chat); onDelete(chat.id); setNotice('Chat deleted'); }}><DropdownMenuItemIcon><Icon name="trash-2" size={16} /></DropdownMenuItemIcon><DropdownMenuItemLabel>Delete chat</DropdownMenuItemLabel></DropdownMenuItem>
          </DropdownMenuList>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    {renaming && <Dialog open onClose={() => setRenaming(false)} ariaLabel="Edit chat title" width={420}>
      <form onSubmit={event => { event.preventDefault(); if (name.trim()) { onEdit(chat.id, { title: name.trim() }); setRenaming(false); requestAnimationFrame(() => trigger.current?.focus()); } }}>
        <DialogHeader title="Edit title" onClose={() => setRenaming(false)} />
        <DialogBody><label className="we-chat-name-label">Chat title<Input autoFocus required maxLength={120} value={name} onFocus={event => event.currentTarget.select()} onChange={event => setName(event.target.value)} /></label></DialogBody>
        <DialogFooter><Button variant="ghost" onClick={() => setRenaming(false)}>Cancel</Button><Button variant="primary" type="submit" disabled={!name.trim()}>Save</Button></DialogFooter>
      </form>
    </Dialog>}
    {notice && <div className="we-chat-title-notice" role="status"><span>{notice}</span>
      {notice === 'Chat deleted' && deleted && <Button variant="ghost" size="sm" onClick={() => { onRestore(deleted); setDeleted(null); setNotice('Chat restored'); }}>Undo</Button>}
      <Button variant="ghost" size="sm" aria-label="Dismiss notification" leadingIcon={<Icon name="x" size={14} />} onClick={() => setNotice('')} />
    </div>}
  </>;
}
