import {memo,useEffect,useLayoutEffect,useRef,useState,type ReactNode,type DragEvent} from 'react';
import {Button,Dropdown,Icon,Tooltip} from '@asset/ui';
import {ambassadorFormats} from '../../../src/ambassadors/catalog.js';
import {Artwork} from './Artwork';
import {assetDimensions,type AssetDocument} from './model';
import {MAX_ASSET_PAGES} from './assetSeries';
import './communityCanvas.css';

type Props={toolbar:ReactNode;asset:AssetDocument;pages:AssetDocument[];busy:boolean;generating:boolean;zoom:number;onZoom:(zoom:number)=>void;onChange:(asset:AssetDocument)=>void;onOpen:(id:string)=>void;onAdd:(afterId:string,kind:string)=>void;onOverview:()=>void;onRename:(id:string,title:string)=>void;onMove:(id:string,targetId:string,side:'before'|'after')=>void;onRemove:(id:string)=>void;onUndoArrangement?:()=>void};
const AssetThumbnail=memo(function AssetThumbnail({asset}:{asset:AssetDocument}){
 const host=useRef<HTMLDivElement>(null),[bounds,setBounds]=useState({width:240,height:150});
 useLayoutEffect(()=>{if(!host.current)return;const observer=new ResizeObserver(([entry])=>setBounds({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(host.current);return()=>observer.disconnect();},[]);
 const size=assetDimensions(asset),scale=Math.min(bounds.width/size.width,bounds.height/size.height);
 return <div className="community-page-thumbnail" ref={host} aria-hidden="true" inert><div style={{width:size.width*scale,height:size.height*scale}}><div style={{transform:`scale(${scale})`,transformOrigin:'top left'}}><Artwork asset={asset}/></div></div></div>;
});
function AddAsset({disabled,onAdd,compact=false}:{disabled:boolean;onAdd:(kind:string)=>void;compact?:boolean}){
 return <Dropdown placement="top" align="center" items={[
  {id:'blank',label:'Blank asset',leadingIcon:<Icon name="plus" size={16}/>},
  {id:'duplicate',label:'Duplicate asset',leadingIcon:<Icon name="copy" size={16}/>},
  {kind:'separator'},...ambassadorFormats.map(format=>({id:format.id,label:format.name,leadingIcon:<Icon name={format.width===format.height?'square':'rectangle-horizontal'} size={16}/>})),
 ]} onChange={onAdd} trigger={<Button variant="ghost" disabled={disabled} className={compact?'community-page-add-tile':'community-page-add'} aria-label="Add asset" leadingIcon={<Icon name="plus" size={16}/>} trailingIcon={!compact?<Icon name="chevron-down" size={14}/>:undefined}>{!compact&&'Add asset'}</Button>}/>;
}
export function CommunityCanvas({toolbar,asset,pages,busy,generating,zoom,onZoom,onChange,onOpen,onAdd,onOverview,onRename,onMove,onRemove,onUndoArrangement}:Props){
 const viewport=useRef<HTMLDivElement>(null),strip=useRef<HTMLElement>(null),[bounds,setBounds]=useState({width:800,height:600});
 const [dragged,setDragged]=useState<string>(),[dropTarget,setDropTarget]=useState<{id:string;side:'before'|'after'}>();
 const suppressOpen=useRef(0);
 const zoomAnchor=useRef<{id:string;x:number;y:number;clientX:number;clientY:number}|undefined>(undefined),gestureZoomBase=useRef(1);
 const [grid,setGrid]=useState(false),[thumbnails,setThumbnails]=useState(true);
 const size=assetDimensions(asset),fit=Math.min(1,Math.max(.1,(bounds.width-80)/size.width),Math.max(.1,(bounds.height-156)/size.height)),scale=zoom||fit;
 const pageInset=Math.max(24,(bounds.height-size.height*scale-76)/2);
 const index=Math.max(0,pages.findIndex(page=>page.id===asset.id)),locked=busy||pages.length>=MAX_ASSET_PAGES;
 useLayoutEffect(()=>{if(!viewport.current)return;const observer=new ResizeObserver(([entry])=>setBounds({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(viewport.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{if(generating)setGrid(false);},[generating]);
 useLayoutEffect(()=>{
  if(grid)return;const host=viewport.current;if(!host)return;
  const anchor=zoomAnchor.current;
  if(anchor){
   const board=host.querySelector<HTMLElement>(`[data-page-id="${anchor.id}"] .asset-scaled-board`);
   if(board){const box=board.getBoundingClientRect();host.scrollBy({left:box.left+anchor.x*scale-anchor.clientX,top:box.top+anchor.y*scale-anchor.clientY});}
   zoomAnchor.current=undefined;return;
  }
  const page=host.querySelector<HTMLElement>(`[data-page-id="${asset.id}"]`);
  if(page){const y=page.getBoundingClientRect().top-host.getBoundingClientRect().top+host.scrollTop;host.scrollTo({top:Math.max(0,y-Math.max(24,(bounds.height-page.offsetHeight)/2)),left:Math.max(0,(host.scrollWidth-host.clientWidth)/2)});}
 },[asset.id,grid,scale,busy,bounds.height]);
 useEffect(()=>{
  const host=viewport.current;if(!host||grid)return;
  const pinch=(next:number,clientX:number,clientY:number,target:EventTarget|null)=>{
   const page=(target instanceof Element?target.closest<HTMLElement>('[data-page-id]'):null)??host.querySelector<HTMLElement>(`[data-page-id="${asset.id}"]`),board=page?.querySelector<HTMLElement>('.asset-scaled-board');
   if(!page||!board)return;
   const box=board.getBoundingClientRect();zoomAnchor.current={id:page.dataset.pageId!,x:(clientX-box.left)/scale,y:(clientY-box.top)/scale,clientX,clientY};
   onZoom(Math.max(.1,Math.min(3,next)));
  };
  const wheel=(event:WheelEvent)=>{if(!event.ctrlKey)return;event.preventDefault();pinch(scale*Math.exp(-event.deltaY*.008),event.clientX,event.clientY,event.target);};
  const gestureStart=(event:Event)=>{event.preventDefault();gestureZoomBase.current=scale;};
  const gestureChange=(event:Event)=>{event.preventDefault();const gesture=event as Event&{scale:number;clientX?:number;clientY?:number},box=host.getBoundingClientRect();pinch(gestureZoomBase.current*gesture.scale,gesture.clientX??box.left+box.width/2,gesture.clientY??box.top+box.height/2,event.target);};
  host.addEventListener('wheel',wheel,{passive:false});host.addEventListener('gesturestart',gestureStart,{passive:false});host.addEventListener('gesturechange',gestureChange,{passive:false});
  return()=>{host.removeEventListener('wheel',wheel);host.removeEventListener('gesturestart',gestureStart);host.removeEventListener('gesturechange',gestureChange);};
 },[asset.id,grid,scale,onZoom]);
 useEffect(()=>{const host=strip.current,target=host?.querySelector<HTMLElement>('[aria-current="page"]');if(host&&target){const box=target.getBoundingClientRect(),view=host.getBoundingClientRect();if(box.left<view.left||box.right>view.right)host.scrollBy({left:box.left-view.left-(view.width-box.width)/2});}},[asset.id,thumbnails,grid]);
 const open=(id:string)=>{if(busy||performance.now()<suppressOpen.current)return;onOpen(id);setGrid(false);};
 const overview=()=>{if(busy)return;setGrid(value=>!value);onOverview();};
 const add=(afterId:string,kind:string)=>{if(locked)return;setGrid(false);onAdd(afterId,kind);};
 const dragStart=(event:DragEvent,id:string)=>{if(busy){event.preventDefault();return;}event.dataTransfer.setData('text/plain',id);event.dataTransfer.effectAllowed='move';setDragged(id);};
 const dragOver=(event:DragEvent<HTMLElement>,id:string,vertical=false)=>{if(!dragged||dragged===id||busy)return;event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect='move';const box=event.currentTarget.getBoundingClientRect(),after=vertical?event.clientY>box.top+box.height/2:event.clientX>box.left+box.width/2;setDropTarget({id,side:after?'after':'before'});};
 const drop=(event:DragEvent,id:string)=>{if(!dragged)return;event.preventDefault();event.stopPropagation();suppressOpen.current=performance.now()+300;if(dropTarget?.id===id&&dragged!==id)onMove(dragged,id,dropTarget.side);setDragged(undefined);setDropTarget(undefined);};
 const endDrag=()=>{setDragged(undefined);setDropTarget(undefined);};
 const actions=(page:AssetDocument,i:number)=><Dropdown align="end" items={[
  {id:'open',label:'Edit asset',leadingIcon:<Icon name="pencil" size={16}/>},
  {id:'duplicate',label:'Duplicate',disabled:locked,leadingIcon:<Icon name="copy" size={16}/>},
  {id:'up',label:'Move earlier',disabled:i===0,leadingIcon:<Icon name="arrow-up" size={16}/>},
  {id:'down',label:'Move later',disabled:i===pages.length-1,leadingIcon:<Icon name="arrow-down" size={16}/>},
  {kind:'separator'},{id:'remove',label:'Remove from canvas',disabled:pages.length<=1,leadingIcon:<Icon name="trash-2" size={16}/>},
 ]} onChange={action=>{if(action==='open')open(page.id);else if(action==='duplicate')add(page.id,'duplicate');else if(action==='up')onMove(page.id,pages[i-1].id,'before');else if(action==='down')onMove(page.id,pages[i+1].id,'after');else onRemove(page.id);}} trigger={<Button variant="ghost" size="sm" disabled={busy} className="community-page-menu" aria-label={`Asset ${i+1} actions`} leadingIcon={<Icon name="ellipsis" size={16}/>}/>}/>;
 const tile=(page:AssetDocument,i:number)=><div key={page.id} className="community-page-slot" data-dragging={dragged===page.id||undefined} data-drop={dropTarget?.id===page.id?dropTarget.side:undefined} onDragOver={event=>dragOver(event,page.id)} onDrop={event=>drop(event,page.id)}>
  <button className="community-page-tile" draggable={!busy} onDragStart={event=>dragStart(event,page.id)} onDragEnd={endDrag} aria-label={`${grid?'Open':'Go to'} asset ${i+1}: ${page.title}`} aria-current={page.id===asset.id?'page':undefined} disabled={busy} onClick={()=>open(page.id)}><AssetThumbnail asset={page}/><span>{i+1}<span>{page.title}</span></span></button>{actions(page,i)}
 </div>;
 return <div className="we-main asset-canvas-area community-canvas">{toolbar}
  <div ref={viewport} className="asset-canvas-scroll studio-workspace-scroll" data-html-selection-surface={!grid&&!busy||undefined} aria-label={grid?'Asset grid':'Asset canvas'}>
   {grid?<div className="community-page-grid">{pages.map(tile)}<AddAsset compact disabled={locked} onAdd={kind=>add(asset.id,kind)}/></div>:
   <div className="community-page-stack" style={{paddingTop:pageInset,paddingBottom:pageInset}}>{pages.map((page,i)=>{
    const dimensions=assetDimensions(page),selected=page.id===asset.id;
    return <section key={page.id} className="community-canvas-page" data-page-id={page.id} data-drop={dropTarget?.id===page.id?dropTarget.side:undefined} onDragOver={event=>dragOver(event,page.id,true)} onDrop={event=>drop(event,page.id)} aria-label={`Asset ${i+1}: ${page.title}`} style={{width:dimensions.width*scale}}>
     <div className="community-page-heading"><button className="community-page-grip" draggable={!busy} disabled={busy} onDragStart={event=>dragStart(event,page.id)} onDragEnd={endDrag} aria-label={`Drag asset ${i+1} to reorder`}><Icon name="grip-vertical" size={14}/></button><span>{i+1}</span><input aria-label={`Asset ${i+1} name`} value={page.title} maxLength={100} disabled={busy} onChange={event=>onRename(page.id,event.target.value)}/><div className="community-page-actions"><Tooltip label="Move earlier" side="top"><Button variant="ghost" size="sm" aria-label={`Move asset ${i+1} earlier`} disabled={busy||i===0} leadingIcon={<Icon name="arrow-up" size={14}/>} onClick={()=>onMove(page.id,pages[i-1].id,'before')}/></Tooltip><Tooltip label="Move later" side="top"><Button variant="ghost" size="sm" aria-label={`Move asset ${i+1} later`} disabled={busy||i===pages.length-1} leadingIcon={<Icon name="arrow-down" size={14}/>} onClick={()=>onMove(page.id,pages[i+1].id,'after')}/></Tooltip><Tooltip label="Duplicate" side="top"><Button variant="ghost" size="sm" aria-label={`Duplicate asset ${i+1}`} disabled={locked} leadingIcon={<Icon name="copy" size={14}/>} onClick={()=>add(page.id,'duplicate')}/></Tooltip>{actions(page,i)}</div></div>
     <div className="asset-scaled-board" style={{width:dimensions.width*scale,height:dimensions.height*scale}}>
      <div className="asset-canvas-transform" style={{transform:`scale(${scale})`}}><Artwork asset={page} onChange={selected&&!busy?onChange:undefined} scale={scale}/></div>
      {!selected&&<button className="community-page-activate" aria-label={`Edit asset ${i+1}: ${page.title}`} disabled={busy} onClick={()=>open(page.id)}/>}
      {selected&&generating&&<div className="asset-generating-overlay" aria-hidden="true"/>}
     </div>
     <AddAsset disabled={locked} onAdd={kind=>add(page.id,kind)}/>
    </section>;
   })}</div>}
  </div>
  {!grid&&thumbnails&&pages.length>1&&<nav ref={strip} className="community-page-strip" aria-label="Asset thumbnails">{pages.map(tile)}<AddAsset compact disabled={locked} onAdd={kind=>add(asset.id,kind)}/></nav>}
  <div className="asset-canvas-footer community-pages-footer"><span className="community-canvas-dimensions">{size.width} × {size.height}</span>
   <div className="community-page-controls">{onUndoArrangement&&<Tooltip label="Undo page change" side="top"><Button size="sm" variant="ghost" aria-label="Undo page change" disabled={busy} leadingIcon={<Icon name="undo-2" size={16}/>} onClick={onUndoArrangement}/></Tooltip>}<Tooltip label={grid?'Back to canvas':'Grid view'} side="top"><Button size="sm" variant="ghost" aria-label={grid?'Back to canvas':'Grid view'} aria-pressed={grid} disabled={busy} leadingIcon={<Icon name={grid?'rectangle-horizontal':'layout-grid'} size={16}/>} onClick={overview}>{grid?'Canvas':'Grid'}</Button></Tooltip>
    <Tooltip label="Asset thumbnails" side="top"><Button size="sm" variant="ghost" aria-label="Asset thumbnails" aria-expanded={thumbnails&&!grid&&pages.length>1} disabled={busy} leadingIcon={<Icon name="panels-top-left" size={16}/>} onClick={()=>{setGrid(false);setThumbnails(value=>grid||!value);}}>Assets</Button></Tooltip>
    <Button size="sm" variant="ghost" aria-label={`Asset ${index+1} of ${pages.length}. Open grid`} disabled={busy} onClick={overview}>{index+1} / {pages.length}</Button>
    <Button size="sm" variant="ghost" aria-label="Previous asset" disabled={busy||index===0} leadingIcon={<Icon name="chevron-left" size={14}/>} onClick={()=>open(pages[index-1].id)}/>
    <Button size="sm" variant="ghost" aria-label="Next asset" disabled={busy||index===pages.length-1} leadingIcon={<Icon name="chevron-right" size={14}/>} onClick={()=>open(pages[index+1].id)}/>
   </div>
   <div className="asset-zoom"><input type="range" className="asset-zoom-range" min={10} max={300} step={1} disabled={grid} value={Math.round(scale*100)} aria-label="Zoom" aria-valuetext={`${Math.round(scale*100)}%`} onChange={event=>onZoom(Number(event.target.value)/100)}/>
    <Dropdown align="end" placement="top" listHeight="auto" value={zoom?String(Math.round(scale*100)):'fit'} items={[{id:'fit',label:'Fit'}, {kind:'separator'},...[200,125,100,75,50,25].map(value=>({id:String(value),label:`${value}%`}))]} onChange={value=>onZoom(value==='fit'?0:Number(value)/100)} trigger={<Button variant="ghost" size="sm" disabled={grid} aria-label={`Zoom: ${Math.round(scale*100)}%`}>{Math.round(scale*100)}%</Button>}/>
   </div>
  </div>
 </div>;
}
