import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ComponentProps } from 'react';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Icon, Input } from '@asset/ui';
import { referenceIcons } from './ReferenceIcons';
import { integrations } from './integrations';
import section from './assets/section.svg';
import library from './assets/libary.svg';
import template from './assets/template.svg';
import slides from './assets/slide.svg';
import ai from './assets/ai.svg';
import './widget-dropdown.css';

export const meta = { title: 'Widget dropdown' };

type Item = { label: string; tone?: string; icon?: string; image?: string };
const basics: Item[] = ['Text', 'Image', 'PDF', 'File', 'Link', 'Video', 'Embed', 'Toggle list', 'Code block'].map(label => ({ label }));
const widgets: Item[][] = [
  [
    { label: 'Table of contents', tone: 'gold' }, { label: 'Slides', tone: 'slides' },
    { label: 'Contact cards', tone: 'gold' }, { label: 'Table', tone: 'gold' },
    { label: 'CTA', tone: 'gold' }, { label: 'Forms', tone: 'pink' },
    { label: 'Tutor', tone: 'purple', icon: 'lightbulb' },
    { label: 'Roleplay', tone: 'purple', icon: 'drama' },
    { label: 'Courses', tone: 'blue' },
    { label: 'Security profile', tone: 'blue' }, { label: 'iFrame', tone: 'blue' },
  ],
  [
    { label: 'AI widget', tone: 'purple' }, { label: 'Price cards', tone: 'green' },
    { label: 'Sales quote', tone: 'green' }, { label: 'Checklist', tone: 'teal' },
    { label: 'Timeline', tone: 'teal' }, { label: 'Project plan', tone: 'teal' },
    { label: 'Kanban', tone: 'teal' }, { label: 'Plan template', tone: 'teal' },
    { label: 'File manager', tone: 'teal' }, { label: 'Library list', tone: 'teal' },
  ],
];
const quickStart = [
  { label: 'Section', image: section, tone: 'section' },
  { label: 'Library', image: library, tone: 'library' },
  { label: 'Templates', image: template, tone: 'templates' },
  { label: 'Slides', image: slides, tone: 'slides' },
  { label: 'AI Agents', image: ai, tone: 'ai' },
];

function WidgetItem({ item, onSelect }: { item: Item; onSelect: (label: string) => void }) {
  return <DropdownMenuItem className="wd-item" onClick={() => onSelect(item.label)}>
    <span className="wd-item-icon" data-tone={item.tone ?? 'neutral'} data-brand={item.image || item.label === 'Typeform' ? true : undefined} aria-hidden="true">
      {item.image ? <img src={item.image} alt="" /> : item.icon ? <Icon name={item.icon} size={14} strokeWidth={1.7} /> : referenceIcons[item.label]}
    </span>
    <span className="wd-item-label"><span>{item.label}</span></span>
  </DropdownMenuItem>;
}

export default function WidgetDropdownProto() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  // Open after the dropdown trigger ref is attached so its first position is correct.
  useLayoutEffect(() => setOpen(true), []);
  const normalizedQuery = query.trim().toLowerCase();
  const results: Item[] = [...basics, ...widgets.flat(), ...integrations.flatMap(group => group.items)]
    .filter(item => item.label.toLowerCase().includes(normalizedQuery));

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) { setQuery(''); setExpanded(false); }
    else trigger.current?.focus();
  }

  function navigateMenu(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); changeOpen(false); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const inSearch = event.target instanceof HTMLInputElement;
    if (inSearch && (event.key === 'Home' || event.key === 'End')) return;
    const items = Array.from(content.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
    if (!items.length) return;
    event.preventDefault();
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : event.key === 'ArrowDown' ? (index + 1) % items.length : (index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length);
    items[next].focus();
  }

  return <div className="wd-stage">
    <div className="wd-anchor">
      <DropdownMenu open={open} onOpenChange={changeOpen}>
        <DropdownMenuTrigger>
          <Button ref={trigger} className="wd-trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls="widget-dropdown">Add section</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent ref={content} id="widget-dropdown" role="dialog" aria-label="Widgets and integrations"
          className="wd-menu" width="min(642px, calc(100vw - 32px))" onKeyDown={navigateMenu}>
          <Input autoFocus className="wd-search" aria-label="Search widgets and integrations" placeholder="Search widgets and integrations..."
            value={query} onChange={event => setQuery(event.target.value)} leadingIcon={<Icon name="search" size={16} strokeWidth={1} />} />
          <div className="wd-body">
            {normalizedQuery ? <div className="wd-results" role="menu" aria-label="Search results">
              {results.map(item => <WidgetItem key={item.label} item={item} onSelect={setSelected} />)}
              {!results.length && <p className="wd-empty" role="status">No widgets found.</p>}
            </div> : <>
              <section aria-labelledby="wd-quick-title">
                <h2 id="wd-quick-title">Quick start</h2>
                <div className="wd-quick" role="menu" aria-label="Quick start">
                  {quickStart.map(item => <DropdownMenuItem key={item.label} className="wd-quick-card" data-tone={item.tone} onClick={() => setSelected(item.label)}>
                    <img src={item.image} alt="" /><span>{item.label}</span>
                  </DropdownMenuItem>)}
                </div>
              </section>
              <div className="wd-catalog">
                <section className="wd-basic" aria-labelledby="wd-basic-title">
                  <h2 id="wd-basic-title">Basic Blocks</h2>
                  <div role="menu" aria-label="Basic blocks">{basics.map(item => <WidgetItem key={item.label} item={item} onSelect={setSelected} />)}</div>
                </section>
                <section className="wd-widgets" aria-labelledby="wd-widgets-title">
                  <h2 id="wd-widgets-title">Widgets</h2>
                  <div className="wd-widget-columns">{widgets.map((column, index) => <div key={index} role="menu" aria-label={`Widgets ${index + 1}`}>
                    {column.map(item => <WidgetItem key={item.label} item={item} onSelect={setSelected} />)}
                  </div>)}</div>
                </section>
              </div>
              {expanded ? <div className="wd-integrations">{integrations.map(group => <section key={group.title}>
                <h2>{group.title}</h2><div role="menu" aria-label={group.title}>
                  {group.items.map(item => <WidgetItem key={item.label} item={item} onSelect={setSelected} />)}
                </div>
              </section>)}</div> : <Button className="wd-show-all" onClick={() => setExpanded(true)}>Show all options</Button>}
            </>}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <span className="wd-status" role="status">{selected ? `${selected} selected` : ''}</span>
  </div>;
}

