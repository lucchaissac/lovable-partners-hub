import {useState} from 'react';
import {Button,Tooltip} from '@asset/ui';
import {LucideGlyph} from '../studio/LucideGlyph';

export function MakerExpandButton(){
 const [expanded,setExpanded]=useState(false);
 if(window.parent===window)return null;
 const label=expanded?'Restore studio':'Expand studio';
 return <span className="maker-expand-control"><Tooltip label={label} side="bottom"><Button variant="ghost" aria-label={label} aria-pressed={expanded} leadingIcon={<LucideGlyph name={expanded?'minimize-2':'maximize-2'} size={16}/>} onClick={()=>{
  const next=!expanded;setExpanded(next);window.parent.postMessage({type:'lovable-studio-expanded',expanded:next},window.location.origin);
 }}/></Tooltip></span>;
}
