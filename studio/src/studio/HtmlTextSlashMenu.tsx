import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuItemIcon, DropdownMenuItemLabel, DropdownMenuLabel, DropdownMenuList, Icon } from '@asset/ui';
import { filterHtmlInsertCatalog } from './htmlInsertCatalog';
import './html-text-slash-menu.css';

/** A searchable command preview. Choosing a command intentionally does not insert content yet. */
export function HtmlTextSlashMenu({ children, editable, empty }: { children: ReactNode; editable: boolean; empty: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [anchor, setAnchor] = useState({ left: 0, top: 0 });
  const root = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null), menu = useRef<HTMLDivElement>(null);
  const caret = useRef<Range | null>(null);
  const id = useId();
  const groups = filterHtmlInsertCatalog(query).map(group => ({ ...group, items: group.items.filter(item =>
    group.label === 'Quick start' ? item.label === 'Library' : item.label !== 'Text',
  ) })).filter(group => group.items.length);
  const entries = groups.flatMap(group => group.items);
  const close = (restore = false) => {
    setOpen(false);
    if (restore) requestAnimationFrame(() => {
      const editor = root.current?.querySelector<HTMLElement>('[contenteditable=true]');
      editor?.focus({ preventScroll: true });
      if (caret.current && editor?.contains(caret.current.commonAncestorContainer)) {
        const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(caret.current);
      }
    });
  };
  const choose = (index: number) => {
    const item = entries[index]; if (!item) return;
    setAnnouncement(`${item.label} selected`);
    close(true);
  };
  useEffect(() => { if (open) input.current?.focus({ preventScroll: true }); }, [open]);
  useEffect(() => { if (!editable) setOpen(false); }, [editable]);
  useEffect(() => {
    if (open) menu.current?.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' });
  }, [open, active, query]);

  let index = 0;
  return <div ref={root} className="ewb-root hts" data-empty={empty || undefined} data-open={open || undefined} data-escape-boundary={open || undefined} style={{ '--hts-x': `${anchor.left}px`, '--hts-y': `${anchor.top}px` } as CSSProperties}
    onKeyDownCapture={event => {
      if (open || !editable || event.key !== '/' || event.metaKey || event.ctrlKey || event.nativeEvent.isComposing) return;
      const target = event.target as HTMLElement;
      if (!target.isContentEditable) return;
      const selection = window.getSelection();
      if (!selection?.rangeCount || !selection.isCollapsed || !target.contains(selection.anchorNode)) return;
      const before = selection.getRangeAt(0).cloneRange(); before.selectNodeContents(target); before.setEnd(selection.anchorNode!, selection.anchorOffset);
      if ((before.toString().split('\n').at(-1) ?? '').trim()) return;
      event.preventDefault(); event.stopPropagation();
      caret.current = selection.getRangeAt(0).cloneRange();
      const bounds = root.current!.getBoundingClientRect(), rangeBounds = caret.current.getBoundingClientRect();
      const position = rangeBounds.height ? rangeBounds : target.getBoundingClientRect();
      setAnchor({ left: Math.max(0, position.left - bounds.left), top: Math.max(0, position.top - bounds.top) });
      setQuery(''); setActive(0); setAnnouncement(''); setOpen(true);
    }}>
    {children}
    <DropdownMenu open={open} onOpenChange={value => { if (!value) close(); }}>
      {open && <div className="hts-command"><span aria-hidden="true">/</span><input ref={input} role="combobox" aria-label="Search insertion commands" aria-autocomplete="list" aria-expanded="true" aria-controls={`${id}-list`} aria-activedescendant={entries.length ? `${id}-item-${active}` : undefined}
        value={query} placeholder="Search" onChange={event => { setQuery(event.target.value); setActive(0); }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
          else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); event.stopPropagation();
            if (entries.length) setActive(value => (value + (event.key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length);
          } else if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); choose(active); }
          else if (event.key === 'Backspace' && !query) { event.preventDefault(); event.stopPropagation(); close(true); }
          else if (event.key === 'Tab') close();
        }} /></div>}
      <DropdownMenuContent className="hts-menu hcs-ui" role="presentation" side="top" fit="content" fitViewport data-escape-boundary onMouseDown={event => event.preventDefault()}>
        <DropdownMenuList ref={menu} id={`${id}-list`} role="listbox" aria-label="Insertion commands">
          {groups.map(group => <div key={group.label} role="group" aria-label={group.label}>
            <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
            {group.items.map(item => {
              const itemIndex = index++;
              return <DropdownMenuItem key={item.label} id={`${id}-item-${itemIndex}`} role="option" tabIndex={-1} aria-selected={active === itemIndex} data-highlighted={active === itemIndex || undefined} closeOnSelect={false} onMouseMove={() => setActive(itemIndex)} onClick={() => choose(itemIndex)}>
                <DropdownMenuItemIcon>{item.image ? <img src={item.image} alt="" /> : <Icon name={item.icon} size={16} />}</DropdownMenuItemIcon>
                <DropdownMenuItemLabel>{item.label}</DropdownMenuItemLabel>
              </DropdownMenuItem>;
            })}
          </div>)}
          {!entries.length && <div className="ui-dropdown-empty" role="status">No widgets found.</div>}
        </DropdownMenuList>
      </DropdownMenuContent>
    </DropdownMenu>
    <span className="hts-status" role="status">{announcement}</span>
  </div>;
}
