import { readHtmlVideo } from './readHtmlVideo';
import {LucideGlyph} from './LucideGlyph';
import {elementContentHeight} from './htmlElementAppearance';
import { canvasAgent } from './canvasAgent';
import { readHtmlImage } from './htmlImageUpload';
import { htmlWorkspaceThemeStyle } from './htmlWorkspaceTheme';
import { HtmlSectionActions } from './HtmlSectionActions';
import { htmlSectionStyle, htmlSectionWrapperStyle } from './htmlSectionStyle';
import { HtmlTextSlashMenu } from './HtmlTextSlashMenu';
import { HtmlSectionNavigation, workspaceLocation } from './HtmlSectionNavigation';
import { htmlSectionSelectionAction } from './htmlSelectionOperations';
import { HtmlPageNavigation, HtmlEditorSharedContext } from './HtmlPageNavigation';
import { WorkspaceRuntimeContext } from './WorkspaceEditor';
import { HtmlImageProgress } from './HtmlImageProgress';
import './html-generation-progress.css';
import { WorkspaceSelectionContext } from './WorkspaceReview';
import {EditorWidgetToolbarContext} from '../components/editor-widgets/EditorWidgetToolbar';
import { PresentationShapeSurface } from './PresentationElementDesign';
import { HtmlInsertionGap } from './HtmlInsertionGap';
import { htmlFrameStyle, useHtmlCanvasSelection } from './HtmlCanvasSelection';
import { WidgetInsertMenu } from '../protos/widget-dropdown';
import { htmlInsertOptions, useHtmlEditorInsert, useHtmlInsertPanel } from './HtmlEditorInsert';
import { WorkspaceSyncedSection } from './WorkspaceSyncedSection';
import { useContext, useEffect, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button, ColorPicker, Dialog, DialogBody, DialogFooter, DialogHeader, Dropdown, Icon, Input, Tabs, TabsItem, TabsList, TabsTrigger, TabsTriggerIcon, Tooltip } from '@asset/ui';
import { EditorImageBlock, EditorTextBlock, type EditorChecklistValue } from '../components/editor-widgets';
import { WorkspaceEditingContext } from './WorkspaceAssets';
import { WorkspaceInteractionContext } from './WorkspaceInteraction';
import { WorkspaceContactCard } from './WorkspaceContactCard';
import { WorkspaceTasks } from './WorkspaceTasks';
import { useWorkspaceWidgetHost } from './WorkspaceWidgetHost';
import { htmlEditorSchema, htmlId, htmlText, initialHtmlEditor, sectionWeights, resizeSectionColumns, moveHtmlBlock, newHtmlBlock, type HtmlBlock, type HtmlEditorState, type HtmlSection } from './htmlEditorModel';
import { HtmlEditorInventory, inventoryDefaults } from './HtmlEditorInventory';
import type { HtmlInventory } from './htmlInventorySchema';
import { HtmlEditorPdf } from './HtmlEditorPdf';
import './html-editor-v1.css';

const contentTypes: { id: HtmlBlock['kind']; label: string; icon: string }[] = [
  { id: 'shape', label: 'Shape', icon: 'shapes' }, { id: 'text', label: 'Text', icon: 'type' }, { id: 'image', label: 'Image', icon: 'image' },
  { id: 'pdf', label: 'PDF', icon: 'file-text' }, { id: 'contacts', label: 'Contact cards', icon: 'contact' },
  { id: 'cta', label: 'CTA', icon: 'mouse-pointer-2' }, { id: 'synced', label: 'Synced section', icon: 'link' },
  { id: 'inventory', label: 'Widget', icon: 'blocks' }, { id: 'media', label: 'Media', icon: 'file' }, { id: 'toggle', label: 'Toggle list', icon: 'chevron-right' }, { id: 'code', label: 'Code block', icon: 'code' },
  { id: 'tasks', label: 'Checklist', icon: 'list-todo' }, { id: 'divider', label: 'Divider', icon: 'minus' },
];
const rolloutTasks: EditorChecklistValue['tasks'] = [
  ['goals', 'Align on rollout goals'], ['policies', 'Configure spending policies'], ['launch', 'Launch with your team'],
].map(([id, name]) => ({ id, name, status: 'To-do', complete: false, internal: false, assignees: [], description: '', subtasks: [], comments: [] }));
const icon = (name: string) => <Icon name={name} size={16} />;
type Rename = { type: 'page' | 'section'; id?: string; name: string };

