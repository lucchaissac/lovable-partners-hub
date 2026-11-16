import { WorkspaceEditingContext } from './WorkspaceAssets';
import {useContext,useEffect,useLayoutEffect,useRef,useState,type RefObject,type DragEvent,type CSSProperties} from 'react';
import {Button,Dialog,DialogBody,DialogFooter,DialogHeader,Dropdown,Icon,Tooltip} from '@asset/ui';
import {htmlSectionSchema,type HtmlPage,type HtmlSection} from './htmlEditorModel';
import {workspaceWidgetsSchema} from './workspaceWidgets';
import type {z} from 'zod';
import './html-section-navigation.css';

type Widgets=z.infer<typeof workspaceWidgetsSchema>;
type Template={section:HtmlSection;widgets:Widgets};
const templateKey='asset-html-section-templates-v1';
const icon=(name:string)=><Icon name={name} size={16}/>;
const separator={kind:'separator' as const};
function templates():Template[]{try{return JSON.parse(localStorage.getItem(templateKey)||'[]').slice(0,20).map((t:Template)=>({section:htmlSectionSchema.parse(t.section),widgets:workspaceWidgetsSchema.parse(t.widgets)}));}catch{return [];}}
export function workspaceLocation(){try{return new URL(window.parent.location.href);}catch{return new URL(window.location.href);}}

