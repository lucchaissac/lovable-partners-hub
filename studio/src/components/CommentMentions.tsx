import { useId, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Avatar, Button, Composer, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuItemAvatar, DropdownMenuItemLabel, Icon, Tooltip } from '@asset/ui';
import './comment-mentions.css';

export type CommentMember = { id: string; name: string; handle: string };
type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string; onChange: (value: string) => void; members: CommentMember[]; mention?: string;
  onSend?: () => void; pending?: boolean; trailing?: ReactNode; sendLabel?: string;
};

export function CommentMentionInput({ value, onChange, members, mention, onSend, pending, trailing, sendLabel, onKeyDown, onSelect, rows, ...props }: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<{ start: number; end: number; text: string } | null>(null);
  const [active, setActive] = useState(0);
  const listId = useId();
  const options = members.filter(member => `${member.name} ${member.handle}`.toLowerCase().includes(query?.text.toLowerCase() || '')).slice(0, 8);
  const locate = (text: string, caret: number) => {
    const match = /(?:^|\s)@([\w.-]*)$/.exec(text.slice(0, caret));
    setQuery(match ? { start: caret - match[1].length - 1, end: caret, text: match[1] } : null); setActive(0);
  };
  const choose = (member: CommentMember) => {
    const start = query?.start ?? input.current?.selectionStart ?? value.length;
    const end = query?.end ?? input.current?.selectionEnd ?? start;
    const text = `@${member.handle} `;
    onChange(value.slice(0, start) + text + value.slice(end)); setQuery(null);
    requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(start + text.length, start + text.length); });
  };
  const handleKey: TextareaHTMLAttributes<HTMLTextAreaElement>['onKeyDown'] = event => {
    if (query && !event.nativeEvent.isComposing) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setQuery(null); return; }
      if (options.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setActive(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length); return; }
      if (options[active] && ['Enter', 'Tab'].includes(event.key)) { event.preventDefault(); choose(options[active]); return; }
    }
    onKeyDown?.(event);
  };
  const inputProps = {
    ...props,
    'aria-autocomplete': 'list' as const,
    'aria-controls': query ? listId : undefined,
    'aria-activedescendant': query && options[active] ? `${listId}-${active}` : undefined,
    onSelect,
    onKeyDown: handleKey,
  };
  const trigger = <Tooltip label="Mention a teammate"><Button className="comment-mention-trigger" size="sm" variant="ghost" disabled={props.disabled} aria-label="Mention a teammate" leadingIcon={<Icon name="at-sign" size={16} />} onClick={() => {
    const caret = input.current?.selectionStart ?? value.length;
    setQuery({ start: caret, end: input.current?.selectionEnd ?? caret, text: '' }); setActive(0); input.current?.focus();
  }} /></Tooltip>;
  return <div className="comment-mention-input" data-composer={onSend ? '' : undefined}>
    <DropdownMenu open={!!query} onOpenChange={open => { if (!open) setQuery(null); }}>
      {mention && <span className="we-review-comment-mention">{mention}</span>}
      {onSend ? <Composer ref={input} value={value} onChange={next => { onChange(next); locate(next, input.current?.selectionStart ?? next.length); }}
        onSend={onSend} pending={pending} disabled={props.disabled} placeholder={props.placeholder} leading={trigger} trailing={trailing}
        submitOnEnter={false} sendLabel={sendLabel} textareaProps={inputProps} /> : <textarea {...inputProps} ref={input} rows={rows} value={value}
        onChange={event => { onChange(event.target.value); locate(event.target.value, event.target.selectionStart); }} />}
      <DropdownMenuContent side="top" width={280} fit={false} className="comment-mention-menu" role="listbox" id={listId} aria-label="Asset teammates" onMouseDown={event => event.preventDefault()}>
        {options.length ? options.map((member, index) => <DropdownMenuItem key={member.id} id={`${listId}-${index}`} role="option" aria-selected={index === active} onClick={() => choose(member)}>
          <DropdownMenuItemAvatar><Avatar name={member.name} size="sm" /></DropdownMenuItemAvatar><DropdownMenuItemLabel><span>{member.name.charAt(0).toLocaleUpperCase() + member.name.slice(1)}</span><small>@{member.handle}</small></DropdownMenuItemLabel>
        </DropdownMenuItem>) : <p className="comment-mention-empty">{members.length ? 'No teammates found' : 'Teammates appear after signing in to Studio.'}</p>}
      </DropdownMenuContent>
    </DropdownMenu>
    {!onSend && trigger}
  </div>;
}

export function CommentBody({ body, members = [] }: { body: string; members?: CommentMember[] }) {
  const byHandle = new Map(members.map(member => [member.handle.toLowerCase(), member]));
  return <>{body.split(/(@[\w.-]+)/g).map((part, index) => {
    const member = part.startsWith('@') ? byHandle.get(part.slice(1).toLowerCase()) : undefined;
    return member ? <span className="comment-person-mention" key={index} title={member.name}>@{member.handle}</span> : part;
  })}</>;
}
