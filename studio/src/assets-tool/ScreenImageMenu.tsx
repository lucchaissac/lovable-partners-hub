import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Button,Dialog,DialogBody,DialogFooter,DialogHeader,DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuList,DropdownMenuItem,DropdownMenuItemIcon,DropdownMenuItemLabel,DropdownMenuSeparator,Icon,Input,Tooltip} from '@asset/ui';
import {screenImageFromUrl} from './screenImageSource';
import './screenImageMenu.css';

/** The existing Image tool is the single entry point for local editable imports. */
export function ScreenImageMenu({disabled,onImport}:{disabled:boolean;onImport:(file:File,editable:boolean)=>Promise<boolean>}){
 const formId=useId();
 const file=useRef<HTMLInputElement>(null),request=useRef<AbortController|undefined>(undefined);
 const [editable,setEditable]=useState(true),[open,setOpen]=useState(false),[url,setUrl]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>()=>request.current?.abort(),[]);
 const close=()=>{request.current?.abort();setOpen(false);setError('');};
 const fromUrl=async()=>{
  if(loading||disabled)return;
  const abort=new AbortController();request.current=abort;setLoading(true);setError('');
  try{const image=await screenImageFromUrl(url,abort.signal);abort.signal.throwIfAborted();setOpen(false);await onImport(image,editable);}
  catch(reason){if(!abort.signal.aborted)setError(reason instanceof Error?reason.message:'Could not import the image.');}
  finally{if(request.current===abort){request.current=undefined;setLoading(false);}}
 };
 return <>
  <DropdownMenu><DropdownMenuTrigger><Button variant="ghost" aria-label="Add image" disabled={disabled||loading} leadingIcon={<Tooltip label="Image" side="bottom"><Icon name="image" size={16}/></Tooltip>}/></DropdownMenuTrigger>
   <DropdownMenuContent align="start"><DropdownMenuList>
    <DropdownMenuItem onClick={()=>file.current?.click()}><DropdownMenuItemIcon><Icon name="upload" size={16}/></DropdownMenuItemIcon><DropdownMenuItemLabel>Choose image file</DropdownMenuItemLabel></DropdownMenuItem>
    <DropdownMenuItem onClick={()=>{setUrl('');setError('');setOpen(true);}}><DropdownMenuItemIcon><Icon name="link" size={16}/></DropdownMenuItemIcon><DropdownMenuItemLabel>Import from URL</DropdownMenuItemLabel></DropdownMenuItem>
    <DropdownMenuSeparator/>
    <DropdownMenuItem closeOnSelect={false} role="menuitemcheckbox" aria-checked={editable} onClick={()=>setEditable(value=>!value)}><DropdownMenuItemIcon><Icon name={editable?'check':'square'} size={16}/></DropdownMenuItemIcon><DropdownMenuItemLabel>Make editable</DropdownMenuItemLabel></DropdownMenuItem>
   </DropdownMenuList></DropdownMenuContent>
  </DropdownMenu>
  <input ref={file} type="file" hidden accept="image/png,image/jpeg,image/webp" aria-label="Choose image file" onChange={event=>{const selected=event.target.files?.[0];event.target.value='';if(selected)void onImport(selected,editable);}}/>
  {createPortal(<Dialog open={open} onClose={close} size="sm" overlay={false} overlayClassName="screen-image-dialog" ariaLabel="Import image from URL">
   <DialogHeader title="Import from URL" onClose={close}/>
   <DialogBody><form id={formId} onSubmit={event=>{event.preventDefault();void fromUrl();}} style={{display:'grid',gap:'var(--ui-space-3)'}}><Input aria-label="Image URL" placeholder="https://…/screen.png" type="url" required value={url} disabled={loading} onChange={event=>setUrl(event.target.value)}/>{error&&<p role="alert" style={{margin:0,color:'var(--ui-text-muted)',fontSize:'var(--ui-fs-helper)'}}>{error}</p>}</form></DialogBody>
   <DialogFooter><Button variant="neutral" type="button" onClick={close}>Cancel</Button><Button variant="primary" type="submit" form={formId} disabled={!url.trim()||disabled} loading={loading}>Import</Button></DialogFooter>
  </Dialog>,document.body)}
 </>;
}
