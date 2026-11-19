import {useMemo,useRef,useState,type DragEvent,type KeyboardEvent} from 'react';
import {Button,Icon,Tooltip,DropdownMenu,DropdownMenuContent,DropdownMenuList,DropdownMenuItem,DropdownMenuItemIcon,DropdownMenuItemLabel} from '@asset/ui';
import {nativeDocument} from './nativeDocument';
import {useMakerDesign} from './MakerDesignContext';
import {canvasLayers,visibleCanvasLayers,canvasLayerRange,canvasLayerName,reorderCanvasLayers,canvasLayerAction,type CanvasLayerAction,type CanvasLayer} from './canvasLayers';
import {LucideGlyph} from '../studio/LucideGlyph';
import {htmlLayerOrder} from '../studio/htmlLayerOrder';
import type {AssetDocument} from './model';
import type {HtmlBlock} from '../studio/htmlEditorModel';
import './canvasLayers.css';

const layerIcon=(block:HtmlBlock)=>block.kind==='text'?'type':block.kind==='image'?'image':block.kind==='media'?'video':block.kind==='shape'&&block.shape==='line'?'minus':block.kind==='shape'&&block.icon?'smile':'square';
export function CanvasLayersPanel({asset,onChange}:{asset:AssetDocument;onChange:(asset:AssetDocument)=>void}){
 const maker=useMakerDesign()!,editor=useMemo(()=>nativeDocument(asset),[asset]);
 const [collapsed,setCollapsed]=useState<Set<string>>(new Set()),[dragging,setDragging]=useState<string[]>(),[drop,setDrop]=useState<{id:string;side:'before'|'after'}>();
 const [menu,setMenu]=useState<{ids:string[];x:number;y:number}>(),anchor=useRef<HTMLDivElement>(null);
 const selectionAnchor=useRef<{asset:string;row:string}|undefined>(undefined);
 const visibleRows=editor.pages[0].sections.flatMap(section=>section.columns.flatMap(column=>visibleCanvasLayers(column,collapsed)));
 const selected=new Set(maker.selected);
 const select=(ids:string[])=>maker.setSelectionRequest({assetId:asset.id,ids});
 const apply=(ids:string[],action:CanvasLayerAction)=>{const next=canvasLayerAction(editor,ids,action,action==='group'?crypto.randomUUID():undefined);if(next!==editor)onChange({...asset,editor:next});setMenu(undefined);};
 const context=(layer:CanvasLayer,x:number,y:number)=>{const ids=layer.blocks.map(block=>block.id),alreadySelected=ids.every(id=>selected.has(id)),effective=alreadySelected?maker.selected:ids;if(!alreadySelected)selectionAnchor.current={asset:asset.id,row:layer.id};select(effective);setMenu({ids:effective,x,y});};
 const choose=(layer:CanvasLayer,{range=false,additive=false}:{range?:boolean;additive?:boolean}={})=>{
  const ids=layer.blocks.map(block=>block.id);
  const remembered=selectionAnchor.current?.asset===asset.id?selectionAnchor.current.row:undefined;
  const start=remembered&&visibleRows.some(row=>row.id===remembered)?remembered:visibleRows.find(row=>row.blocks.every(block=>selected.has(block.id)))?.id??layer.id;
  selectionAnchor.current={asset:asset.id,row:range?start:layer.id};
  const interval=range?canvasLayerRange(visibleRows,start,layer.id):ids;
  const next=range?(additive?[...new Set([...maker.selected,...interval])]:interval):additive?(ids.every(id=>selected.has(id))?maker.selected.filter(id=>!ids.includes(id)):[...new Set([...maker.selected,...ids])]):ids;
  select(next);
 };
 const toggle=(id:string)=>setCollapsed(old=>{const next=new Set(old);if(next.has(id))next.delete(id);else next.add(id);return next;});
 const keyboard=(event:KeyboardEvent<HTMLDivElement>,layer:CanvasLayer)=>{
  if((event.target as Element).closest('button'))return;
  if((event.metaKey||event.ctrlKey)&&!event.altKey&&event.key.toLowerCase()==='g'){event.preventDefault();event.stopPropagation();if(!event.repeat)apply(maker.selected,event.shiftKey?'ungroup':'group');return;}
  if(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10'){event.preventDefault();const box=event.currentTarget.getBoundingClientRect();context(layer,box.left+24,box.bottom);return;}
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='a'){event.preventDefault();select(editor.pages[0].sections.flatMap(section=>section.columns.flat().map(block=>block.id)));return;}
  if(!event.metaKey&&!event.ctrlKey&&!event.altKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
   event.preventDefault();event.stopPropagation();const amount=event.shiftKey?10:1;
   maker.nudge.current?.(event.key==='ArrowLeft'?-amount:event.key==='ArrowRight'?amount:0,event.key==='ArrowUp'?-amount:event.key==='ArrowDown'?amount:0);return;
  }
  if(event.altKey&&(event.key==='ArrowUp'||event.key==='ArrowDown')){
   event.preventDefault();const next=htmlLayerOrder(editor,layer.blocks.map(block=>block.id),event.key==='ArrowUp'?'bring-forward':'send-backward');if(next!==editor)onChange({...asset,editor:next});return;
  }
  if(layer.group&&event.altKey&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();setCollapsed(old=>{const next=new Set(old);if(event.key==='ArrowLeft')next.add(layer.id);else next.delete(layer.id);return next;});return;}
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();return;}
  if(event.key===' '||event.key==='Enter'){event.preventDefault();choose(layer,{range:event.shiftKey,additive:event.metaKey||event.ctrlKey});return;}
  const rows=Array.from(event.currentTarget.closest('[role=tree]')!.querySelectorAll<HTMLElement>('[role=treeitem]'));
  const index=rows.indexOf(event.currentTarget),at=event.key==='ArrowUp'?index-1:event.key==='ArrowDown'?index+1:event.key==='Home'?0:event.key==='End'?rows.length-1:undefined;
  if(at===undefined)return;event.preventDefault();const next=rows[Math.max(0,Math.min(rows.length-1,at))],nextLayer=visibleRows.find(row=>row.id===next?.dataset.layerId);next?.focus();if(nextLayer)choose(nextLayer,{range:event.shiftKey,additive:event.metaKey||event.ctrlKey});
 };
 const dragOver=(event:DragEvent<HTMLDivElement>,id:string)=>{if(!dragging)return;event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect='move';const box=event.currentTarget.getBoundingClientRect();setDrop({id,side:event.clientY<box.top+box.height/2?'before':'after'});};
 const row=(layer:CanvasLayer,locked=false,depth=0)=>{
  const ids=layer.blocks.map(block=>block.id),allSelected=ids.every(id=>selected.has(id)),someSelected=ids.some(id=>selected.has(id));
  const blocked=locked||layer.blocks.some(block=>block.editor?.locked),hidden=layer.blocks.some(block=>block.editor?.hidden),name=layer.group?'Group':canvasLayerName(layer.blocks[0]);
  return <div key={layer.id} className="maker-layer-unit" data-group={layer.group||undefined} data-selected={layer.group&&allSelected||undefined}>
   <div role="treeitem" tabIndex={0} className="maker-layer-row" data-layer-id={layer.id} data-selected={allSelected||undefined} data-hidden={hidden||undefined} data-partial={someSelected&&!allSelected||undefined} data-drop={drop?.id===layer.id?drop.side:undefined} aria-label={name} aria-selected={allSelected} aria-expanded={layer.group?!collapsed.has(layer.id):undefined} aria-level={depth+1} draggable={!blocked} style={{paddingLeft:8+depth*24}}
    onClick={event=>choose(layer,{range:event.shiftKey,additive:event.metaKey||event.ctrlKey})} onDoubleClick={()=>maker.setTab('canvas')} onContextMenu={event=>{event.preventDefault();context(layer,event.clientX,event.clientY);}} onKeyDown={event=>keyboard(event,layer)}
    onDragStart={event=>{event.stopPropagation();event.dataTransfer.setData('application/x-maker-layers',JSON.stringify(ids));event.dataTransfer.effectAllowed='move';choose(layer);setDragging(ids);}}
    onDragEnd={()=>{setDragging(undefined);setDrop(undefined);}} onDragOver={event=>dragOver(event,layer.id)} onDrop={event=>{event.preventDefault();event.stopPropagation();if(dragging&&drop?.id===layer.id){const next=reorderCanvasLayers(editor,dragging,ids,drop.side);if(next!==editor)onChange({...asset,editor:next});}setDragging(undefined);setDrop(undefined);}}>
    {layer.group?<button className="maker-layer-expand" aria-label={`${collapsed.has(layer.id)?'Expand':'Collapse'} group`} onClick={event=>{event.stopPropagation();toggle(layer.id);}}><Icon name={collapsed.has(layer.id)?'chevron-right':'chevron-down'} size={12}/></button>:null}
    {layer.group?<LucideGlyph name="group" size={16}/>:<Icon name={layerIcon(layer.blocks[0])} size={16}/>}<Tooltip label={name} onlyWhenTruncated><span className="maker-layer-name">{name}</span></Tooltip>
    <div className="maker-layer-actions" onClick={event=>event.stopPropagation()} onDoubleClick={event=>event.stopPropagation()}>
     <Tooltip label={blocked?'Unlock layer':'Lock layer'} side="top"><Button className="maker-layer-action" data-persistent={blocked||undefined} variant="ghost" disabled={locked} aria-label={`${blocked?'Unlock':'Lock'} ${name}`} leadingIcon={<Icon name={blocked?'lock':'lock-open'} size={12}/>} onClick={()=>apply(ids,blocked?'unlock':'lock')}/></Tooltip>
     <Tooltip label={hidden?'Show layer':'Hide layer'} side="top"><Button className="maker-layer-action" data-persistent={hidden||undefined} variant="ghost" disabled={locked} aria-label={`${hidden?'Show':'Hide'} ${name}`} leadingIcon={<Icon name={hidden?'eye-off':'eye'} size={12}/>} onClick={()=>apply(ids,hidden?'show':'hide')}/></Tooltip>
    </div>
   </div>
   {layer.group&&!collapsed.has(layer.id)&&<div role="group">{layer.blocks.map(block=>row({id:block.id,group:false,blocks:[block]},locked,depth+1))}</div>}
  </div>;
 };
 return <><div className="maker-layers-panel hcs-ui" role="tree" aria-label="Canvas layers" aria-multiselectable="true">
  {editor.pages[0].sections.map(section=><div key={section.id}>{editor.pages[0].sections.length>1&&<span className="maker-layer-section">{section.name}</span>}{section.columns.map((column,index)=><div key={index}>{canvasLayers(column).map(layer=>row(layer,!!section.locked))}</div>)}</div>)}
 </div>
 {menu&&<><div ref={anchor} className="maker-layer-menu-anchor" style={{left:menu.x,top:menu.y}}/><DropdownMenu open onOpenChange={open=>{if(!open)setMenu(undefined);}} anchorRef={anchor}><DropdownMenuContent width={176} fitViewport><DropdownMenuList>
  {(['group','ungroup'] as const).map(action=><DropdownMenuItem key={action} disabled={canvasLayerAction(editor,menu.ids,action,'group-preview')===editor} onClick={()=>apply(menu.ids,action)}><DropdownMenuItemIcon><LucideGlyph name={action} size={16}/></DropdownMenuItemIcon><DropdownMenuItemLabel>{action==='group'?'Group':'Ungroup'}</DropdownMenuItemLabel></DropdownMenuItem>)}
 </DropdownMenuList></DropdownMenuContent></DropdownMenu></>}
 </>;
}