export function HtmlSectionNavigation({root,page,pages,editable,shared,selectedIds,widgets,onNavigate,onAction,onPatch,onReorder,onMove,onAdd}:{
 root:RefObject<HTMLDivElement|null>;page:HtmlPage;pages:HtmlPage[];editable:boolean;shared:boolean;selectedIds:string[];widgets?:Widgets;
 onNavigate:(id:string,range?:boolean,toggle?:boolean)=>void;onAction:(action:string,section:HtmlSection)=>void;
 onPatch:(id:string,patch:Partial<HtmlSection>)=>void;onReorder:(id:string,target:string,after:boolean)=>void;
 onMove:(id:string,pageId:string)=>void;onAdd:(template?:Template)=>void;
}){
 const design=useContext(WorkspaceEditingContext).design?.sectionNavigation||{};
 const outline=useRef<HTMLElement>(null);
 const [autoExpanded,setAutoExpanded]=useState(false);
 const [active,setActive]=useState(page.sections[0]?.id||''),[height,setHeight]=useState(500);
 const [dragged,setDragged]=useState(''),[drop,setDrop]=useState<{id:string;after:boolean}>();
 const [dialog,setDialog]=useState<{kind:string;section?:HtmlSection}>(),[saved,setSaved]=useState(templates),[notice,setNotice]=useState('');
 const sections=shared?page.sections.filter(s=>!s.hidden&&!s.navigationHidden):page.sections;
 useLayoutEffect(()=>{
  const scroll=root.current?.closest('.studio-workspace-scroll');if(!scroll)return;
  let pending=0;
  const probe=outline.current?.cloneNode(true) as HTMLElement|undefined;
  let expandedWidth=0,expandedHeight=0;
  if(probe){probe.setAttribute('data-auto-expanded','');probe.setAttribute('aria-hidden','true');probe.inert=true;Object.assign(probe.style,{position:'fixed',left:'-10000px',top:'0',maxWidth:'none',maxHeight:'none',visibility:'hidden'});root.current!.appendChild(probe);expandedWidth=probe.getBoundingClientRect().width;expandedHeight=probe.getBoundingClientRect().height;probe.remove();}

  const measure=()=>{pending=0;const viewport=scroll.getBoundingClientRect(),header=root.current?.querySelector('.hn-pages')?.getBoundingClientRect();const top=Math.max(viewport.top,header?.bottom||viewport.top)+24;
   const visible=sections.map(s=>({id:s.id,box:root.current?.querySelector(`#section-${CSS.escape(s.id)}`)?.getBoundingClientRect()})).filter(s=>s.box);
   setActive((visible.find(s=>s.box!.top<=top&&s.box!.bottom>top)||visible.find(s=>s.box!.top>top)||visible.at(-1))?.id||'');
   const availableHeight=Math.max(120,Math.min(innerHeight,viewport.bottom)-(header?.bottom||viewport.top)-32);
   setHeight(availableHeight);
   const rail=outline.current?.getBoundingClientRect();
   if(rail&&expandedWidth){
    const bottom=rail.top+Math.min(expandedHeight,availableHeight),right=rail.left+expandedWidth+16;
    const overlaps=page.sections.filter(s=>!shared||!s.hidden).some(s=>{const box=root.current?.querySelector(`#section-${CSS.escape(s.id)}`)?.getBoundingClientRect();return box&&box.bottom>rail.top&&box.top<bottom&&box.left<right&&box.right>rail.left;});
    setAutoExpanded(!overlaps&&right<=viewport.right-16);
   }
  };
  const next=()=>{if(!pending)pending=requestAnimationFrame(measure);};
  const observer=new ResizeObserver(next);observer.observe(scroll);if(root.current)observer.observe(root.current);root.current?.querySelectorAll('.hev-section').forEach(section=>observer.observe(section));scroll.addEventListener('scroll',next,{passive:true});window.addEventListener('resize',next);measure();
  return()=>{cancelAnimationFrame(pending);observer.disconnect();scroll.removeEventListener('scroll',next);window.removeEventListener('resize',next);};
 },[page.id,page.sections,shared]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4000);return()=>clearTimeout(timer);},[notice]);
 const run=(action:string,section:HtmlSection)=>{
  if(action==='hide')onPatch(section.id,{hidden:!section.hidden});
  else if(action==='label')onPatch(section.id,{navigationHidden:!section.navigationHidden});
  else if(action==='copy-id'||action==='copy-link'){
   const url=workspaceLocation();url.searchParams.set('htmlPage',page.id);url.hash=`section-${section.id}`;
   navigator.clipboard.writeText(action==='copy-id'?section.id:url.href).then(()=>setNotice(action==='copy-id'?'Section ID copied':'Section link copied'),()=>setNotice('Could not copy to clipboard.'));
  }else if(action==='template'){
   const ids=new Set(section.columns.flat().map(b=>b.id));const next=[...saved,{section:structuredClone(section),widgets:Object.fromEntries(Object.entries(widgets||{}).filter(([id])=>ids.has(id)))}].slice(-20);
   try{localStorage.setItem(templateKey,JSON.stringify(next));setSaved(next);setNotice('Section saved to templates on this browser.');}catch{setNotice('Could not save the template. Browser storage is full.');}
  }else if(['move-page','automation','collaboration','delete'].includes(action))setDialog({kind:action,section});
  else onAction(action,section);
 };
 const dragStart=(event:DragEvent,id:string)=>{setDragged(id);event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/x-asset-section',id);};
 const finish=()=>{setDragged('');setDrop(undefined);};
 const destination=page.sections.find(s=>s.id===dialog?.section?.id)||dialog?.section;
 return <aside ref={outline} className="hs-outline" data-auto-expanded={autoExpanded||undefined} style={{maxHeight:height,background:design.background,color:design.text,boxShadow:design.shadow==='none'?'none':design.shadow==='sm'?'var(--ui-shadow-sm)':design.shadow==='md'?'var(--ui-shadow-md)':undefined,'--hs-active-text':design.activeText,'--hs-active-bg':design.activeBackground,'--hs-indicator':design.indicator,'--hs-hover-bg':design.pillBackground} as CSSProperties} aria-label="Section navigation"><nav aria-label="Page sections">
  {sections.map((section,index)=><div key={section.id} className="hs-row" data-active={section.id===active||undefined} data-selected={selectedIds.includes(section.id)||undefined} data-hidden={section.hidden||undefined} data-dragging={dragged===section.id||undefined} data-drop={drop?.id===section.id?(drop.after?'after':'before'):undefined}
   onDragOver={event=>{if(!editable||!dragged||dragged===section.id)return;event.preventDefault();setDrop({id:section.id,after:event.clientY>event.currentTarget.getBoundingClientRect().top+event.currentTarget.clientHeight/2});}}
   onDrop={event=>{event.preventDefault();if(drop&&dragged)onReorder(dragged,drop.id,drop.after);finish();}}>
   <span className="hs-drop-line" aria-hidden="true"/>
   <Tooltip label={section.name} onlyWhenTruncated><button type="button" className="ui-reset hs-link" aria-label={`Go to section: ${section.name}`} aria-current={section.id===active?'location':undefined} draggable={editable&&!section.locked} onDragStart={e=>dragStart(e,section.id)} onDragEnd={finish}
    onKeyDown={e=>{if(editable&&e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();onAction(e.key==='ArrowUp'?'up':'down',section);}}}
    onClick={e=>{onNavigate(section.id,e.shiftKey,e.metaKey||e.ctrlKey);if(e.detail)e.currentTarget.blur();}}>{section.name}</button></Tooltip>
   {editable&&<><Dropdown align="start" width={240} fitViewport items={[
    {id:'rename',label:'Rename',leadingIcon:icon('pencil'),disabled:section.locked},{id:'duplicate',label:'Duplicate',leadingIcon:icon('copy'),disabled:page.sections.length>=40||section.locked},{id:'style',label:'Section design',leadingIcon:icon('paintbrush-vertical')},
    {id:'up',label:'Move up',leadingIcon:icon('arrow-up'),disabled:index===0||section.locked},{id:'down',label:'Move down',leadingIcon:icon('arrow-down'),disabled:index===sections.length-1||section.locked},
    {id:'hide',label:section.hidden?'Show in shared view':'Hide from shared view',leadingIcon:icon(section.hidden?'eye':'eye-off')},{id:'label',label:section.navigationHidden?'Show navigation label':'Hide navigation label',leadingIcon:icon('list')},
    {id:'collaboration',label:section.collaboration?'Turn off collaboration':'Turn on collaboration',leadingIcon:icon('users')},separator,
    {id:'copy-link',label:'Copy link',leadingIcon:icon('link')},{id:'template',label:'Save as template',leadingIcon:icon('layout-template')},{id:'move-page',label:'Move to page',leadingIcon:icon('arrow-up-right'),disabled:pages.filter(p=>p.id!==page.id&&!p.externalUrl).length===0||section.locked},separator,
    {id:'automation',label:'Create automation',leadingIcon:icon('zap')},{id:'copy-id',label:'Copy ID',leadingIcon:icon('code')},separator,
    {id:'delete',label:'Remove section',leadingIcon:icon('trash-2'),disabled:section.locked},
   ]} onChange={action=>run(action,section)} trigger={<Button className="hs-options" size="sm" variant="ghost" aria-label={`Section options for ${section.name}`} leadingIcon={icon('ellipsis')}/>}/>
   <Button className="hs-grip" variant="ghost" size="sm" aria-label={`Reorder ${section.name}`} disabled={section.locked} draggable={!section.locked} leadingIcon={icon('grip-vertical')} onDragStart={e=>dragStart(e,section.id)} onDragEnd={finish} onKeyDown={e=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();onAction(e.key==='ArrowUp'?'up':'down',section);}}}/></>}
  </div>)}
  {editable&&<Dropdown align="start" items={[{id:'new',label:'New section',leadingIcon:icon('square-plus'),disabled:page.sections.length>=40},{id:'templates',label:'Template section',leadingIcon:icon('layout-template'),disabled:page.sections.length>=40}]} onChange={value=>value==='new'?onAdd():setDialog({kind:'templates'})} trigger={<Button className="hs-add" variant="ghost" size="sm" aria-label="Add section" leadingIcon={icon('plus')}>Add section</Button>}/>}
 </nav>
 {notice&&<div className="hs-notice" role="status">{notice}</div>}
 {dialog&&<Dialog open onClose={()=>setDialog(undefined)} width={440} ariaLabel="Section settings"><DialogHeader title={{'move-page':'Move to page',automation:'Create automation',collaboration:'Section collaboration',templates:'Template section',delete:'Remove section'}[dialog.kind]||'Section settings'} onClose={()=>setDialog(undefined)}/><DialogBody>
  {dialog.kind==='move-page'&&<div className="hs-options-list">{pages.filter(p=>p.id!==page.id&&!p.externalUrl).map(p=><Button key={p.id} variant="neutral" disabled={p.sections.length>=40} leadingIcon={icon(p.icon||'file-text')} onClick={()=>{onMove(destination!.id,p.id);setDialog(undefined);}}>{p.name}</Button>)}</div>}
  {dialog.kind==='templates'&&<div className="hs-options-list">{saved.map((t,i)=><Button key={i} variant="neutral" leadingIcon={icon('rectangle-horizontal')} onClick={()=>{onAdd(t);setDialog(undefined);}}>{t.section.name}</Button>)}{!saved.length&&<p className="hn-help">Save a section as a template from its options. Templates are stored in this browser.</p>}</div>}
  {dialog.kind==='collaboration'&&<><p className="hn-help">This saves the section’s collaboration setting in this prototype. Shared collaboration requires a connected workspace.</p><Button variant="neutral" onClick={()=>{onPatch(destination!.id,{collaboration:!destination!.collaboration});setDialog(undefined);}}>{destination?.collaboration?'Turn off collaboration':'Turn on collaboration'}</Button></>}
  {dialog.kind==='automation'&&<><p className="hn-help">Choose a demo automation. Running automations requires a connected workspace.</p><div className="hs-options-list">{([['viewed','Notify team when section is viewed'],['completed','Create follow-up when tasks complete']] as const).map(([id,label])=><Button key={id} variant={destination?.automation===id?'primary':'neutral'} onClick={()=>{onPatch(destination!.id,{automation:id});setDialog(undefined);}}>{label}</Button>)}<Button variant="ghost" onClick={()=>{onPatch(destination!.id,{automation:null});setDialog(undefined);}}>No automation</Button></div></>}
  {dialog.kind==='delete'&&<p>Remove “{destination?.name}” and its contents?</p>}
 </DialogBody><DialogFooter><Button variant="neutral" onClick={()=>setDialog(undefined)}>Cancel</Button>{dialog.kind==='delete'&&<Button variant="primary" onClick={()=>{onAction('delete',destination!);setDialog(undefined);}}>Remove section</Button>}</DialogFooter></Dialog>}
 </aside>;
}
