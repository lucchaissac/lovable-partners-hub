import {useMemo,useRef,useState,type ReactElement} from 'react';
import {Button,DropdownMenu,DropdownMenuContent,DropdownMenuTrigger,Icon,Input,Tooltip} from '@asset/ui';
import type {HtmlIconName} from './htmlEditorModel';
import {LucideGlyph} from './LucideGlyph';
import {searchLucideIcons,lucideLabel} from './lucideSearch';
import './presentation-element-design.css';

/** The compact five-column grid, with the complete searchable Lucide catalogue. */
export function HtmlIconMenu({onAdd,value,trigger:customTrigger}:{onAdd:(name:HtmlIconName)=>void;value?:HtmlIconName;trigger?:ReactElement<{onClick?:()=>void;active?:boolean}>}) {
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');
 const content=useRef<HTMLDivElement>(null),trigger=useRef<HTMLDivElement>(null),search=useRef<HTMLInputElement>(null),grid=useRef<HTMLDivElement>(null);
 const names=useMemo(()=>searchLucideIcons(query),[query]);
 const close=()=>{setOpen(false);requestAnimationFrame(()=>trigger.current?.querySelector('button')?.focus({preventScroll:true}));};
 const toggle=(next:boolean)=>{setOpen(next);if(next){setQuery('');requestAnimationFrame(()=>search.current?.focus({preventScroll:true}));}};
 return <div ref={trigger}><DropdownMenu open={open} onOpenChange={toggle}>
  <Tooltip label={customTrigger?'Change icon':'Icons'} side="bottom"><span className="studio-insert-tool"><DropdownMenuTrigger>{customTrigger??<Button variant="ghost" aria-label="Add icon" aria-haspopup="dialog" aria-expanded={open} leadingIcon={<Icon name="smile" size={16}/>} onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();toggle(true);}}}/>}</DropdownMenuTrigger></span></Tooltip>
  <DropdownMenuContent ref={content} fit="content" fitViewport align="center" className="studio-shape-menu studio-icon-menu" role="dialog" aria-label="Lucide icons" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}}}>
   <Input ref={search} inputSize="sm" aria-label="Search Lucide icons" placeholder="Search icons" leadingIcon={<Icon name="search" size={14}/>} value={query} onChange={event=>{setQuery(event.target.value);if(grid.current)grid.current.scrollTop=0;}} onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();grid.current?.querySelector<HTMLButtonElement>('button')?.focus();}}}/>
   <div ref={grid} className="studio-icon-grid" role="group" aria-label="Icon results" onKeyDown={event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();
    const items=Array.from(grid.current?.querySelectorAll<HTMLButtonElement>('button')??[]),index=items.indexOf(document.activeElement as HTMLButtonElement);
    const delta=event.key==='ArrowUp'?-5:event.key==='ArrowDown'?5:event.key==='ArrowLeft'?-1:1;
    const next=event.key==='Home'?0:event.key==='End'?items.length-1:Math.max(0,Math.min(items.length-1,index+delta));
    items[next]?.focus();
   }}>
    {names.map((name,index)=><Button key={name} variant="ghost" tabIndex={index===0?0:-1} aria-label={lucideLabel(name)} title={lucideLabel(name)} active={name===value} leadingIcon={<LucideGlyph name={name}/>} onClick={()=>{onAdd(name);close();}}/>)}
   </div>
   {!names.length&&<p className="studio-icon-empty" role="status">No icons found.</p>}
  </DropdownMenuContent>
 </DropdownMenu></div>;
}
