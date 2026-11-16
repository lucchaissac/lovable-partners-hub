import { createContext, useContext, useState, type CSSProperties } from 'react';
import { Button, Dialog, DialogBody, DialogFooter, DialogHeader, Dropdown, FormField, Icon, Input, Tabs, TabsItem, TabsList, TabsTrigger, TabsTriggerIcon, Tooltip } from '@asset/ui';
import { htmlPageIcons } from './htmlNavigationModel';
import { htmlId, htmlPageSchema, initialHtmlEditor, type HtmlPage } from './htmlEditorModel';
import { WorkspaceEditingContext } from './WorkspaceAssets';
import type { z } from 'zod';
import { workspaceWidgetsSchema } from './workspaceWidgets';
import { HtmlNavigationDesign } from './HtmlNavigationDesign';
import './html-page-navigation.css';

export const HtmlEditorSharedContext = createContext(false);
const icon = (name: string) => <Icon name={name} size={16}/>;
const separator = {kind:'separator' as const};
type WorkspaceWidgets = z.infer<typeof workspaceWidgetsSchema>;
type Template = {page:HtmlPage;widgets:WorkspaceWidgets};
const templateKey='asset-html-page-templates-v1';
function readTemplates():Template[] {
  try {return JSON.parse(localStorage.getItem(templateKey)||'[]').slice(0,20).map((t:Template)=>({page:htmlPageSchema.parse(t.page),widgets:workspaceWidgetsSchema.parse(t.widgets)}));}catch{return [];}
}
export function HtmlPageNavigation({ pages, page, editable, onSelect, onAction, onPatch, onAdd, onAskAI }: {
  pages:HtmlPage[]; page:HtmlPage; editable:boolean; onSelect:(id:string)=>void;
  onAction:(action:string,page:HtmlPage)=>void; onPatch:(id:string,patch:Partial<HtmlPage>)=>void;
  onAdd:(page:HtmlPage,widgets?:WorkspaceWidgets)=>void; onAskAI:(navigation:boolean)=>void;
}) {
  const editing=useContext(WorkspaceEditingContext);
  const [dialog,setDialog]=useState<{kind:string;page:HtmlPage}>();
  const [notice,setNotice]=useState(''),[url,setURL]=useState(''),[name,setName]=useState('');
  const [templates,setTemplates]=useState<Template[]>(readTemplates);
  const [draft,setDraft]=useState(editing.design?.navigation||{});
  const design=dialog?.kind==='design'?draft:editing.design?.navigation||{};
  const variant=design.variant||'underline';
  const limit=pages.length>=20;
  const style={background:design.background||'var(--ui-bg)',color:design.text,justifyContent:design.alignment==='center'?'safe center':design.alignment==='right'?'safe flex-end':'flex-start',boxShadow:!design.shadow||design.shadow==='hairline'?'0 1px 0 color-mix(in srgb, var(--ui-text) 10%, transparent)':design.shadow!=='none'?`var(--ui-shadow-${design.shadow})`:'none','--hn-text':design.text||'var(--ui-text-muted)','--hn-active-text':design.activeText||'var(--ui-text)','--hn-active-bg':design.activeBackground||'var(--ui-bg-muted)','--hn-pill-bg':design.pillBackground||'var(--ui-bg-subtle)','--hn-indicator':design.indicator||'var(--ui-accent)'} as CSSProperties;
  const action=(action:string,target:HtmlPage)=>{
    if(action==='hide')onPatch(target.id,{hidden:!target.hidden});
    else if(action==='copy-id')navigator.clipboard.writeText(target.id).then(()=>setNotice('Page ID copied'),()=>setNotice('Could not copy page ID'));
    else if(action==='template'){
      const ids=new Set(target.sections.flatMap(s=>s.columns.flat().map(b=>b.id)));
      const value=[...templates,{page:structuredClone(target),widgets:Object.fromEntries(Object.entries(editing.widgets||{}).filter(([id])=>ids.has(id)))}].slice(-20);
      try{localStorage.setItem(templateKey,JSON.stringify(value));setTemplates(value);setNotice('Page saved to templates on this browser.');}catch{setNotice('Could not save the template. Browser storage is full.');}
    }else if(action==='pdf'){onSelect(target.id);requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()));}
    else if(action==='design'){setDraft(editing.design?.navigation||{});setDialog({kind:'design',page:target});}
    else if(action==='ai')onAskAI(true);
    else if(['icon','access','automation','delete'].includes(action))setDialog({kind:action,page:target});
    else onAction(action,target);
  };
  const add=(action:string)=>{
    if(action==='new'){onAction('new',page);return;}
    if(action==='ai'){onAskAI(false);return;}
    setURL('');setName('');setDialog({kind:action,page});
  };
  const patch=(value:Partial<HtmlPage>)=>{if(dialog)onPatch(dialog.page.id,value);setDialog(undefined);};
  const destination=dialog&&pages.find(p=>p.id===dialog.page.id)||dialog?.page;
  const externalValid=!!name.trim()&&/^https?:\/\/[^\s<>]+$/.test(url)&&(()=>{try{return !!new URL(url).hostname;}catch{return false;}})();
  return <>
    <nav className="hev-pages hn-pages" aria-label="Workspace pages" style={style} data-variant={variant} data-editable={editable||undefined}>
      <Tabs value={page.id} onValueChange={id=>{const target=pages.find(p=>p.id===id);if(target?.externalUrl){window.open(target.externalUrl,'_blank','noopener,noreferrer');return;}onSelect(id);}} variant={variant}>
        <TabsList>{pages.map((p,index)=><TabsItem className="hn-page-tab" key={p.id} data-hidden={p.hidden||undefined} data-default-icon={p.icon===null||undefined}>
          <TabsTrigger value={p.id}><TabsTriggerIcon>{icon(p.icon===null?'file':p.icon||'file-text')}</TabsTriggerIcon><span className="hn-page-label">{p.name}</span></TabsTrigger>
          {editable&&<><div className="hn-page-options"><Tooltip label="Page options" side="bottom"><Dropdown width={240} listHeight="auto" align="start" items={[
            {id:'rename',label:'Edit name',leadingIcon:icon('pencil')},{id:'icon',label:'Add icon',leadingIcon:icon('image')},separator,
            {id:'hide',label:p.hidden?'Show':'Hide',leadingIcon:icon(p.hidden?'eye':'eye-off')},{id:'access',label:'Control access',leadingIcon:icon('shield')},separator,
            {id:'template',label:'Save as template',leadingIcon:icon('layout-template')},{id:'duplicate',label:'Duplicate page',leadingIcon:icon('copy'),disabled:limit},separator,
            {id:'automation',label:'Create automation',leadingIcon:icon('sparkles')},{id:'copy-id',label:'Copy ID',leadingIcon:icon('code')},separator,
            {id:'pdf',label:'Export page to PDF',leadingIcon:icon('download'),disabled:!!p.externalUrl},separator,
            {id:'design',label:'Navigation design',leadingIcon:icon('paintbrush-vertical')},{id:'ai',label:'Edit tabs with AI',leadingIcon:icon('sparkles')},separator,
            {id:'left',label:'Move left',leadingIcon:icon('arrow-left'),disabled:index===0},{id:'right',label:'Move right',leadingIcon:icon('arrow-right'),disabled:index===pages.length-1},separator,
            {id:'delete',label:'Delete',leadingIcon:icon('trash-2'),disabled:pages.length===1},
          ]} onChange={value=>action(value,p)} trigger={<Button variant="ghost" size="sm" aria-label={`Page options for ${p.name}`} leadingIcon={icon('ellipsis')}/>}/></Tooltip></div>
          <Tooltip label={p.hidden?'Show page':'Hide page'} side="bottom"><Button className="hn-page-visibility" data-page-hidden={!!p.hidden} variant="ghost" size="sm" aria-label={`${p.hidden?'Show page':'Hide page'}: ${p.name}`} leadingIcon={icon(p.hidden?'eye-off':'eye')} onClick={()=>action('hide',p)}/></Tooltip></>}
        </TabsItem>)}</TabsList>
        {editable&&<Dropdown width={208} items={[
          {id:'new',label:'New page',leadingIcon:icon('file-plus'),disabled:limit},{id:'templates',label:'Template page',leadingIcon:icon('copy'),disabled:limit},
          {id:'asset',label:'Asset templates',leadingIcon:icon('panels-top-left'),disabled:limit},{id:'ai',label:'Create with AI',leadingIcon:icon('sparkles'),disabled:limit},separator,
          {id:'external',label:'External link',leadingIcon:icon('globe'),disabled:limit},
        ]} onChange={add} trigger={<Button className="hn-page-add" size="sm" variant="ghost" aria-label="Add page" title="Add page" leadingIcon={icon('plus')}/>}/>}
      </Tabs>
    </nav>
    {notice&&<div className="hn-notice" role="status">{notice}<Button size="sm" variant="ghost" aria-label="Dismiss page notice" leadingIcon={icon('x')} onClick={()=>setNotice('')}/></div>}
    {dialog&&<Dialog open onClose={()=>setDialog(undefined)} width={dialog.kind==='design'?420:460} ariaLabel={dialog.kind==='design'?'Navigation design':'Page settings'}>
      <DialogHeader title={{icon:'Page icon',access:'Control access',automation:'Create automation',delete:'Delete page',design:'Navigation design',templates:'Template page',asset:'Asset templates',external:'External link'}[dialog.kind]||'Page settings'} onClose={()=>setDialog(undefined)}/>
      <DialogBody>
        {dialog.kind==='icon'&&<><div className="hn-icon-grid">{htmlPageIcons.map(name=><Button key={name} variant={destination?.icon===name?'primary':'neutral'} aria-label={`Use ${name} icon`} onClick={()=>patch({icon:name})}>{icon(name)}</Button>)}</div><Button variant="ghost" onClick={()=>patch({icon:null})}>Remove icon</Button></>}
        {dialog.kind==='access'&&<><p className="hn-help">Choose the audience for this demo page. Access enforcement requires a connected workspace.</p><div className="hn-options">{([['everyone','Everyone in workspace'],['team','Team only'],['invited','Invited people only']] as const).map(([id,label])=><Button key={id} variant={(destination?.access||'everyone')===id?'primary':'neutral'} onClick={()=>patch({access:id})}>{label}</Button>)}</div></>}
        {dialog.kind==='automation'&&<><p className="hn-help">Choose a demo automation. Running automations requires a connected workspace.</p><div className="hn-options">{([['viewed','Notify team when page is viewed'],['completed','Create follow-up when tasks complete']] as const).map(([id,label])=><Button key={id} variant={destination?.automation===id?'primary':'neutral'} onClick={()=>patch({automation:id})}>{label}</Button>)}<Button variant="ghost" onClick={()=>patch({automation:null})}>No automation</Button></div></>}
        {dialog.kind==='delete'&&<p>Delete “{destination?.name}” and its contents?</p>}
        {dialog.kind==='design'&&<HtmlNavigationDesign value={draft} onChange={setDraft} onAskAI={()=>{setDialog(undefined);onAskAI(true);}}/>}
        {(dialog.kind==='templates'||dialog.kind==='asset')&&<div className="hn-options">{(dialog.kind==='asset'?initialHtmlEditor().pages.map(page=>({page,widgets:{}})):templates).map((t,i)=><Button key={i} variant="neutral" leadingIcon={icon(t.page.icon||'file-text')} onClick={()=>{onAdd(t.page,t.widgets);setDialog(undefined);}}>{t.page.name}</Button>)}{dialog.kind==='templates'&&!templates.length&&<p className="hn-help">Save a page as a template from its page options. Templates are stored in this browser.</p>}</div>}
        {dialog.kind==='external'&&<div className="hn-options"><FormField label="Page name"><Input aria-label="External page name" value={name} maxLength={100} onChange={e=>setName(e.target.value)}/></FormField><FormField label="URL"><Input aria-label="External page URL" type="url" placeholder="https://" value={url} maxLength={2000} onChange={e=>setURL(e.target.value)}/></FormField></div>}
      </DialogBody>
      <DialogFooter><Button variant="neutral" onClick={()=>setDialog(undefined)}>Cancel</Button>
        {dialog.kind==='delete'&&<Button variant="primary" disabled={pages.length===1} onClick={()=>{onAction('delete',dialog.page);setDialog(undefined);}}>Delete page</Button>}
        {dialog.kind==='design'&&<Button variant="primary" onClick={()=>{editing.onEdit?.({type:'design',value:{...editing.design,layout:editing.design?.layout||'full-width',navigation:draft}});setDialog(undefined);}}>Save design</Button>}
        {dialog.kind==='external'&&<Button variant="primary" disabled={!externalValid} onClick={()=>{onAdd({id:htmlId(),name:name.trim(),sections:[],icon:'globe',externalUrl:url});setDialog(undefined);}}>Add link</Button>}
      </DialogFooter>
    </Dialog>}
  </>;
}
