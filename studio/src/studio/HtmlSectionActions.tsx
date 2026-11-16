import {createContext,useContext,useEffect,useState} from 'react';
import {Button,Icon,Tooltip} from '@asset/ui';
import {workspaceLocation} from './HtmlSectionNavigation';
import {htmlSectionStyle} from './htmlSectionStyle';
import type {HtmlSection} from './htmlEditorModel';

export const HtmlSectionCommentContext=createContext<((section:HTMLElement)=>void)|null>(null);

export function HtmlSectionActions({section,pageId}:{section:HtmlSection;pageId:string}){
 const comment=useContext(HtmlSectionCommentContext),[notice,setNotice]=useState('');
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),2000);return()=>clearTimeout(timer);},[notice]);
 const width=htmlSectionStyle(section).width;
 return <div className="hcs-section-share-anchor" style={{width}}><div className="hcs-section-share-actions" role="toolbar" aria-label={`${section.name} section actions`}>
  <Tooltip label={notice||'Copy section link'} side="top"><Button variant="ghost" size="sm" aria-label={`Copy link to ${section.name}`} leadingIcon={<Icon name="link" size={16}/>} onClick={()=>{const url=workspaceLocation();url.searchParams.set('htmlPage',pageId);url.hash=`section-${section.id}`;void navigator.clipboard.writeText(url.href).then(()=>setNotice('Link copied'),()=>setNotice('Could not copy link'));}}/></Tooltip>
  <Tooltip label="Comment" side="top"><Button variant="ghost" size="sm" aria-label={`Comment on ${section.name}`} leadingIcon={<Icon name="message-circle" size={16}/>} disabled={!comment} onClick={event=>{const element=event.currentTarget.closest('.hev-section-wrap')?.querySelector<HTMLElement>('.hev-section');if(element)comment?.(element);}}/></Tooltip>
  <span className="ui-sr-only" role="status">{notice}</span>
 </div></div>;
}
