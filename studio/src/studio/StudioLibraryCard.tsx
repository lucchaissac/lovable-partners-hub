import type {ReactNode} from 'react';
import {Avatar} from '@asset/ui';

export function editedLabel(date:string) {
  if(!date)return 'Asset template';
  const timestamp=new Date(date),today=new Date();
  const days=Math.round((new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime()-new Date(timestamp.getFullYear(),timestamp.getMonth(),timestamp.getDate()).getTime())/86400000);
  if(days<=0)return 'Edited today';
  if(days===1)return 'Edited yesterday';
  if(days<7)return `Edited ${days} days ago`;
  return `Edited ${timestamp.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;
}

/** Shared gallery tile for prototypes and editable assets. */
export function StudioLibraryCard({title,thumbnail,caption,author,avatarUrl,disabled,onOpen,actions}:{title:string;thumbnail:ReactNode;caption:ReactNode;author:string;avatarUrl?:string;disabled?:boolean;onOpen:()=>void;actions?:ReactNode}) {
  return <article className="studio-prototype-card">
    <button type="button" className="ui-reset studio-prototype-open" disabled={disabled} onClick={onOpen}>
      {thumbnail}
      <span className="studio-prototype-info"><Avatar name={author} src={avatarUrl} size="lg" tone="muted"/><span className="studio-prototype-caption"><strong>{title}</strong><span>{caption}</span></span></span>
    </button>
    {actions&&<span className="studio-prototype-actions">{actions}</span>}
  </article>;
}
