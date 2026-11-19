import {flushSync} from 'react-dom';
import {memo,useEffect,useLayoutEffect,useRef,useState,type ReactNode,type DragEvent,type KeyboardEvent} from 'react';
import {Button,Dropdown,Icon,Tooltip} from '@asset/ui';
import {workspaceAssetTemplates} from './assetTemplates';
import {studioWorkspace} from './workspace';
import {Artwork} from './Artwork';
import {AssetPlaybackPreview} from './AssetPlaybackPreview';
import {useAssetPlayback} from './useAssetPlayback';
import {useMakerDesign} from './MakerDesignContext';
import {assetDimensions,type AssetDocument} from './model';
import {selectAsset,singleAssetSelection,type AssetSelection} from './assetSelection';
import {MAX_ASSET_PAGES} from './assetSeries';
import './communityCanvas.css';

type Props={toolbar:ReactNode;asset:AssetDocument;pages:AssetDocument[];busy:boolean;generating:boolean;zoom:number;onZoom:(zoom:number)=>void;onChange:(asset:AssetDocument)=>void;onOpen:(id:string)=>void;onAdd:(afterId:string,kind:string)=>void;onOverview:()=>void;onDuplicate:(ids:string[])=>Promise<string[]|undefined>;onRename:(id:string,title:string)=>void;onMove:(ids:string[],targetId:string,side:'before'|'after')=>void;onRemove:(ids:string[])=>void};
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
  {id:'source',label:'Import editable source',leadingIcon:<Icon name="file-up" size={16}/>},
  {kind:'separator'},...workspaceAssetTemplates(studioWorkspace).map(format=>({id:format.id,label:format.name,leadingIcon:<Icon name={format.width===format.height?'square':'rectangle-horizontal'} size={16}/>})),
 ]} onChange={onAdd} trigger={<Button variant="ghost" disabled={disabled} className={compact?'community-page-add-tile':'community-page-add'} aria-label="Add asset" leadingIcon={<Icon name="plus" size={16}/>} trailingIcon={!compact?<Icon name="chevron-down" size={14}/>:undefined}>{!compact&&'Add asset'}</Button>}/>;
}
export function AssetCanvas({toolbar,asset,pages,busy,generating,zoom,onZoom,onChange,onOpen,onAdd,onOverview,onDuplicate,onRename,onMove,onRemove}:Props){
 const viewport=useRef<HTMLDivElement>(null),strip=useRef<HTMLElement>(null),[bounds,setBounds]=useState({width:800,height:600});
 const [dragged,setDragged]=useState<string[]>(),[dropTarget,setDropTarget]=useState<{id:string;side:'before'|'after'}>();
 const suppressOpen=useRef(0),restoreThumbnailFocus=useRef(false);
 const [selection,setSelection]=useState<AssetSelection>(()=>singleAssetSelection(asset.id));
 const expectedActive=useRef(asset.id),order=pages.map(page=>page.id),orderKey=order.join('|');
 const picked=new Set(selection.ids.filter(id=>order.includes(id)));
 useEffect(()=>{
  if(asset.id!==expectedActive.current)setSelection(singleAssetSelection(asset.id));
  expectedActive.current=asset.id;
 },[asset.id]);
 useEffect(()=>{setSelection(current=>{
  const ids=current.ids.filter(id=>order.includes(id));
  if(!ids.length)return singleAssetSelection(asset.id);
  return {...current,ids,anchor:order.includes(current.anchor)?current.anchor:ids[0],focus:order.includes(current.focus)?current.focus:asset.id};
 });},[orderKey]);
 const zoomAnchor=useRef<{id:string;x:number;y:number;clientX:number;clientY:number}|undefined>(undefined),gestureZoomBase=useRef(1);
 const [grid,setGrid]=useState(false),[thumbnails,setThumbnails]=useState(true);
 useLayoutEffect(()=>{if(restoreThumbnailFocus.current&&!busy){restoreThumbnailFocus.current=false;const host=grid?viewport.current:strip.current;host?.querySelector<HTMLElement>('[aria-current="page"]')?.focus({preventScroll:true});}},[pages.length,busy,selection.focus]);
 const showPlayback=!grid&&thumbnails&&pages.length>1&&pages.some(page=>page.animation?.enabled);
 const playback=useAssetPlayback(pages,asset.id,showPlayback&&!busy,onOpen);
 const maker=useMakerDesign(),selectionRequest=maker?.selectionRequest;
 useLayoutEffect(()=>{
  if(!maker)return;
  const beginInsert=()=>{
   if(busy)return false;
   if(playback.active||grid)flushSync(()=>{
    if(playback.active){const page=pages[playback.position.index];if(page&&page.id!==asset.id){expectedActive.current=page.id;onOpen(page.id);}playback.reset();}
    setGrid(false);
   });
   return true;
  };
  maker.beginInsert.current=beginInsert;
  return()=>{if(maker.beginInsert.current===beginInsert)maker.beginInsert.current=undefined;};
 },[busy,playback.active,playback.position.index,grid,asset.id,pages,onOpen,maker?.beginInsert]);
 useLayoutEffect(()=>{
  if(!selectionRequest||busy)return;
  if(playback.active)playback.reset();
  if(grid)setGrid(false);
  if(selectionRequest.assetId!==asset.id&&pages.some(page=>page.id===selectionRequest.assetId)){
   expectedActive.current=selectionRequest.assetId;onOpen(selectionRequest.assetId);
  }
 },[selectionRequest,asset.id,playback.active,grid,busy]);
 const size=assetDimensions(asset),fit=Math.min(1,Math.max(.1,(bounds.width-80)/size.width),Math.max(.1,(bounds.height-156)/size.height)),scale=zoom||fit;
 const pageInset=16;
 const index=Math.max(0,pages.findIndex(page=>page.id===asset.id)),locked=busy||pages.length>=MAX_ASSET_PAGES;
 useLayoutEffect(()=>{if(!viewport.current)return;const observer=new ResizeObserver(([entry])=>setBounds({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(viewport.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{if(generating)setGrid(false);},[generating]);
 useLayoutEffect(()=>{
  if(grid)return;const host=viewport.current;if(!host)return;
  if(playback.active){host.scrollTo({top:0,left:Math.max(0,(host.scrollWidth-host.clientWidth)/2)});return;}
  // Leave enough trailing space to align even the last canvas with its playback frame.
  const stack=host.querySelector<HTMLElement>('.community-page-stack'),last=stack?.lastElementChild;
  if(stack&&last)stack.style.paddingBottom=`${Math.max(pageInset,host.clientHeight-last.getBoundingClientRect().height-pageInset)}px`;
  const anchor=zoomAnchor.current;
  if(anchor){
   const board=host.querySelector<HTMLElement>(`[data-page-id="${anchor.id}"] .asset-scaled-board`);
   if(board){const box=board.getBoundingClientRect();host.scrollBy({left:box.left+anchor.x*scale-anchor.clientX,top:box.top+anchor.y*scale-anchor.clientY});}
   zoomAnchor.current=undefined;return;
  }
  const page=host.querySelector<HTMLElement>(`[data-page-id="${asset.id}"]`);
  if(page){const y=page.getBoundingClientRect().top-host.getBoundingClientRect().top+host.scrollTop;host.scrollTo({top:Math.max(0,y-pageInset),left:Math.max(0,(host.scrollWidth-host.clientWidth)/2)});}
 },[asset.id,grid,scale,busy,bounds.width,bounds.height,playback.active,orderKey]);
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
 const activate=(id:string)=>{expectedActive.current=id;onOpen(id);};
 const open=(id:string)=>{if(busy||performance.now()<suppressOpen.current)return;playback.reset();setSelection(singleAssetSelection(id));activate(id);setGrid(false);};
 const select=(id:string,range=false,additive=false)=>{
  if(busy||performance.now()<suppressOpen.current)return;
  playback.reset();setSelection(current=>selectAsset(order,current,id,{range,additive}));
  if(!range&&!additive)activate(id);
 };
 const effectiveIds=(id:string)=>picked.has(id)?order.filter(id=>picked.has(id)):[id];
 const remove=(ids:string[])=>{if(busy||!ids.length||ids.length>=pages.length)return;restoreThumbnailFocus.current=true;playback.reset();onRemove(ids);};
 const duplicate=async(ids:string[])=>{
  if(busy||!ids.length||pages.length+ids.length>MAX_ASSET_PAGES)return;
  playback.reset();const copies=await onDuplicate(ids);
  if(copies?.length){expectedActive.current=copies[0];setSelection({ids:copies,anchor:copies[0],focus:copies[0]});restoreThumbnailFocus.current=true;}
 };
 const navigateThumbnail=(event:KeyboardEvent<HTMLButtonElement>,i:number)=>{
  if(busy||event.altKey)return;
  const host=event.currentTarget.closest<HTMLElement>('.community-page-grid,.community-page-strip');if(!host)return;
  const command=event.ctrlKey||event.metaKey;
  if(command&&event.key.toLowerCase()==='a'){event.preventDefault();event.stopPropagation();playback.reset();setSelection({ids:order,anchor:order[0],focus:pages[i].id});return;}
  if(command&&event.key.toLowerCase()==='d'){event.preventDefault();event.stopPropagation();if(!event.repeat)void duplicate(order.filter(id=>picked.has(id)));return;}
  if(command)return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setSelection(singleAssetSelection(asset.id));return;}
  if(event.key==='Backspace'||event.key==='Delete'){
   event.preventDefault();event.stopPropagation();if(!event.repeat)remove(order.filter(id=>picked.has(id)));return;
  }
  if(grid&&event.key==='Enter'){event.preventDefault();event.stopPropagation();open(pages[i].id);return;}
  if(grid&&event.key===' '){event.preventDefault();event.stopPropagation();select(pages[i].id,event.shiftKey,true);return;}
  const tiles=Array.from(host.querySelectorAll<HTMLButtonElement>('.community-page-tile'));
  const firstTop=tiles[0]?.getBoundingClientRect().top??0;
  const columns=grid?Math.max(1,tiles.filter(tile=>Math.abs(tile.getBoundingClientRect().top-firstTop)<2).length):1;
  const next=event.key==='ArrowRight'?i+1:event.key==='ArrowLeft'?i-1:event.key==='ArrowDown'?i+columns:event.key==='ArrowUp'?i-columns:event.key==='Home'?0:event.key==='End'?pages.length-1:null;
  if(next===null)return;
  event.preventDefault();event.stopPropagation();
  const target=Math.max(0,Math.min(pages.length-1,next));
  tiles[target]?.focus({preventScroll:true});tiles[target]?.scrollIntoView({block:'nearest',inline:'nearest'});
  select(pages[target].id,event.shiftKey);
 };
 const overview=()=>{if(busy)return;playback.reset();setGrid(value=>!value);onOverview();};
 const add=(afterId:string,kind:string)=>{if(busy||(locked&&!(kind==='animate'&&pages.findIndex(page=>page.id===afterId)<pages.length-1)))return;playback.reset();setGrid(false);onAdd(afterId,kind);};
 const dragStart=(event:DragEvent,id:string,multiple=false)=>{
  if(busy){event.preventDefault();return;}
  const ids=multiple?effectiveIds(id):[id];playback.reset();
  if(multiple&&!picked.has(id))setSelection(singleAssetSelection(id));
  event.dataTransfer.setData('text/plain',id);event.dataTransfer.effectAllowed='move';setDragged(ids);
 };
 const dragOver=(event:DragEvent<HTMLElement>,id:string,vertical=false)=>{if(!dragged||dragged.includes(id)||busy)return;event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect='move';const box=event.currentTarget.getBoundingClientRect(),after=vertical?event.clientY>box.top+box.height/2:event.clientX>box.left+box.width/2;setDropTarget({id,side:after?'after':'before'});};
 const drop=(event:DragEvent,id:string)=>{if(!dragged)return;event.preventDefault();event.stopPropagation();suppressOpen.current=performance.now()+300;if(dropTarget?.id===id&&!dragged.includes(id))onMove(dragged,id,dropTarget.side);setDragged(undefined);setDropTarget(undefined);};
 const endDrag=()=>{setDragged(undefined);setDropTarget(undefined);};
 const actions=(page:AssetDocument,i:number,multiple=false)=>{
  const ids=multiple?effectiveIds(page.id):[page.id],indices=ids.map(id=>order.indexOf(id)),first=Math.min(...indices),last=Math.max(...indices);
  return <Dropdown align="end" items={[
   {id:'open',label:'Edit asset',leadingIcon:<Icon name="pencil" size={16}/>},
   {id:'duplicate',label:'Duplicate',disabled:busy||pages.length+ids.length>MAX_ASSET_PAGES,leadingIcon:<Icon name="copy" size={16}/>},
   {id:'up',label:'Move earlier',disabled:first===0,leadingIcon:<Icon name="arrow-up" size={16}/>},
   {id:'down',label:'Move later',disabled:last===pages.length-1,leadingIcon:<Icon name="arrow-down" size={16}/>},
   {id:'animate',label:'Animate',disabled:busy||ids.length>1||(locked&&i===pages.length-1),leadingIcon:<Icon name="play" size={16}/>},
   {kind:'separator'},{id:'remove',label:'Remove',disabled:ids.length>=pages.length,leadingIcon:<Icon name="trash-2" size={16}/>},
  ]} onChange={action=>{if(action==='open')open(page.id);else if(action==='duplicate')void duplicate(ids);else if(action==='up')onMove(ids,pages[first-1].id,'before');else if(action==='down')onMove(ids,pages[last+1].id,'after');else if(action==='animate')add(page.id,'animate');else if(action==='remove')remove(ids);}} trigger={<Button variant="ghost" size="sm" disabled={busy} className="community-page-menu" aria-label={`Asset ${i+1} actions`} leadingIcon={<Icon name="ellipsis" size={16}/>}/>}/>;
 };
 const tile=(page:AssetDocument,i:number)=><div key={page.id} className="community-page-slot" data-dragging={dragged?.includes(page.id)||undefined} data-drop={dropTarget?.id===page.id?dropTarget.side:undefined} onDragOver={event=>dragOver(event,page.id)} onDrop={event=>drop(event,page.id)}>
  <button className="community-page-tile" draggable={!busy} onDragStart={event=>dragStart(event,page.id,true)} onDragEnd={endDrag} aria-label={`${grid?'Select':'Go to'} asset ${i+1}: ${page.title}`} aria-current={page.id===asset.id?'page':undefined} aria-pressed={picked.has(page.id)} tabIndex={page.id===selection.focus?0:-1} disabled={busy} onKeyDown={event=>navigateThumbnail(event,i)} onClick={event=>select(page.id,event.shiftKey,event.metaKey||event.ctrlKey)} onDoubleClick={()=>{if(grid)open(page.id);}}><div className="community-page-preview"><AssetThumbnail asset={page}/>{playback.thumbnailProgress&&<div className="asset-thumbnail-progress" aria-hidden="true"><span style={{transform:`scaleX(${playback.thumbnailProgress[i]})`}}/></div>}</div><span>{i+1}<span>{page.title}</span></span></button>{actions(page,i,true)}
 </div>;
 return <div className="we-main asset-canvas-area community-canvas">{toolbar}
  <div ref={viewport} className="asset-canvas-scroll studio-workspace-scroll" data-html-selection-surface={!grid&&!busy&&!playback.active||undefined} aria-label={grid?'Asset grid':'Asset canvas'}>
   {grid?<div className="community-page-grid">{pages.map(tile)}<AddAsset compact disabled={locked} onAdd={kind=>add(asset.id,kind)}/></div>:
   playback.active?<AssetPlaybackPreview from={pages[playback.position.index]} to={pages[playback.position.index+1]} progress={playback.position.progress} smart={playback.position.smart} reducedMotion={playback.reducedMotion} scale={scale} playing={playback.playing} time={playback.time} onExit={playback.reset}/>:
   <div className="community-page-stack" style={{paddingTop:pageInset}}>{pages.map((page,i)=>{
    const dimensions=assetDimensions(page),selected=page.id===asset.id;
    return <section key={page.id} className="community-canvas-page" data-page-id={page.id} data-drop={dropTarget?.id===page.id?dropTarget.side:undefined} onDragOver={event=>dragOver(event,page.id,true)} onDrop={event=>drop(event,page.id)} aria-label={`Asset ${i+1}: ${page.title}`} style={{width:dimensions.width*scale}}>
     <div className="community-page-heading"><button className="community-page-grip" draggable={!busy} disabled={busy} onDragStart={event=>dragStart(event,page.id)} onDragEnd={endDrag} aria-label={`Drag asset ${i+1} to reorder`}><Icon name="grip-vertical" size={14}/></button><span>{i+1}</span><input aria-label={`Asset ${i+1} name`} value={page.title} maxLength={100} disabled={busy} onChange={event=>onRename(page.id,event.target.value)}/><div className="community-page-actions"><Tooltip label="Move earlier" side="top"><Button variant="ghost" size="sm" aria-label={`Move asset ${i+1} earlier`} disabled={busy||i===0} leadingIcon={<Icon name="arrow-up" size={14}/>} onClick={()=>onMove([page.id],pages[i-1].id,'before')}/></Tooltip><Tooltip label="Move later" side="top"><Button variant="ghost" size="sm" aria-label={`Move asset ${i+1} later`} disabled={busy||i===pages.length-1} leadingIcon={<Icon name="arrow-down" size={14}/>} onClick={()=>onMove([page.id],pages[i+1].id,'after')}/></Tooltip><Tooltip label="Duplicate" side="top"><Button variant="ghost" size="sm" aria-label={`Duplicate asset ${i+1}`} disabled={locked} leadingIcon={<Icon name="copy" size={14}/>} onClick={()=>add(page.id,'duplicate')}/></Tooltip>{actions(page,i)}</div></div>
     <div className="asset-scaled-board" data-active={selected||undefined} style={{width:dimensions.width*scale,height:dimensions.height*scale}}>
      <div className="asset-canvas-transform" style={{transform:`scale(${scale})`}}><Artwork asset={page} onChange={selected&&!busy?onChange:undefined} scale={scale}/></div>
      {!selected&&<button className="community-page-activate" aria-label={`Edit asset ${i+1}: ${page.title}`} disabled={busy} onClick={()=>open(page.id)}/>}
      {selected&&generating&&<div className="asset-generating-overlay" aria-hidden="true"/>}
     </div>
     <AddAsset disabled={locked} onAdd={kind=>add(page.id,kind)}/>
    </section>;
   })}</div>}
  </div>
  {!grid&&thumbnails&&<nav ref={strip} className="community-page-strip" aria-label="Asset thumbnails">{pages.map(tile)}<AddAsset compact disabled={locked} onAdd={kind=>add(asset.id,kind)}/></nav>}
  <div className="asset-canvas-footer community-pages-footer">
   <div className="community-page-controls"><Tooltip label={grid?'Back to canvas':'Grid view'} side="top"><Button size="sm" variant="ghost" aria-label={grid?'Back to canvas':'Grid view'} aria-pressed={grid} disabled={busy} leadingIcon={<Icon name="layout-grid" size={16} fill="currentColor" strokeWidth={0}/>} onClick={overview}/></Tooltip>
    <Tooltip label="Asset thumbnails" side="top"><Button size="sm" variant="ghost" aria-label="Asset thumbnails" aria-expanded={thumbnails&&!grid} disabled={busy} leadingIcon={<Icon name="gallery-thumbnails" size={16}/>} onClick={()=>{playback.reset();setGrid(false);setThumbnails(value=>grid||!value);}}/></Tooltip>
    <Button className="asset-page-counter" size="sm" variant="ghost" aria-label={`Asset ${index+1} of ${pages.length}. Open grid`} disabled={busy} onClick={overview}>{index+1} / {pages.length}</Button>
    <Button size="sm" variant="ghost" aria-label="Previous asset" disabled={busy||index===0} leadingIcon={<Icon name="chevron-left" size={14}/>} onClick={()=>open(pages[index-1].id)}/>
    <Button size="sm" variant="ghost" aria-label="Next asset" disabled={busy||index===pages.length-1} leadingIcon={<Icon name="chevron-right" size={14}/>} onClick={()=>open(pages[index+1].id)}/>
    <div className="asset-playback-slot">{showPlayback&&<div className="asset-playback-controls" role="group" aria-label="Animation playback">
     <Tooltip label="Go to beginning" side="top"><Button size="sm" variant="ghost" aria-label="Go to beginning" disabled={busy} leadingIcon={<Icon name="skip-back" size={12} fill="currentColor" strokeWidth={1.5}/>} onClick={()=>playback.jump(0)}/></Tooltip>
     <Tooltip label={playback.playing?'Pause animation':'Play animation'} side="top"><Button size="sm" variant="ghost" aria-label={playback.playing?'Pause animation':'Play animation'} disabled={busy} leadingIcon={<Icon name={playback.playing?'pause':'play'} size={12} fill="currentColor" strokeWidth={0}/>} onClick={playback.toggle}/></Tooltip>
     <Tooltip label="Go to end" side="top"><Button size="sm" variant="ghost" aria-label="Go to end" disabled={busy} leadingIcon={<Icon name="skip-forward" size={12} fill="currentColor" strokeWidth={1.5}/>} onClick={()=>playback.jump(pages.length-1)}/></Tooltip>
     <input type="range" className="asset-zoom-range asset-playback-progress" aria-label="Animation progress" aria-valuetext={`${(playback.time/1000).toFixed(1)} / ${(playback.total/1000).toFixed(1)} s`} min={0} max={playback.total} step={1} value={Math.round(playback.time)} disabled={busy} onChange={event=>playback.seek(Number(event.target.value))} style={{background:`linear-gradient(to right, var(--ui-text-muted) ${playback.time/playback.total*100}%, var(--ui-border) ${playback.time/playback.total*100}%)`}}/>
     <Tooltip label={playback.loop?'Turn loop off':'Turn loop on'} side="top"><Button size="sm" variant="ghost" aria-label="Loop playback" aria-pressed={playback.loop} disabled={busy} leadingIcon={<Icon name="repeat" size={14}/>} onClick={playback.toggleLoop}/></Tooltip>
    </div>}</div>

   </div>
   <div className="asset-zoom"><input type="range" className="asset-zoom-range" min={10} max={300} step={1} disabled={grid} value={Math.round(scale*100)} aria-label="Zoom" aria-valuetext={`${Math.round(scale*100)}%`} onChange={event=>onZoom(Number(event.target.value)/100)}/>
    <Dropdown align="end" placement="top" listHeight="auto" value={zoom?String(Math.round(scale*100)):'fit'} items={[{id:'fit',label:'Fit'}, {kind:'separator'},...[200,125,100,75,50,25].map(value=>({id:String(value),label:`${value}%`}))]} onChange={value=>onZoom(value==='fit'?0:Number(value)/100)} trigger={<Button variant="ghost" size="sm" disabled={grid} aria-label={`Zoom: ${Math.round(scale*100)}%`}>{Math.round(scale*100)}%</Button>}/>
   </div>
  </div>
 </div>;
}
