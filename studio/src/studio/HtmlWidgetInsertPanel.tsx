import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button, Dropdown, DropdownMenu, DropdownMenuContent, Icon, Input, Tooltip } from '@asset/ui';
import { filterHtmlInsertCatalog, htmlInsertCategories, type HtmlInsertCatalogItem } from './htmlInsertCatalog';
import './html-widget-insert-panel.css';

/** Use one simple icon per card, retaining the existing integration logos. */
function WidgetPreview({ icon, image }: HtmlInsertCatalogItem) {
  return image ? <img className="hwi-icon" src={image} alt="" /> : <Icon name={icon} size={24} />;
}

type CatalogProps = { available: readonly string[]; onSelect: (label: string) => void; autoFocus?: boolean };
export function HtmlWidgetInsertCatalog({available,onSelect,autoFocus=true}:CatalogProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const body = useRef<HTMLDivElement>(null);
  const filtered = filterHtmlInsertCatalog(query, category);
  useEffect(() => { body.current?.scrollTo({ top: 0 }); }, [query, category]);
  return <div className="hwi-catalog">
    <div className="hwi-controls">
      <div className="hwi-search"><Input autoFocus={autoFocus} aria-label="Search widgets and integrations" placeholder="Search widgets and integrations…" leadingIcon={<Icon name="search" size={16} />} value={query} onChange={event => setQuery(event.target.value)} /></div>
      <Dropdown align="end" fitViewport value={category} items={htmlInsertCategories.map(({ id, label }) => ({ id, label }))} onChange={value => { setCategory(value); setQuery(''); }} trigger={<Button className="hwi-category" variant="ghost" size="sm" aria-label="Browse widget categories" title={htmlInsertCategories.find(item => item.id === category)?.label} active={category !== 'all'} leadingIcon={<Icon name="list-filter" size={16} />} />} />
    </div>
    <div className="hwi-body" ref={body}>
      {filtered.map(group => <section key={group.label} aria-label={group.label}><h2>{group.label}</h2><div className="hwi-grid">
        {group.items.map(item => {
          const supported = available.includes(item.label);
          return <button key={item.label} type="button" className="hwi-card" aria-label={supported ? `Insert ${item.label}` : item.label} disabled={!supported} onClick={() => onSelect(item.label)}>
            <span className="hwi-preview" aria-hidden="true"><WidgetPreview {...item} /></span><span className="hwi-label">{item.label}</span>
          </button>;
        })}
      </div></section>)}
      {!filtered.length && <p className="hwi-empty" role="status">No widgets found.</p>}
    </div>
  </div>;
}

export function HtmlWidgetInsertPanel({onClose,...catalog}:CatalogProps&{onClose:()=>void}) {
  return <aside id="html-insert-widgets" className="hwi-panel hcs-ui" aria-label="Insert widget" onKeyDown={event=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();event.stopPropagation();onClose();}}}>
    <header className="we-panel-header"><strong>Insert widget</strong><Tooltip label="Close widgets" side="bottom"><Button variant="ghost" size="sm" aria-label="Close widgets" leadingIcon={<Icon name="panel-right" size={16}/>} onClick={onClose}/></Tooltip></header>
    <HtmlWidgetInsertCatalog {...catalog}/>
  </aside>;
}

/** The same catalog, anchored to the plus that supplies its insertion destination. */
export function HtmlWidgetInsertPopover({anchor,onClose,...catalog}:CatalogProps&{anchor:HTMLElement;onClose:()=>void}) {
  const anchorRef=useRef<HTMLElement|null>(anchor);anchorRef.current=anchor;
  const [height,setHeight]=useState(480);
  useLayoutEffect(()=>{
    const update=()=>{if(!anchor.isConnected){onClose();return;}const r=anchor.getBoundingClientRect();setHeight(Math.max(100,Math.min(480,Math.max(r.top,innerHeight-r.bottom)-16)));};
    update();window.addEventListener('resize',update);window.addEventListener('scroll',update,true);
    return()=>{window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);};
  },[anchor]);
  return <DropdownMenu open anchorRef={anchorRef} onOpenChange={open=>{if(!open)onClose();}}>
    <DropdownMenuContent className="hwi-panel hwi-popover hcs-ui" role="dialog" aria-label="Insert content" side="bottom" align="center" fitViewport width="min(384px, calc(100vw - 16px))" style={{width:'min(384px, calc(100vw - 16px))',height:'auto',maxHeight:height}}>
      <HtmlWidgetInsertCatalog {...catalog}/>
    </DropdownMenuContent>
  </DropdownMenu>;
}
