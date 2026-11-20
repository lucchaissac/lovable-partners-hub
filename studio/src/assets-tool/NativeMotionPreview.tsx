import {memo,useLayoutEffect,useMemo,useRef} from 'react';
import {CanvasVideoPlaybackContext} from '../studio/HtmlCanvasVideo';
import {Artwork} from './Artwork';
import {assetColor,assetDimensions,type AssetDocument} from './model';
import {compileNativeMotion,motionBlocks,sampleNativeMotion,type NativeMotion} from './nativeMotion';
import {animateNativeText} from './textAnimationPreview';

const PreviewArtwork=memo(Artwork);
/** A disposable read-only instance of the normal native renderer. One sampler
 * drives timeline scrubbing, playback and deterministic offline video export. */
export function NativeMotionPreview({asset,motion=asset.motion!,time,scale,onExit,playing=false,exporting=false}:{asset:AssetDocument;motion?:NativeMotion;time:number;scale:number;onExit:()=>void;playing?:boolean;exporting?:boolean}){
 const root=useRef<HTMLDivElement>(null);
 const compiled=useMemo(()=>compileNativeMotion(motion),[motion]);
 const blocks=useMemo(()=>motionBlocks(asset).filter(b=>!b.editor?.hidden),[asset]);
 const elements=useRef<{id:string;node:HTMLElement;transform:string;opacity:string;original:Record<string,string>;written:Record<string,string>;text?:ReturnType<typeof animateNativeText>}[]>([]);
 const characterIds=motion.clips.filter(c=>'characters' in c.props).flatMap(c=>c.blockIds).join('|');
 const mediaTime=useRef(time);mediaTime.current=time;
 useLayoutEffect(()=>{
  elements.current=[...(root.current?.querySelectorAll<HTMLElement>('.hev-block')??[])].map((node,i)=>{
   const block=blocks[i],style=getComputedStyle(node);
   return {id:block.id,node,transform:style.transform==='none'?'':style.transform,opacity:style.opacity,original:Object.fromEntries(['translate','transform','opacity'].map(key=>[key,node.style.getPropertyValue(key)])),written:{},text:characterIds.split('|').includes(block.id)?animateNativeText(node,'characters'):undefined};
  });
  return()=>{elements.current.forEach(item=>{item.text?.restore();for(const [key,value] of Object.entries(item.written))if(item.node.style.getPropertyValue(key)===value)item.node.style.setProperty(key,item.original[key]);});elements.current=[];};
 },[asset,characterIds]);
 useLayoutEffect(()=>{
  const states=sampleNativeMotion(motion,time,compiled,blocks);
  elements.current.forEach(({id,node,transform,opacity,text,written})=>{
   const state=states.get(id);
   node.style.translate=`${state?.x??0}px ${state?.y??0}px`;
   node.style.transform=`${transform} rotate(${state?.rotation??0}deg) scale(${state?.scale??1})`.trim();
   node.style.opacity=state?.opacity===undefined?opacity:String(state.opacity);
   for(const key of ['translate','transform','opacity'])written[key]=node.style.getPropertyValue(key);
   if(state?.characters!==undefined)text?.sampleCharacters(state.characters/100,!!state.cursor,time);
  });
 },[asset,motion,compiled,time,characterIds]);
 useLayoutEffect(()=>{
  if(exporting)return;
  const videos=[...(root.current?.querySelectorAll('video')??[])];
  for(const video of videos){video.muted=true;if(playing)void video.play().catch(()=>{});else video.pause();}
  return()=>videos.forEach(video=>video.pause());
 },[asset,playing,exporting]);
 useLayoutEffect(()=>{
  if(playing||exporting)return;
  const videos=[...(root.current?.querySelectorAll('video')??[])];
  const seek=(video:HTMLVideoElement)=>{if(Number.isFinite(video.duration)&&video.duration>0)video.currentTime=mediaTime.current/1000%video.duration;};
  const listeners=videos.map(video=>{const loaded=()=>seek(video);video.addEventListener('loadedmetadata',loaded);seek(video);return()=>video.removeEventListener('loadedmetadata',loaded);});
  return()=>listeners.forEach(remove=>remove());
 },[asset,playing,exporting,time]);
 const {width,height}=assetDimensions(asset);
 return <div className="community-page-stack asset-playback-stack"><div className="asset-scaled-board" style={{width:width*scale,height:height*scale}}>
  <div ref={root} className="asset-playback-preview asset-canvas-transform" style={{width,height,transform:`scale(${scale})`}} aria-label="Animation preview" onClick={onExit}>
   <div data-playback-background style={{position:'absolute',inset:0,backgroundColor:assetColor(asset.background)}}/>
   <CanvasVideoPlaybackContext.Provider value={true}><div data-playback-from><PreviewArtwork asset={asset} scale={scale}/></div></CanvasVideoPlaybackContext.Provider>
  </div>
 </div></div>;
}