export function WidgetInsertMenu({ trigger: triggerElement, open, onOpenChange, onSelect, available, side = 'bottom', align = 'start' }: {
  trigger: ComponentProps<typeof DropdownMenuTrigger>['children']; open: boolean; onOpenChange: (open: boolean) => void;
  onSelect: (label: string) => void; available?: readonly string[]; side?: 'top' | 'bottom'; align?: 'start' | 'center' | 'end';
}) {
  const menuId = useId();
  const allowed = (item: Item) => !available || available.includes(item.label);
  const menuBasics = [...basics, ...(available?.includes('Divider') ? [{ label: 'Divider', icon: 'minus' }] : [])].filter(allowed);
  const menuWidgets = widgets.map(column => column.filter(allowed));
  if (available?.includes('Synced section')) menuWidgets[1].push({ label: 'Synced section', icon: 'link', tone: 'purple' });
  const quick = quickStart.filter(allowed);
  const integrationGroups = integrations.map(group => ({ ...group, items: group.items.filter(allowed) })).filter(group => group.items.length);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const results: Item[] = [...menuBasics, ...menuWidgets.flat(), ...quick, ...integrationGroups.flatMap(group => group.items)]
    .filter((item, index, all) => all.findIndex(other => other.label === item.label) === index && item.label.toLowerCase().includes(normalizedQuery));

  useLayoutEffect(() => {
    if (!open) return;
    setQuery(''); setExpanded(false);
    const frame = requestAnimationFrame(() => content.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const select = (label: string) => { onOpenChange(false); onSelect(label); };

  function changeOpen(next: boolean) {
    onOpenChange(next);
    if (next) { setQuery(''); setExpanded(false); }

  }

  function navigateMenu(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); changeOpen(false); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const inSearch = event.target instanceof HTMLInputElement;
    if (inSearch && (event.key === 'Home' || event.key === 'End')) return;
    const items = Array.from(content.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
    if (!items.length) return;
    event.preventDefault();
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : event.key === 'ArrowDown' ? (index + 1) % items.length : (index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length);
    items[next].focus();
  }

  return <DropdownMenu open={open} onOpenChange={changeOpen}>
        <DropdownMenuTrigger>{triggerElement}</DropdownMenuTrigger>
        <DropdownMenuContent ref={content} id={menuId} side={side} align={align} role="dialog" aria-label="Widgets and integrations"
          className="wd-menu" data-compact={!!available && available.length < 12 || undefined} width={available && available.length < 12 ? "min(440px, calc(100vw - 32px))" : "min(642px, calc(100vw - 32px))"} onKeyDown={navigateMenu}>
          <Input className="wd-search" aria-label="Search widgets and integrations" placeholder="Search widgets and integrations..."
            value={query} onChange={event => setQuery(event.target.value)} leadingIcon={<Icon name="search" size={16} strokeWidth={1} />} />
          <div className="wd-body">
            {normalizedQuery ? <div className="wd-results" role="menu" aria-label="Search results">
              {results.map(item => <WidgetItem key={item.label} item={item} onSelect={select} />)}
              {!results.length && <p className="wd-empty" role="status">No widgets found.</p>}
            </div> : <>
              {quick.length > 0 && <section aria-label="Quick start">
                <h2>Quick start</h2>
                <div className="wd-quick" role="menu" aria-label="Quick start">
                  {quick.map(item => <DropdownMenuItem key={item.label} className="wd-quick-card" data-tone={item.tone} onClick={() => select(item.label)}>
                    <img src={item.image} alt="" /><span>{item.label}</span>
                  </DropdownMenuItem>)}
                </div>
              </section>}
              <div className="wd-catalog">
                <section className="wd-basic" aria-label="Basic blocks">
                  <h2 >Basic Blocks</h2>
                  <div role="menu" aria-label="Basic blocks">{menuBasics.map(item => <WidgetItem key={item.label} item={item} onSelect={select} />)}</div>
                </section>
                <section className="wd-widgets" aria-label="Widgets">
                  <h2 >Widgets</h2>
                  <div className="wd-widget-columns">{menuWidgets.filter(column => column.length).map((column, index) => <div key={index} role="menu" aria-label={`Widgets ${index + 1}`}>
                    {column.map(item => <WidgetItem key={item.label} item={item} onSelect={select} />)}
                  </div>)}</div>
                </section>
              </div>
              {integrationGroups.length > 0 && (expanded ? <div className="wd-integrations">{integrationGroups.map(group => <section key={group.title}>
                <h2>{group.title}</h2><div role="menu" aria-label={group.title}>
                  {group.items.map(item => <WidgetItem key={item.label} item={item} onSelect={select} />)}
                </div>
              </section>)}</div> : <Button className="wd-show-all" onClick={() => setExpanded(true)}>Show all options</Button>)}
            </>}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>;
}