export function HtmlEditorV1({initialDesign, canvasOnly=false, zoom=1, imageSources={}}:{initialDesign?:{sectionId:string}|{blockId:string}; canvasOnly?:boolean; zoom?:number; imageSources?:Record<string,string>} = {}) {
  const editing = useContext(WorkspaceEditingContext), host = useWorkspaceWidgetHost();
  const shared = useContext(HtmlEditorSharedContext);
  const editable = !!editing.onEdit && !shared;
  const insertHandler = useHtmlEditorInsert();
  const insertPanel = useHtmlInsertPanel();
  const [insertAt, setInsertAt] = useState('');
  const [mediaInsert, setMediaInsert] = useState<{format:string;section:string;column:number;index:number;url:string;name:string}>();
  const [buttonEdit, setButtonEdit] = useState<Extract<HtmlBlock, { kind: 'cta' }>>();
  const persisted = editing.manual ?? initialHtmlEditor();
  const [state, setState] = useState(persisted);
  const stateRef = useRef(state), pending = useRef<string[]>([]);
  const persistedKey = JSON.stringify(persisted);
  useEffect(() => {
    const acknowledged = pending.current.indexOf(persistedKey);
    if (acknowledged >= 0) { pending.current.splice(0, acknowledged + 1); if (pending.current.length) return; }
    else pending.current = [];
    const value = JSON.parse(persistedKey); stateRef.current = value; setState(value);
  }, [persistedKey]);
  const [pageId, setPageId] = useState(()=>{const target=workspaceLocation().searchParams.get('htmlPage');return state.pages.some(p=>p.id===target)?target!:state.pages[0].id;});
  const availablePages = shared ? state.pages.filter(p => !p.hidden) : state.pages;
  const page = availablePages.find(item => item.id === pageId) ?? availablePages[0] ?? state.pages[0];
  const [selected, setSelected] = useState<Element>();
  const [rename, setRename] = useState<Rename>();
  const [sectionDesign, setSectionDesign] = useState<string>();
  const [insertPDF, setInsertPDF] = useState<{ section: string; column: number; index: number }>();
  const [pdf, setPdf] = useState<Extract<HtmlBlock, { kind: 'pdf' }>>();
  const [dragging, setDragging] = useState<string>();
  const [drop, setDrop] = useState('');
  const [error, setError] = useState('');
  const [uploadError,setUploadError]=useState('');
  const [resize, setResize] = useState<{id:string; weights:number[]}>();
  const resizeSession = useRef<{section:HtmlSection; divider:number; x:number; width:number; weights:number[]} | undefined>(undefined);
  const fileInput = useRef<HTMLInputElement>(null);
  const fillTarget = useRef(false);
  const fileTarget = useRef<string | { section: string; column: number; index: number; kind?: 'image' | 'pdf' | 'video' } | undefined>(undefined);
  const root = useRef<HTMLDivElement>(null);
  const clear = () => { setSelected(undefined); canvasSelection.clear(); };
  const save = (next: HtmlEditorState, copies?: Record<string, string>, sourceWidgets = editing.widgets) => {
    const parsed = htmlEditorSchema.safeParse(next);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Check your changes.'); return; }
    setError(''); stateRef.current = parsed.data; setState(parsed.data);
    pending.current.push(JSON.stringify(parsed.data));
    if (copies && Object.keys(copies).length) {
      const widgets = { ...editing.widgets };
      for (const [original, id] of Object.entries(copies)) if (sourceWidgets?.[original]) widgets[id] = structuredClone(sourceWidgets[original]);
      editing.onEdit?.({type:'restore', value:{workspaceManual:parsed.data,workspaceWidgets:widgets,workspaceLayout:editing.layout,workspaceDesign:editing.design,workspaceBlocks:editing.blocks,workspaceImages:editing.images}});
    } else editing.onEdit?.({ type: 'manual', value: parsed.data });
  };
  const update = (fn: (draft: HtmlEditorState) => void) => { const draft = structuredClone(stateRef.current); fn(draft); save(draft); };
  const sectionChange = (id: string, fn: (section: HtmlSection) => void) => update(draft => {
    const section = draft.pages.flatMap(p => p.sections).find(s => s.id === id); if (section) fn(section);
  });
  const blockChange = (id: string, block: HtmlBlock) => update(draft => {
    for (const p of draft.pages) for (const s of p.sections) for (const column of s.columns) {
      const index = column.findIndex(b => b.id === id); if (index >= 0) column[index] = block;
    }
  });
  const removeBlock = (id: string) => { update(draft => { for (const p of draft.pages) for (const s of p.sections) s.columns = s.columns.map(c => c.filter(b => b.id !== id)); }); clear(); };
  const changePage = (id: string) => { setPageId(id); clear(); setSectionDesign(undefined); window.dispatchEvent(new Event('workspace-page-change')); root.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); };
  const followAnchor = (href: string) => {
    const sectionId = href.replace('#section-', '');
    const destination = stateRef.current.pages.find(p => p.sections.some(s => s.id === sectionId));
    if (destination && destination.id !== page.id) changePage(destination.id);
    requestAnimationFrame(() => document.getElementById(href.slice(1))?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  };
  const addSection = (index: number, openInsert = true) => {
    const id = htmlId(); update(draft => draft.pages.find(p => p.id === page.id)!.sections.splice(index, 0, { id, name: 'New section', background: '#ffffff', padding: 40, columns: [[]] }));
    requestAnimationFrame(() => { document.getElementById(`section-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); if (openInsert) { if (insertPanel.enabled) {const anchor=document.getElementById(`section-${id}`)?.querySelector<HTMLButtonElement>('.hev-insert button');if(anchor)insertPanel.showAt(anchor,label=>chooseContent(label,id,0,0));} else setInsertAt(`${id}:0:0`); } });
    return id;
  };
  const openSectionInsert=(index:number,anchor:HTMLElement)=>{
    if(!insertPanel.enabled){addSection(index);return;}
    insertPanel.showAt(anchor,label=>{const id=addSection(index,false);if(label!=='Section')chooseContent(label,id,0,0);});
  };
  const insertBlock = (section: string, column: number, index: number, block: HtmlBlock) => {
    if(canvasOnly){
      const width=root.current?.offsetWidth??1200;
      const height=stateRef.current.pages.flatMap(p=>p.sections).find(s=>s.id===section)?.minHeight??738;
      const w=block.kind==='text'?360:block.kind==='shape'&&block.icon?40:block.kind==='image'||block.kind==='media'?(block.editor?.widthPx??320):240;
      const h=block.kind==='text'?48:block.kind==='shape'&&block.icon?40:block.kind==='shape'&&block.shape==='line'?24:block.kind==='image'||block.kind==='media'?(block.editor?.height??180):180;
      block={...block,editor:{...block.editor,position:'absolute',width:undefined,widthPx:w,height:h,x:(width-w)/2,y:(height-h)/2}};
      if(block.kind==='text'){block.value={...block.value,size:28,color:'var(--ui-text)'};block.editor={...block.editor,appearance:{...block.editor?.appearance,fontFamily:'Camera Plain',fontSize:28,fontWeight:600,lineHeight:125}};}
      index=stateRef.current.pages.flatMap(p=>p.sections).find(s=>s.id===section)?.columns[column].length??index;
    }
    const kind = block.kind; sectionChange(section, s => s.columns[column].splice(index, 0, block));
    requestAnimationFrame(() => {
      const element = document.getElementById(`block-${block.id}`); element?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      if (kind === 'text') element?.querySelector<HTMLElement>('[contenteditable=true]')?.focus({ preventScroll: true });
      setSelected(element?.querySelector('[data-workspace-widget]') ?? element ?? undefined);
      if(kind==='text'&&canvasSelection.enabled)canvasSelection.edit(block);else canvasSelection.select(element ?? undefined);
    });
  };
  const addBlock = (section: string, column: number, index: number, kind: string) => {
    if (kind === 'pdf') { setInsertPDF({ section, column, index }); return; }
    insertBlock(section, column, index, newHtmlBlock(kind as HtmlBlock['kind']));
  };
  const chooseContent = (label: string | HtmlBlock, section: string, column: number, index: number) => {
    setInsertAt('');
    const destination = stateRef.current.pages.flatMap(p => p.sections).find(s => s.id === section);
    if (insertPanel.enabled && (!destination || destination.locked || !destination.columns[column])) return;
    if(typeof label!=='string'){insertBlock(section,column,index,label);return;}
    if (['Rectangle','Circle','Triangle','Line'].includes(label)) {insertBlock(section,column,index,{id:htmlId(),kind:'shape',shape:label.toLowerCase() as 'rectangle'|'circle'|'triangle'|'line',editor:{width:50,height:label==='Line'?24:160,appearance:{fill:'var(--ui-border)'}}});return;}
    if(canvasOnly&&label==='Video'){pickFile({section,column,index,kind:'video'},'video');return;}
    if(canvasOnly&&label==='Image'){pickFile({section,column,index,kind:'image'},'image');return;}
    if(label.startsWith('Icon:')){insertBlock(section,column,index,{id:htmlId(),kind:'shape',shape:'rectangle',icon:label.slice(5) as import('./htmlEditorModel').HtmlIconName,filled:label==='Icon:play',editor:{widthPx:40,height:40,appearance:{fill:'var(--ui-text)'}}});return;}
    if (label === 'Section') { addSection(page.sections.findIndex(s => s.id === section) + 1, !insertPanel.enabled); return; }
    if (label in inventoryDefaults) { insertBlock(section,column,index,{id:htmlId(),kind:'inventory',content:structuredClone(inventoryDefaults[label as HtmlInventory['type']])}); return; }
    if (['Image','Link','File','Video','Embed','iFrame'].includes(label)) { setMediaInsert({format:label,section,column,index,url:'',name:''}); return; }
    if (label==='Toggle list'||label==='Code block') { addBlock(section,column,index,label==='Toggle list'?'toggle':'code'); return; }
    const type = contentTypes.find(item => item.label === label);
    if (type) addBlock(section, column, index, type.id);
  };
  useEffect(() => {
    if(!editable)return;
    const handler = (label:string | HtmlBlock) => {
      const blockId = selected?.closest('.hev-block')?.id.replace('block-', '');
      for (const section of page.sections) for (let c = 0; c < section.columns.length; c++) {
        const index = section.columns[c].findIndex(b => b.id === blockId);
        if (index >= 0) { chooseContent(label, section.id, c, index + 1); return; }
      }
      const selectedSectionId=selected?.closest('.hev-section')?.getAttribute('data-section');
      const viewport=(root.current?.closest('.studio-workspace-scroll')||root.current)?.getBoundingClientRect();
      const visibleSections=page.sections.map(section=>{const box=root.current?.querySelector(`#section-${CSS.escape(section.id)}`)?.getBoundingClientRect();return {section,area:box&&viewport?Math.max(0,Math.min(box.bottom,viewport.bottom)-Math.max(box.top,viewport.top))*Math.max(0,Math.min(box.right,viewport.right)-Math.max(box.left,viewport.left)):0};}).sort((a,b)=>b.area-a.area);
      const section = page.sections.find(s=>s.id===selectedSectionId) ?? visibleSections[0]?.section;
      if(section?.locked)return;
      if (label === 'Section' || !section) { addSection(page.sections.length, !insertPanel.enabled); return; }
      chooseContent(label, section.id, 0, section.columns[0].length);
    };
    insertHandler.current=handler;
    return () => { if(insertHandler.current===handler)insertHandler.current = undefined; };
  });
  const duplicateBlocks = (sections: HtmlSection[]) => sections.map(section => ({ ...structuredClone(section), id: htmlId(), columns: section.columns.map(column => column.map(block => {
    const id = htmlId(), widget = editing.widgets?.[block.id];
    if (widget) editing.onEdit?.({ type: 'widget', id, value: structuredClone(widget) });
    return { ...structuredClone(block), id };
  })) }));
  const pageAction = (action: string, target = page) => {
    const page = target;
    if (action==='left'||action==='right') update(d=>{const from=d.pages.findIndex(p=>p.id===target.id),to=from+(action==='left'?-1:1);if(to>=0&&to<d.pages.length)d.pages.splice(to,0,d.pages.splice(from,1)[0]);});
    if (action === 'new') setRename({ type: 'page', name: '' });
    if (action === 'rename') setRename({ type: 'page', id: page.id, name: page.name });
    if (action === 'duplicate') { const id = htmlId(), copy = { ...page, id, name: `${page.name} (copy)`, sections: duplicateBlocks(page.sections) }; update(d => d.pages.splice(d.pages.findIndex(p => p.id === page.id) + 1, 0, copy)); changePage(id); }
    if (action === 'delete' && state.pages.length > 1) { update(d => { d.pages = d.pages.filter(p => p.id !== page.id); }); changePage(state.pages.find(p => p.id !== page.id)!.id); }
  };
  const sectionAction = (action: string, section: HtmlSection) => {
    if(insertPanel.enabled){
      if(action==='style'){canvasSelection.designSection(section.id);return;}
      if(section.locked)return;
      if(['duplicate','delete','up','down'].includes(action)){
        const result=htmlSectionSelectionAction(stateRef.current,[section.id],action as 'duplicate'|'delete'|'up'|'down');save(result.state,result.copies);
        if(action==='delete'){clear();host.closePanel();}else if(result.ids.length)requestAnimationFrame(()=>canvasSelection.selectSection(result.ids[0]));
        return;
      }
    }
    if (action === 'rename') setRename({ type: 'section', id: section.id, name: section.name });
    if (action === 'duplicate') { const [copy] = duplicateBlocks([section]); update(d => { const sections = d.pages.find(p => p.id === page.id)!.sections; sections.splice(sections.findIndex(s => s.id === section.id) + 1, 0, copy); }); }
    if (action === 'delete') { update(d => { const p = d.pages.find(p => p.id === page.id)!; p.sections = p.sections.filter(s => s.id !== section.id); }); host.closePanel(); }
    if (action === 'up' || action === 'down') update(d => { const sections = d.pages.find(p => p.id === page.id)!.sections, from = sections.findIndex(s => s.id === section.id), to = from + (action === 'up' ? -1 : 1); if (to >= 0 && to < sections.length) sections.splice(to, 0, sections.splice(from, 1)[0]); });
  };
  const finishRename = () => {
    const name = rename?.name.trim(); if (!rename || !name) return;
    if (rename.type === 'section' && rename.id) sectionChange(rename.id, s => { s.name = name; });
    else if (rename.id) update(d => { d.pages.find(p => p.id === rename.id)!.name = name; });
    else { const id = htmlId(); update(d => d.pages.push({ id, name, sections: [{ id: htmlId(), name, background: '#ffffff', padding: 40, columns: [[htmlText(htmlId(), name, 'Heading 1')]] }] })); changePage(id); }
    setRename(undefined);
  };
  const insertUploadedImage=async(target:{section:string;column:number;index:number},src:string,name:string)=>{
    const image=new Image();image.src=src;await image.decode();
    const scale=Math.min(320/image.naturalWidth,360/image.naturalHeight,1);
    const block=newHtmlBlock('image') as Extract<HtmlBlock,{kind:'image'}>;
    insertBlock(target.section,target.column,target.index,{...block,value:{...block.value,src,alt:name,crop:undefined},editor:{widthPx:Math.max(12,image.naturalWidth*scale),height:Math.max(12,image.naturalHeight*scale)}});
  };
  const pickFile = (id: string | { section: string; column: number; index: number; kind?: 'image' | 'pdf' | 'video' }, kind: 'pdf' | 'image' | 'video', fill = false) => {
    fillTarget.current=fill;
    if(kind==='image'&&!canvasOnly&&window.parent!==window){
      setUploadError('');
      void canvasAgent.pickSource('image').then(async source=>{
        if(!source)return;
        if(typeof id!=='string'){await insertUploadedImage(id,source.data,source.name);return;}
        const block=stateRef.current.pages.flatMap(p=>p.sections.flatMap(s=>s.columns.flat())).find(b=>b.id===id);
        if(fill&&block?.kind==='shape')blockChange(id,{...block,editor:{...block.editor,appearance:{...block.editor?.appearance,backgroundImage:source.data}}});
        else if(block?.kind==='image')blockChange(id,{...block,value:{...block.value,src:source.data,alt:source.name,crop:undefined},editor:{...block.editor,appearance:{...block.editor?.appearance,imageVisible:true}}});
      }).catch(error=>setUploadError(error instanceof Error?error.message:'This image could not be opened.'));
      return;
    }
    fileTarget.current = id; if (fileInput.current) { fileInput.current.accept = kind === 'pdf' ? 'application/pdf,.pdf' : kind === 'video' ? 'video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogv,.mov' : 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml'; fileInput.current.click(); } };
  const upload = async (file?: File) => {
    if (!file || !fileTarget.current) return;
    const target = fileTarget.current,fill=fillTarget.current;
    if(typeof target!=='string'&&target.kind==='video'){
      setUploadError('');
      try { insertBlock(target.section,target.column,target.index,await readHtmlVideo(file)); } catch(error) { setUploadError(error instanceof Error?error.message:'This video could not be opened.'); }
      return;
    }
    if(typeof target!=='string'&&target.kind==='image'){
      setUploadError('');
      try{await insertUploadedImage(target,await readHtmlImage(file),file.name);}catch(error){setUploadError(error instanceof Error?error.message:'This image could not be opened.');}
      return;
    }
    const block = typeof target === 'string' ? stateRef.current.pages.flatMap(p => p.sections.flatMap(s => s.columns.flat())).find(b => b.id === target) : newHtmlBlock('pdf');
    if (!block || !['pdf', 'image',...(fill?['shape']:[])].includes(block.kind)) return;
    setUploadError('');
    if(block.kind==='image'||fill&&block.kind==='shape'){
      try{
        const src=await readHtmlImage(file);
        const current=stateRef.current.pages.flatMap(p=>p.sections.flatMap(s=>s.columns.flat())).find(b=>b.id===block.id);
        if(fill&&current?.kind==='shape')blockChange(current.id,{...current,editor:{...current.editor,appearance:{...current.editor?.appearance,backgroundImage:src}}});
        else if(current?.kind==='image')blockChange(current.id,{...current,value:{...current.value,src,alt:file.name,crop:undefined},editor:{...current.editor,appearance:{...current.editor?.appearance,imageVisible:true}}});
      }catch(error){setUploadError(error instanceof Error?error.message:'This image could not be opened. Try another file.');}
      return;
    }
    if (file.size > 1700000) { setError('Choose a file smaller than 1.7 MB for this prototype.'); return; }
    const valid = file.type === 'application/pdf';
    if (!valid) { setError(block.kind === 'pdf' ? 'Choose a PDF file.' : 'Choose a PNG, JPG, WebP or GIF image.'); return; }
    const reader = new FileReader(); reader.onerror = () => setError('This file could not be read. Try another file.');
    reader.onload = () => { const src = String(reader.result); if (block.kind === 'pdf') { const next = { ...block, name: file.name, src }; if (typeof target === 'string') blockChange(block.id, next); else { insertBlock(target.section, target.column, target.index, next); setInsertPDF(undefined); } } };
    reader.readAsDataURL(file);
  };
  const beginResize = (event: PointerEvent<HTMLButtonElement>, section: HtmlSection, divider: number) => {
    event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    const grid=event.currentTarget.closest('.hev-columns') as HTMLElement;
    const gap=parseFloat(getComputedStyle(grid).columnGap)||40;
    resizeSession.current={section:structuredClone(section),divider,x:event.clientX,width:grid.getBoundingClientRect().width-gap*(section.columns.length-1),weights:sectionWeights(section)};
    setResize({id:section.id,weights:sectionWeights(section)});
  };
  const moveResize = (event: PointerEvent<HTMLButtonElement>) => {
    const session=resizeSession.current;if(!session)return;
    session.weights=resizeSectionColumns(session.section,session.divider,(event.clientX-session.x)/session.width*100);
    setResize({id:session.section.id,weights:session.weights});
  };
  const endResize = () => {
    const session=resizeSession.current;if(!session)return;
    sectionChange(session.section.id,s=>{s.weights=session.weights;});resizeSession.current=undefined;setResize(undefined);
  };
  const blockDrop = (event: DragEvent, section: string, column: number, index: number) => {
    event.preventDefault(); const id = event.dataTransfer.getData('application/x-asset-block') || dragging;
    if (id) save(moveHtmlBlock(stateRef.current, id, section, column, index)); setDragging(undefined); setDrop('');
  };
  const insertion = (section: string, column: number, index: number, empty = false) => {
    const key = `${section}:${column}:${index}`;
    if(canvasOnly)return null;
    if(!editable&&canvasSelection.mode)return <HtmlInsertionGap kind="block" className={`hev-insert ${empty ? 'hev-insert--empty' : ''}`}/>;
    return editable ? <HtmlInsertionGap kind="block" open={insertAt === key} className={`hev-insert ${empty ? 'hev-insert--empty' : ''}`} data-dropping={drop === key || undefined} data-dragging={!!dragging || undefined}
      onDragOver={e => { if (dragging) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDrop(key); } }} onDragLeave={() => setDrop(current => current === key ? '' : current)} onDrop={e => blockDrop(e, section, column, index)}>
      {insertPanel.enabled ? <Button size="sm" variant="ghost" leadingIcon={icon('plus')} aria-label={`Add content in ${page.sections.find(s => s.id === section)?.name}, position ${index + 1}`} onClick={event => insertPanel.showAt(event.currentTarget,label => chooseContent(label, section, column, index))} /> : <WidgetInsertMenu open={insertAt === key} onOpenChange={open => setInsertAt(open ? key : '')} available={htmlInsertOptions} align="center"
        onSelect={label => chooseContent(label, section, column, index)}
        trigger={<Button size="sm" variant="ghost" leadingIcon={icon('plus')} aria-label={`Add content in ${page.sections.find(s => s.id === section)?.name}, position ${index + 1}`}>{empty && !canvasSelection.mode ? 'Add content' : undefined}</Button>} />}
    </HtmlInsertionGap> : null;
  };
  const canvasSelection = useHtmlCanvasSelection({root,state,zoom,fixedCanvas:canvasOnly,pageId:page.id,editable,save,onSelect:setSelected,onReplace:(id,fill)=>pickFile(id,'image',fill),onEditButton:setButtonEdit,onAddSection:(id,after,anchor)=>openSectionInsert(page.sections.findIndex(s=>s.id===id)+(after?1:0),anchor)});
  const initialDesignApplied=useRef(false);
  const initialDesignKey=JSON.stringify(initialDesign);
  useEffect(()=>{
    if(!initialDesign||!canvasSelection.enabled||initialDesignApplied.current)return;
    const target=initialDesign;
    const frame=requestAnimationFrame(()=>{
      if('sectionId' in target)canvasSelection.designSection(target.sectionId);
      else canvasSelection.designElement(target.blockId);
      initialDesignApplied.current=true;
    });
    return()=>cancelAnimationFrame(frame);
  },[canvasSelection.enabled,initialDesignKey]);
  const chatSelection = useContext(WorkspaceSelectionContext);
  useEffect(()=>{
    if(!canvasSelection.mode||shared)return;
    const ids=canvasSelection.ids,sectionId=canvasSelection.sectionId,sectionIds=canvasSelection.sectionIds;
    const section=page.sections.find(s=>s.id===sectionId||s.columns.flat().some(b=>ids.includes(b.id)));
    const block=section?.columns.flat().find(b=>b.id===ids[0]);
    chatSelection.setVisual({page:page.name,context:'HTML_SELECTION '+JSON.stringify({pageId:page.id,sectionId:sectionId||null,blockIds:ids,...(sectionIds.length>1?{sectionIds}:{})}),label:sectionIds.length>1?`${sectionIds.length} sections`:sectionId?section?.name:ids.length>1?`${ids.length} elements`:block?block.kind==='text'?block.value.runs.map(r=>r.text).join('').slice(0,100):block.kind==='inventory'?block.content?.type||'Widget':block.kind:undefined});
  },[canvasSelection.mode,page.id,canvasSelection.sectionId,canvasSelection.sectionIds.join(','),canvasSelection.ids.join(',')]);
  const runtime=useContext(WorkspaceRuntimeContext);
  const progress=canvasSelection.mode && runtime?.state?.working ? runtime.state.htmlProgress : undefined;
  const displayPage = canvasSelection.rendered.pages.find(p=>p.id===page.id) ?? page;
  const visibleSections=shared?displayPage.sections.filter(s=>!s.hidden):displayPage.sections;
  useEffect(()=>{if(!insertPanel.enabled)return;const hash=workspaceLocation().hash;if(hash.startsWith('#section-'))requestAnimationFrame(()=>root.current?.querySelector(`#${CSS.escape(hash.slice(1))}`)?.scrollIntoView({block:'start',behavior:'instant'}));},[page.id,insertPanel.enabled]);
  const design = page.sections.find(s => s.id === sectionDesign);
  return <WorkspaceInteractionContext.Provider value={{ pointer: editable, selected, clear }}><div ref={root} className="hev" data-section-navigation={insertPanel.enabled||undefined} {...canvasSelection.rootProps} data-selection-mode={canvasSelection.mode || undefined} data-transforming={canvasSelection.transforming || undefined} data-editable={editable || undefined} data-branded={!!editing.design?.widgetTheme||undefined} style={{ '--ramp-font': 'Arial, sans-serif', '--ramp-solar': '#e4f222', ...htmlWorkspaceThemeStyle(editing.design) } as CSSProperties}>
    {!canvasOnly && (insertPanel.enabled ? <HtmlPageNavigation pages={availablePages} page={page} editable={editable} onSelect={changePage} onAction={pageAction}
      onPatch={(id,patch)=>update(d=>{const target=d.pages.find(p=>p.id===id);if(target)Object.assign(target,patch);})}
      onAdd={(template,widgets)=>{
        if(stateRef.current.pages.length>=20)return;
        const copy=structuredClone(template),copies:Record<string,string>={};copy.id=htmlId();delete copy.hidden;
        for(const section of copy.sections){section.id=htmlId();for(const block of section.columns.flat()){const old=block.id;block.id=htmlId();copies[old]=block.id;}}
        const next=structuredClone(stateRef.current);next.pages.push(copy);
        save(next,copies,widgets);
        changePage(copy.id);
      }} onAskAI={navigation=>{
        clear();
        requestAnimationFrame(()=>{chatSelection.setVisual({page:page.name,label:navigation?'Page navigation':'New page',context:'HTML_SELECTION '+JSON.stringify({pageId:page.id,sectionId:null,blockIds:[],...(navigation?{navigation:true}:{})})});document.querySelector<HTMLTextAreaElement>('#we-chat-composer textarea')?.focus();});
      }}/>:<nav className="hev-pages" aria-label="Workspace pages"><Tabs value={page.id} onValueChange={changePage}><TabsList>{state.pages.map((p, index) => <TabsItem key={p.id} className="hev-page-tab" data-active={p.id===page.id||undefined}>
      <TabsTrigger value={p.id}><TabsTriggerIcon>{icon('file-text')}</TabsTriggerIcon><span>{p.name}</span></TabsTrigger>
      {editable && <Dropdown align="start" width={208} listHeight="auto" items={[
        {id:'rename',label:'Rename page',leadingIcon:icon('pencil')},{id:'duplicate',label:'Duplicate page',leadingIcon:icon('copy')},
        {id:'left',label:'Move left',leadingIcon:icon('arrow-left'),disabled:index===0},{id:'right',label:'Move right',leadingIcon:icon('arrow-right'),disabled:index===state.pages.length-1},
        {id:'delete',label:'Delete page',leadingIcon:icon('trash-2'),disabled:state.pages.length===1},
      ]} onChange={action=>pageAction(action,p)} trigger={<Button className="hev-page-more" size="sm" variant="ghost" aria-label={`${p.name} page options`}>{icon('ellipsis')}</Button>} />}
    </TabsItem>)}</TabsList></Tabs>
      {editable && <Button className="hev-page-add" size="sm" variant="ghost" leadingIcon={icon('plus')} onClick={() => setRename({ type: 'page', name: '' })}>Add page</Button>}
    </nav>)}
    <div className="hev-layout">
    {!canvasOnly&&insertPanel.enabled&&(!shared||availablePages.length>0)&&<HtmlSectionNavigation root={root} page={displayPage} pages={availablePages} editable={editable} shared={shared} selectedIds={canvasSelection.sectionIds} widgets={editing.widgets}
      onNavigate={(id,range,toggle)=>{if(editable)canvasSelection.selectSection(id,range,toggle);root.current?.querySelector(`#section-${CSS.escape(id)}`)?.scrollIntoView({block:'start',behavior:'instant'});}}
      onAction={sectionAction} onPatch={(id,patch)=>sectionChange(id,s=>Object.assign(s,patch))}
      onReorder={(id,target,after)=>{const selected=canvasSelection.sectionIds.includes(id)?canvasSelection.sectionIds:[id];const group=page.sections.filter(s=>selected.includes(s.id));if(group.some(s=>s.locked)||selected.includes(target))return;update(d=>{const p=d.pages.find(p=>p.id===page.id)!;const moved=p.sections.filter(s=>selected.includes(s.id));p.sections=p.sections.filter(s=>!selected.includes(s.id));const index=p.sections.findIndex(s=>s.id===target);if(index>=0)p.sections.splice(index+(after?1:0),0,...moved);});}}
      onMove={(id,destination)=>{const next=structuredClone(stateRef.current),from=next.pages.find(p=>p.id===page.id)!,to=next.pages.find(p=>p.id===destination),index=from.sections.findIndex(s=>s.id===id);if(!to||to.sections.length>=40||index<0||from.sections[index].locked)return;to.sections.push(from.sections.splice(index,1)[0]);save(next);changePage(destination);requestAnimationFrame(()=>root.current?.querySelector(`#section-${CSS.escape(id)}`)?.scrollIntoView({block:'start'}));}}
      onAdd={template=>{if(page.sections.length>=40)return;if(!template){addSection(page.sections.length);return;}const next=structuredClone(stateRef.current),copy=structuredClone(template.section),copies:Record<string,string>={};copy.id=htmlId();for(const block of copy.columns.flat()){const id=htmlId();copies[block.id]=id;block.id=id;}next.pages.find(p=>p.id===page.id)!.sections.push(copy);save(next,copies,template.widgets);requestAnimationFrame(()=>{canvasSelection.selectSection(copy.id);root.current?.querySelector(`#section-${CSS.escape(copy.id)}`)?.scrollIntoView({block:'start'});});}}
    />}
    <main className="hev-content" style={{paddingTop:editing.design?.contentTopSpacing,paddingLeft:editing.design?.contentPaddingLeft??0,paddingRight:editing.design?.contentPaddingRight??0,paddingBottom:editing.design?.contentPaddingBottom}}>
      {shared&&(!availablePages.length||!visibleSections.length)&&<p className="hn-empty">{!availablePages.length?'No shared pages yet.':'No shared sections yet.'}</p>}
      {(shared&&!availablePages.length?[]:visibleSections).map((section, sectionIndex) => <div key={section.id} className="hev-section-wrap" style={htmlSectionWrapperStyle(section)} data-inset-selected={insertPanel.enabled && canvasSelection.sectionIds.includes(section.id) || undefined}>
        {shared&&!canvasOnly&&<HtmlSectionActions section={section} pageId={page.id}/>}
        {editable && !canvasOnly && <HtmlInsertionGap kind="section" className="hev-add-section"><Button size="sm" variant={canvasSelection.mode?"ghost":"neutral"} aria-label={`Add section before ${section.name}`} leadingIcon={icon('plus')} onClick={event => openSectionInsert(sectionIndex,event.currentTarget)}>{canvasSelection.mode?undefined:'Add section'}</Button></HtmlInsertionGap>}
        <section id={`section-${section.id}`} className="hev-section" data-generating={progress?.sectionIds.includes(section.id)||undefined} aria-busy={progress?.sectionIds.includes(section.id)||undefined} data-section={section.id} data-section-name={section.name} data-locked={section.locked||undefined} data-appearance={section.appearance} style={{ ...htmlSectionStyle(section),transformOrigin:'center',background: section.background, '--hev-padding': `${section.padding}px`, '--hev-padding-top':`${section.paddingTop??section.padding}px`, '--hev-padding-bottom':`${section.paddingBottom??section.padding}px`, '--hev-block-gap':`${section.blockGap??24}px`, '--hev-min-height': `${section.minHeight||0}px`, '--hev-column-gap': `${section.gap ?? (section.id==='welcome'?64:40)}px`, '--hev-content-width':section.contentWidth?`${section.contentWidth}px`:'none', '--hev-vertical-align':section.verticalAlign??(section.id==='welcome'?'center':'start') } as CSSProperties}>
          {editable && <header className="hev-section-tools"><span>{section.name}</span><div><Tooltip label="Section design"><Button size="sm" variant="ghost" aria-label={`Design ${section.name} section`} onClick={() => { setSectionDesign(section.id); host.panelChanged(`section-${section.id}`, true); }}>{icon('paintbrush-vertical')}</Button></Tooltip><Dropdown align="end" width={208} listHeight="auto" items={[{ id: 'rename', label: 'Rename section' }, { id: 'duplicate', label: 'Duplicate section' }, { id: 'up', label: 'Move up', disabled: sectionIndex === 0 }, { id: 'down', label: 'Move down', disabled: sectionIndex === page.sections.length - 1 }, { id: 'delete', label: 'Delete section' }]} onChange={action => sectionAction(action, section)} trigger={<Button size="sm" variant="ghost" aria-label={`${section.name} section options`}>{icon('ellipsis')}</Button>} /></div></header>}
          <div className="hev-columns" data-columns={section.columns.length} data-resizing={resize?.id===section.id||undefined} style={{gridTemplateColumns:(resize?.id===section.id?resize.weights:sectionWeights(section)).map(w=>`minmax(0, ${w}fr)`).join(" ")}}>{section.columns.map((column, c) => <div className="hev-column" key={c}>
            {column.map((block, index) => <div className="hev-block-wrap" key={block.id} data-position={block.editor?.position} style={{paddingBottom:block.editor?.position==='absolute'?undefined:Math.max(0,block.editor?.y||0)+(block.editor?.spacingAfter??0)}}>
              {insertion(section.id, c, index)}
              <div id={`block-${block.id}`} className="hev-block" data-image-hidden={block.kind==='image'&&block.editor?.appearance?.imageVisible===false||undefined} data-generating={progress?.blockIds.includes(block.id)||undefined} aria-busy={progress?.blockIds.includes(block.id)||undefined} style={htmlFrameStyle(block)} data-editing={canvasSelection.editingId===block.id||undefined} data-locked={block.editor?.locked||undefined} draggable={!canvasSelection.mode && editable && ['image','pdf','media'].includes(block.kind)} onDragStart={e=>{if(!editable)return;e.stopPropagation();e.dataTransfer.setData('application/x-asset-block',block.id);e.dataTransfer.effectAllowed='move';setDragging(block.id);}} onDragEnd={()=>{setDragging(undefined);setDrop('');}} data-kind={block.kind} data-list={block.kind==='text'?block.value.list:undefined} data-play-icon={block.kind==='image'&&block.value.playIcon||undefined} data-style={block.kind === 'text' ? block.value.style : undefined} data-selected={(canvasSelection.enabled?canvasSelection.ids.includes(block.id):selected?.id === `block-${block.id}`) || undefined} onClick={e => { if (editable) setSelected((e.target as HTMLElement).closest('[data-workspace-widget]') ?? e.currentTarget); }}>
                {editable && <div className="hev-block-tools"><Tooltip label="Drag to move"><button type="button" className="hev-drag" draggable aria-label={`Move ${contentTypes.find(t => t.id === block.kind)?.label}`} onDragStart={e => { e.dataTransfer.setData('application/x-asset-block', block.id); e.dataTransfer.effectAllowed = 'move'; setDragging(block.id); }} onDragEnd={() => { setDragging(undefined); setDrop(''); }}>{icon('grip-vertical')}</button></Tooltip><Dropdown width={190} align="end" listHeight="auto" items={[{ id: 'up', label: 'Move up', disabled: index === 0 }, { id: 'down', label: 'Move down', disabled: index === column.length - 1 }, ...(block.kind === 'cta' ? [{ id: 'edit', label: 'Edit button' }] : []), ...(block.kind === 'pdf' ? [{ id: 'replace', label: 'Replace PDF' }] : []), { id: 'delete', label: 'Delete block' }]} onChange={action => { if (action === 'edit' && block.kind === 'cta') setButtonEdit(block); else if (action === 'delete') removeBlock(block.id); else if (action === 'replace') pickFile(block.id, 'pdf'); else save(moveHtmlBlock(stateRef.current, block.id, section.id, c, action === 'up' ? index - 1 : index + 2)); }} trigger={<Button size="sm" variant="ghost" aria-label={`${contentTypes.find(t => t.id === block.kind)?.label} block options`}>{icon('ellipsis')}</Button>} /></div>}
                <EditorWidgetToolbarContext.Provider value={canvasSelection.mode?{host:canvasSelection.ids.length===1&&canvasSelection.ids[0]===block.id?canvasSelection.widgetToolbarHost:null,identityHost:canvasSelection.ids.length===1&&canvasSelection.ids[0]===block.id?canvasSelection.widgetIdentityHost:null,advancedDesign:canvasSelection.ids.length===1&&canvasSelection.ids[0]===block.id?canvasSelection.widgetDesign:null,disabled:!!block.editor?.locked||!!section.locked}:null}><div className="hcs-block-content" inert={canvasSelection.enabled && (canvasSelection.editingId!==block.id || block.editor?.locked) || undefined}>
                {block.kind === 'text' && (insertPanel.enabled ? <HtmlTextSlashMenu editable={editable && (!canvasSelection.mode || canvasSelection.editingId === block.id) && !block.editor?.locked} empty={!block.value.runs.some(run => run.text.trim())}><EditorTextBlock toolbarHost={canvasSelection.mode ? canvasSelection.textToolbarHost : undefined} value={block.value} editable={editable && (!canvasSelection.mode || canvasSelection.editingId === block.id) && !block.editor?.locked} onChange={value => blockChange(block.id, { ...block, value })} /></HtmlTextSlashMenu> : <div className="ewb-root" onKeyDownCapture={event => {
                  if (event.key !== '/' || !editable) return;
                  const target = event.target as HTMLElement;
                  if (!target.isContentEditable) return;
                  const selection = window.getSelection();
                  if (!selection?.rangeCount || !selection.isCollapsed) return;
                  const range = selection.getRangeAt(0).cloneRange(); range.selectNodeContents(target); range.setEnd(selection.anchorNode!, selection.anchorOffset);
                  if ((range.toString().split('\n').at(-1) ?? '').trim()) return;
                  event.preventDefault(); setInsertAt(`${section.id}:${c}:${index + 1}`);
                }}><EditorTextBlock toolbarHost={canvasSelection.mode ? canvasSelection.textToolbarHost : undefined} value={block.value} editable={editable && (!canvasSelection.mode || canvasSelection.editingId === block.id) && !block.editor?.locked} onChange={value => blockChange(block.id, { ...block, value })} /></div>)}
                {block.kind === 'image' && <div className="ewb-root"><EditorImageBlock value={{...block.value,src:imageSources[block.value.src]??block.value.src}} editable={editable && !canvasSelection.mode} onChange={value => blockChange(block.id, { ...block, value:{...value,src:value.src===(imageSources[block.value.src]??block.value.src)?block.value.src:value.src} })} onReplace={() => pickFile(block.id, 'image')} onRemove={() => removeBlock(block.id)} /></div>}
                {block.kind === 'pdf' && <button type="button" className="hev-pdf" onClick={() => setPdf(block)}><span className="hev-pdf-icon"><Icon name="file-text" size={24} /></span><span><strong>{block.name}</strong><small>PDF document</small></span><span className="hev-pdf-open">View PDF {icon('arrow-up-right')}</span></button>}
                {block.kind === 'contacts' && <WorkspaceContactCard id={block.id} name="Sam Taylor" role="Customer success" email="sam@example.com" layout="horizontal" />}
                {block.kind === 'tasks' && <WorkspaceTasks id={block.id} title="Rollout tasks" tasks={rolloutTasks} />}
                {block.kind === 'cta' && <a className="hev-cta" href={block.href} onClick={e => { if (block.href.startsWith('#')) { e.preventDefault(); followAnchor(block.href); } }} onDoubleClick={e => { if (editable) { e.preventDefault(); setButtonEdit(block); } }} style={block.leadingIcon?{height:block.editor?.height,background:block.editor?.appearance?.background??block.editor?.appearance?.fill,color:block.color,fontSize:block.editor?.appearance?.fontSize,fontWeight:block.editor?.appearance?.fontWeight,borderRadius:block.editor?.appearance?.radius}:undefined} data-leading-icon={block.leadingIcon||undefined}>{block.leadingIcon?<span className="hev-cta-label"><Icon name={block.leadingIcon} size={block.editor?.appearance?.fontSize??24} fill={block.leadingIcon==='play'?'currentColor':'none'}/>{block.label}</span>:<>{block.label}{icon('arrow-right')}</>}</a>}
                {block.kind === 'synced' && <WorkspaceSyncedSection id={block.id} />}
                {block.kind === 'inventory' && block.content && <HtmlEditorInventory id={block.id} content={block.content} onChange={content=>blockChange(block.id,{...block,content})} />}
                {block.kind === 'toggle' && <details className="hev-toggle"><summary><span contentEditable={editable} suppressContentEditableWarning onBlur={e=>blockChange(block.id,{...block,title:e.currentTarget.textContent||'Learn more'})}>{block.title}</span></summary><div contentEditable={editable} suppressContentEditableWarning onBlur={e=>blockChange(block.id,{...block,body:e.currentTarget.textContent||''})}>{block.body}</div></details>}
                {block.kind === 'code' && <pre className="hev-code"><code contentEditable={editable} suppressContentEditableWarning onBlur={e=>blockChange(block.id,{...block,code:e.currentTarget.textContent||''})}>{block.code}</code></pre>}
                {block.kind === 'media' && <HtmlMedia block={block} canvasOnly={canvasOnly} editable={editable} />}
                {block.kind==='shape'&&block.icon&&<LucideGlyph name={block.icon} size={block.editor?.height??32} fill={block.filled?'currentColor':'none'} style={{display:'block',width:'100%',height:block.editor?.height??32,color:block.editor?.appearance?.fill??'var(--ui-text)'}}/>}
                {block.kind === 'shape' && !block.icon && <PresentationShapeSurface className="hcs-shape" shape={{kind:block.shape,width:320,height:elementContentHeight(block.editor?.height??160,{...block.editor?.appearance,borderWidth:0}),appearance:block.editor?.appearance}} style={{width:'100%',height:elementContentHeight(block.editor?.height??160,{...block.editor?.appearance,borderWidth:0})}}/>}
                {block.kind === 'divider' && <hr className="hev-divider" />}
                </div></EditorWidgetToolbarContext.Provider>
                {progress?.images.filter(image=>image.shapeId===block.id).map((image,index)=><HtmlImageProgress key={index} image={image} existing={block.kind==='image'}/>)}
              </div>
            </div>)}
            {c===0 && progress?.images.filter(image=>image.pageId===section.id && !section.columns.flat().some(b=>b.id===image.shapeId)).map((image,index)=><div key={index} className="hcs-image-pending" data-generating style={{aspectRatio:`${image.width}/${image.height}`}}><HtmlImageProgress image={image}/></div>)}
            {insertion(section.id, c, column.length, column.length===0)}
          </div>)}{editable && section.columns.slice(1).map((_,divider)=>{
            const weights=resize?.id===section.id?resize.weights:sectionWeights(section), position=weights.slice(0,divider+1).reduce((sum,w)=>sum+w,0);
            return <button key={divider} type="button" className="hev-column-resizer" role="separator" aria-label={`Resize columns in ${section.name}`} aria-orientation="vertical" aria-valuemin={10} aria-valuemax={90} aria-valuenow={Math.round(position)} style={{left:`calc(${position}% + var(--hev-column-gap, 40px) * ${divider+.5-position/100*(section.columns.length-1)})`}} onPointerDown={e=>beginResize(e,section,divider)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={()=>{resizeSession.current=undefined;setResize(undefined);}} onDoubleClick={()=>sectionChange(section.id,s=>{s.weights=undefined;})} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();sectionChange(section.id,s=>{s.weights=resizeSectionColumns(s,divider,e.key==='ArrowRight'?2:-2);});}}}><span/></button>;
          })}</div>
        </section>
      </div>)}
      {editable && !canvasOnly && <HtmlInsertionGap kind="section" className="hev-add-section hev-add-section--last"><Button size="sm" variant={canvasSelection.mode?"ghost":"neutral"} aria-label="Add section at end" leadingIcon={icon('plus')} onClick={event => openSectionInsert(page.sections.length,event.currentTarget)}>{canvasSelection.mode?undefined:'Add section'}</Button></HtmlInsertionGap>}
      {error && <p className="hev-error" role="alert">{error}</p>}
    </main></div>
    {canvasSelection.ui}
    <input ref={fileInput} hidden type="file" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
    {uploadError&&<Dialog open size="sm" ariaLabel="Image upload" onClose={()=>setUploadError('')}><DialogHeader title="Image upload" onClose={()=>setUploadError('')}/><DialogBody><p role="alert">{uploadError}</p></DialogBody><DialogFooter><Button variant="primary" onClick={()=>setUploadError('')}>OK</Button></DialogFooter></Dialog>}
    {rename && <Dialog open onClose={() => setRename(undefined)} size="sm" ariaLabel={rename.id ? `Rename ${rename.type}` : 'Add page'}><form className="hev-dialog-form" onSubmit={e => { e.preventDefault(); finishRename(); }}><DialogHeader title={rename.id ? `Rename ${rename.type}` : 'Add page'} onClose={() => setRename(undefined)} /><DialogBody><label className="hev-field">Name<Input autoFocus value={rename.name} maxLength={100} onChange={e => setRename({ ...rename, name: e.target.value })} placeholder="Page name" /></label></DialogBody><DialogFooter><Button variant="neutral" onClick={() => setRename(undefined)}>Cancel</Button><Button type="submit" variant="primary" disabled={!rename.name.trim()}>{rename.id ? 'Save' : 'Add page'}</Button></DialogFooter></form></Dialog>}
    {buttonEdit && <Dialog open onClose={() => setButtonEdit(undefined)} size="sm" ariaLabel="Edit button"><form className="hev-dialog-form" onSubmit={e => { e.preventDefault(); const result = htmlEditorSchema.safeParse({ version: 1, pages: [{ id: 'button-check', name: 'Check', sections: [{ id: 'button-section', name: 'Check', background: '#ffffff', padding: 40, columns: [[buttonEdit]] }] }] }); if (!result.success) { setError('Enter a page anchor or a valid web URL.'); return; } blockChange(buttonEdit.id, buttonEdit); setButtonEdit(undefined); }}><DialogHeader title="Edit button" onClose={() => setButtonEdit(undefined)} /><DialogBody><div className="hev-button-fields"><label className="hev-field">Label<Input autoFocus value={buttonEdit.label} onChange={e => setButtonEdit({ ...buttonEdit, label: e.target.value })} /></label><label className="hev-field">Link<Input value={buttonEdit.href} onChange={e => setButtonEdit({ ...buttonEdit, href: e.target.value })} /></label>{error && <p role="alert" className="hev-error">{error}</p>}</div></DialogBody><DialogFooter><Button variant="neutral" onClick={() => setButtonEdit(undefined)}>Cancel</Button><Button type="submit" variant="primary">Save</Button></DialogFooter></form></Dialog>}
    {insertPDF && <Dialog open onClose={() => setInsertPDF(undefined)} size="sm" ariaLabel="Add PDF"><DialogHeader title="Add PDF" onClose={() => setInsertPDF(undefined)} /><DialogBody><button type="button" className="hev-upload-pdf" onClick={() => pickFile(insertPDF, 'pdf')}><Icon name="upload" size={24} /><strong>Upload a PDF</strong><span>Choose a file from your computer</span></button>{error && <p className="hev-error" role="alert">{error}</p>}</DialogBody><DialogFooter><Button variant="ghost" onClick={() => { insertBlock(insertPDF.section, insertPDF.column, insertPDF.index, newHtmlBlock('pdf')); setInsertPDF(undefined); }}>Use sample PDF</Button><Button variant="neutral" onClick={() => setInsertPDF(undefined)}>Cancel</Button></DialogFooter></Dialog>}
    {mediaInsert && <Dialog open size="sm" onClose={()=>setMediaInsert(undefined)} ariaLabel={`Add ${mediaInsert.format.toLowerCase()}`}><form className="hev-dialog-form" onSubmit={e=>{e.preventDefault();const src=mediaInsert.url.trim();if(!/^https?:\/\/[^\s<>]+$/.test(src)){setError('Enter a valid web URL.');return;}const {section,column,index,format,name}=mediaInsert;insertBlock(section,column,index,format==='Image'?{id:htmlId(),kind:'image',value:{src,alt:name,caption:'',alignment:'center',width:100}}:{id:htmlId(),kind:'media',format:format as 'Link'|'File'|'Video'|'Embed'|'iFrame',name:name||new URL(src).hostname,src});setMediaInsert(undefined);}}><DialogHeader title={`Add ${mediaInsert.format.toLowerCase()}`} onClose={()=>setMediaInsert(undefined)}/><DialogBody><div className="hev-button-fields"><label className="hev-field">URL<Input autoFocus type="url" placeholder="https://" value={mediaInsert.url} onChange={e=>setMediaInsert({...mediaInsert,url:e.target.value})}/></label><label className="hev-field">Name<Input placeholder="Optional" value={mediaInsert.name} onChange={e=>setMediaInsert({...mediaInsert,name:e.target.value})}/></label>{error&&<p className="hev-error" role="alert">{error}</p>}</div></DialogBody><DialogFooter>{mediaInsert.format==='Image'&&<Button variant="ghost" onClick={()=>{const block=newHtmlBlock('image');insertBlock(mediaInsert.section,mediaInsert.column,mediaInsert.index,block);setMediaInsert(undefined);pickFile(block.id,'image');}}>Upload image</Button>}<Button variant="neutral" onClick={()=>setMediaInsert(undefined)}>Cancel</Button><Button variant="primary" type="submit" disabled={!mediaInsert.url.trim()}>Insert</Button></DialogFooter></form></Dialog>}
    {pdf && <Dialog open onClose={() => setPdf(undefined)} size="lg" ariaLabel={pdf.name}><DialogHeader title={pdf.name} onClose={() => setPdf(undefined)} /><DialogBody><HtmlEditorPdf src={pdf.src} /></DialogBody></Dialog>}
    {editable && design && host.panelHost && host.activeId === `section-${design.id}` && createPortal(<aside className="hev-inspector"><header><strong>Section design</strong><Button variant="ghost" size="sm" aria-label="Close section design" onClick={host.closePanel}>{icon('panel-right')}</Button></header><div className="hev-inspector-body"><label className="hev-field">Section name<Input value={design.name} onChange={e => { if (e.target.value.trim()) sectionChange(design.id, s => { s.name = e.target.value; }); }} /></label><div className="hev-setting"><span>Columns</span><Dropdown value={String(design.columns.length)} items={[{ id: '1', label: 'One column' }, { id: '2', label: 'Two columns' }, { id: '3', label: 'Three columns' }]} onChange={value => sectionChange(design.id, s => { const count=Number(value); if(count<s.columns.length) s.columns=[...s.columns.slice(0,count-1),s.columns.slice(count-1).flat()]; else while(s.columns.length<count)s.columns.push([]); s.weights=undefined; })} trigger={<Button variant="neutral" size="sm" trailingIcon={icon('chevron-down')}>{['One column','Two columns','Three columns'][design.columns.length-1]}</Button>} /></div><div className="hev-setting"><span>Background</span><ColorPicker value={design.background} onChange={value => { if (/^#[0-9a-fA-F]{6}$/.test(value)) sectionChange(design.id, s => { s.background = value; }); }} /></div><label className="hev-setting"><span>Padding</span><Input aria-label="Section padding" type="number" min={0} max={160} step={4} value={design.padding} onChange={e => { const value = Number(e.target.value); if (value >= 0 && value <= 160) sectionChange(design.id, s => { s.padding = value; }); }} /></label><label className="hev-setting"><span>Spacing after</span><Input aria-label="Section spacing after" type="number" min={0} max={400} step={4} value={design.spacingAfter??0} onChange={e=>{const value=Number(e.target.value);if(value>=0&&value<=400)sectionChange(design.id,s=>{s.spacingAfter=value;});}}/></label><label className="hev-setting"><span>Column gap</span><Input aria-label="Column gap" type="number" min={0} max={160} step={4} value={design.gap??(design.id==='welcome'?64:40)} onChange={e=>{const value=Number(e.target.value);if(value>=0&&value<=160)sectionChange(design.id,s=>{s.gap=value;});}}/></label>
      <div className="hev-setting"><span>Content width</span><Dropdown value={design.contentWidth?'contained':'full'} items={[{id:'full',label:'Full width'},{id:'contained',label:'Contained'}]} onChange={value=>sectionChange(design.id,s=>{s.contentWidth=value==='full'?null:1120;})} trigger={<Button variant="neutral" size="sm" trailingIcon={icon('chevron-down')}>{design.contentWidth?'Contained':'Full width'}</Button>}/></div>
      {design.contentWidth&&<label className="hev-setting"><span>Max width</span><Input aria-label="Content max width" type="number" min={320} max={1800} step={40} value={design.contentWidth} onChange={e=>{const value=Number(e.target.value);if(value>=320&&value<=1800)sectionChange(design.id,s=>{s.contentWidth=value;});}}/></label>}
      <div className="hev-setting"><span>Alignment</span><div className="hev-alignment">{(['start','center','end'] as const).map((value,i)=><Tooltip key={value} label={['Top','Center','Bottom'][i]}><Button size="sm" variant="ghost" aria-label={`Align columns ${['top','center','bottom'][i]}`} aria-pressed={(design.verticalAlign??(design.id==='welcome'?'center':'start'))===value} onClick={()=>sectionChange(design.id,s=>{s.verticalAlign=value;})}>{icon(['align-start-horizontal','align-center-horizontal','align-end-horizontal'][i])}</Button></Tooltip>)}</div></div>
      <Button variant="neutral" onClick={()=>{host.closePanel();setInsertAt(`${design.id}:0:${design.columns[0].length}`);}}>Add content</Button>
      </div></aside>, host.panelHost)}
  </div></WorkspaceInteractionContext.Provider>;
}
HtmlEditorV1.workspaceWidget = true;

function HtmlMedia({block,canvasOnly=false,editable=false}:{block:Extract<HtmlBlock,{kind:'media'}>;canvasOnly?:boolean;editable?:boolean}) {
 if(canvasOnly&&!editable&&block.format==='Video'&&block.poster)return <img className="hev-media-frame" src={block.poster} alt={block.name} style={{height:block.editor?.height,objectFit:block.editor?.appearance?.imageFit??'cover'}}/>;
 let src=block.src;
 try { const url=new URL(src);if(url.hostname==='youtu.be')src=`https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;else if(url.hostname.endsWith('youtube.com')&&url.searchParams.get('v'))src=`https://www.youtube-nocookie.com/embed/${url.searchParams.get('v')}`;else if(url.hostname==='vimeo.com')src=`https://player.vimeo.com/video/${url.pathname.slice(1)}`; } catch { /* Relative assets use the original URL. */ }
 if(block.format==='Video'&&(/\.(mp4|webm|ogg|mov)(?:\?|$)/i.test(src)||src.startsWith('data:video/')))return <video className="hev-media-frame" aria-label={block.name} style={canvasOnly?{height:block.editor?.height,objectFit:block.editor?.appearance?.imageFit??'cover'}:undefined} src={src} poster={block.poster} controls={!canvasOnly} autoPlay={canvasOnly&&editable} muted={canvasOnly} loop={canvasOnly} playsInline preload={editable?'auto':'metadata'}/>;
 if(['Video','Embed','iFrame'].includes(block.format))return <div className="hev-embed"><iframe className="hev-media-frame" title={block.name} src={src} sandbox="allow-scripts allow-same-origin allow-presentation" allow="fullscreen" loading="lazy"/><a href={block.src} target="_blank" rel="noreferrer">{block.name}{icon('arrow-up-right')}</a></div>;
 return <a className="hev-link-card" href={block.src} target="_blank" rel="noreferrer"><span className="hev-link-icon">{icon(block.format==='File'?'file':'link')}</span><span><strong>{block.name}</strong><small>{block.format==='File'?'Open file':block.src}</small></span>{icon('arrow-up-right')}</a>;
}
