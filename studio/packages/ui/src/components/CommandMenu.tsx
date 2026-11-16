import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from './Dialog';
import { SearchInput } from './Input';
import { SidebarItem } from './Sidebar';
import { Icon } from './Icon';
import { Assety } from './Assety';
import './command-menu.css';

export type CommandMenuItem = { id: string; label: string; group: string; detail?: string; icon?: string; onSelect: () => void };
export type CommandMenuProps = {
  open: boolean; onClose: () => void; query: string; onQueryChange: (value: string) => void;
  /** Render the same surface in documentation without a portal or focus trap. */
  inline?: boolean;
  items: CommandMenuItem[]; placeholder?: string; ariaLabel?: string; emptyDescription?: string;
};
export function CommandMenu({ inline = false, open, onClose, query, onQueryChange, items, placeholder = 'Search or run a command', ariaLabel = 'Search library', emptyDescription = 'Try another name, an icon, or a keyword like “modal”.' }: CommandMenuProps) {
  const [active, setActive] = useState(0);
  const id = useId();
  const list = useRef<HTMLDivElement>(null);
  const signature = items.map(item => item.id).join('|');
  useEffect(() => setActive(0), [query, open, signature]);
  const selected = items[Math.min(active, Math.max(0, items.length - 1))];
  useEffect(() => {
    if (open && !inline) list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open, inline]);
  const select = (item: CommandMenuItem) => { onClose(); item.onSelect(); };
  const content = <>
    <SearchInput variant="embedded" className="ui-command-search" role="combobox" aria-label={ariaLabel}
      aria-expanded={open} aria-controls={`${id}-results`} aria-autocomplete="list" aria-activedescendant={selected ? `${id}-${selected.id}` : undefined}
      placeholder={placeholder} value={query} onChange={event => onQueryChange(event.target.value)}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (items.length) setActive(value => (value + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
        } else if (event.key === 'Enter' && selected) { event.preventDefault(); select(selected); }
      }} />
    <div className="ui-command-results" id={`${id}-results`} role="listbox" aria-label="Results" ref={list}>
      {items.map((item, index) => <div key={item.id}>
        {item.group && (index === 0 || item.group !== items[index - 1].group) && <div className="ui-command-group" aria-hidden="true">{item.group}</div>}
        <SidebarItem role="option" id={`${id}-${item.id}`} aria-selected={selected?.id === item.id} tabIndex={-1}
          className="ui-command-item" label={item.label} selected={selected?.id === item.id}
          leadingIcon={<Icon name={item.icon ?? 'component'} size={18} />}
          trailingIcon={item.detail ? <span className="ui-command-detail">{item.detail}</span> : undefined} keepTrailingVisible
          onMouseMove={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => select(item)} />
      </div>)}
    </div>
    {!items.length && <div className="ui-command-empty"><Assety variant="question" size={90} /><strong>No results found</strong><span>{emptyDescription}</span></div>}
    <span className="ui-command-status" role="status">{query ? `${items.length} results` : ''}</span>
  </>;
  if (inline) return <div className="ui-dialog ui-command-menu ui-command-preview" style={{ width: 660, maxWidth: 660 }}>{content}</div>;
  return createPortal(<Dialog open={open} onClose={onClose} ariaLabel={ariaLabel} width={660} style={{ maxWidth: 660 }} className="ui-command-menu" overlayClassName="ui-command-overlay">{content}</Dialog>, document.body);
}
