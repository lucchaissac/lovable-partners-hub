import {useCallback,useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {DialStore,useDialTimeline} from 'dialkit';
import {TimelineStore} from 'dialkit/timeline';
import type {AssetDocument} from './model';
import {defaultNativeMotion,nativeMotionConfig,type NativeMotion} from './nativeMotion';
import {nativeMotionSchema} from '../../../shared/nativeMotionSchema.mjs';

/** DialKit owns the clock and live edits; the editable document owns persistence
 * and undo. Opening the panel alone never changes an asset. */
export function useNativeMotionPlayback(asset:AssetDocument,index:number,enabled:boolean,onChange:(asset:AssetDocument)=>void){
 const id=`asset-motion-${asset.id}`;
 const fallback=useMemo(()=>defaultNativeMotion(asset),[asset.id,asset.editor]);
 const motion=asset.motion??fallback;
 const config=useMemo(()=>nativeMotionConfig(motion),[motion]);
 const [loop,setLoop]=useState(true),[active,setActive]=useState(false);
 const [reducedMotion,setReducedMotion]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const live=useDialTimeline('Animation',config,{id,persist:false,autoplay:false,loop});
 useEffect(()=>{
  const meta=TimelineStore.getTimeline(id);if(!meta)return;
  TimelineStore.update({...meta,clips:meta.clips.map(clip=>({...clip,label:motion.clips.find(c=>c.id===clip.key)?.label??clip.label}))});
 },[id,motion.clips,live.duration,loop]);
 const subscribe=useCallback((fn:()=>void)=>DialStore.subscribe(id,fn),[id]);
 const snapshot=useCallback(()=>DialStore.getValues(id),[id]);
 const values=useSyncExternalStore(subscribe,snapshot,snapshot);
 const previewMotion=useMemo(()=>({...motion,values}) as NativeMotion,[motion,values]);
 const current=useRef({asset,motion,onChange,enabled});current.current={asset,motion,onChange,enabled};
 const restoring=useRef(false),lastSaved=useRef('');
 // Restore source imports and Undo without resetting the playhead or creating a
 // second edit. Hook registration happens before this effect.
 const saved=JSON.stringify(asset.motion?.values??{});
 useEffect(()=>{
  if(saved===lastSaved.current)return;
  restoring.current=true;
  DialStore.resetValues(id);DialStore.updateValues(id,asset.motion?.values??{});
  lastSaved.current=saved;restoring.current=false;
 },[id,saved]);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined,dragging=false;
  let pending:{asset:AssetDocument;onChange:typeof onChange}|undefined;
  const commit=()=>{
   clearTimeout(timer);if(!pending)return;
   const next=pending;pending=undefined;
   lastSaved.current=JSON.stringify(next.asset.motion?.values??{});
   next.onChange(next.asset);
  };
  const unsubscribe=DialStore.subscribe(id,()=>{
   if(restoring.current||!current.current.enabled)return;
   const {asset,motion,onChange}=current.current;
   const result=nativeMotionSchema.safeParse({...motion,values:DialStore.getValues(id)});
   if(!result.success)return;
   if(JSON.stringify(result.data.values)===lastSaved.current)return;
   pending={asset:{...asset,motion:result.data},onChange};setActive(true);
   clearTimeout(timer);if(!dragging)timer=setTimeout(commit,240);
  });
  const down=(e:PointerEvent)=>{if(e.target instanceof Element&&e.target.closest('.dialkit-root'))dragging=true;};
  const up=()=>{dragging=false;commit();};
  window.addEventListener('pointerdown',down,true);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
  return()=>{unsubscribe();commit();window.removeEventListener('pointerdown',down,true);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);};
 },[id]);
 useEffect(()=>{setActive(false);lastSaved.current=JSON.stringify(asset.motion?.values??{});},[id]);
 useEffect(()=>{
  let previous=TimelineStore.getTransport(id);
  return TimelineStore.subscribe(id,()=>{
   const next=TimelineStore.getTransport(id);
   if(current.current.enabled&&(next.time!==previous.time||next.playing&&!previous.playing))setActive(true);
   previous=next;
  });
 },[id]);
 useEffect(()=>{if(!enabled){TimelineStore.pause(id);setActive(false);}},[id,enabled]);
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReducedMotion(media.matches);
  media.addEventListener('change',update);return()=>media.removeEventListener('change',update);
 },[]);
 const reset=()=>{TimelineStore.pause(id);setActive(false);};
 const toggle=()=>{setActive(true);if(live.playing)live.pause();else if(live.time>=live.duration)live.replay();else live.play();};
 const actions=useRef({toggle,reset});actions.current={toggle,reset};
 useEffect(()=>{
  if(!enabled)return;
  const key=(e:KeyboardEvent)=>{
   if(e.defaultPrevented||e.repeat||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
   const target=e.target;if(!(target instanceof Element))return;
   if(target.closest('.dialkit-root,input:not(.asset-playback-progress),textarea,select,[contenteditable]:not([contenteditable=false]),[role=menu],[role=dialog],[role=slider],button,a'))return;
   if(e.code==='Space'){e.preventDefault();actions.current.toggle();}
   if(e.key==='Escape')actions.current.reset();
  };
  const visibility=()=>{if(document.hidden)TimelineStore.pause(id);};
  window.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  return()=>{window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);};
 },[id,enabled]);
 return {id,motion:previewMotion,active:enabled&&active,playing:enabled&&live.playing,time:live.time*1000,total:Math.max(.01,live.duration)*1000,
  position:{index,progress:0,smart:false},reducedMotion,reset,toggle,loop,toggleLoop:()=>setLoop(v=>!v),
  thumbnailProgress:undefined,
  seek:(time:number)=>{live.pause();live.seek(time/1000);setActive(true);},
  jump:(end:number)=>{live.pause();live.seek(end?live.duration:0);setActive(true);},
 };
}
