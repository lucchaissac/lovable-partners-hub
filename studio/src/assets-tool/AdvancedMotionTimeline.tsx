import {memo,useLayoutEffect,useRef} from 'react';
import {DialTimeline} from 'dialkit';
import './dialkit.css';
import './nativeMotion.css';

/** DialKit portals its dock to body. Anchor that portal to our existing strip,
 * so it never covers Chat, Design, the toolbar or the canvas footer. */
export const AdvancedMotionTimeline=memo(function AdvancedMotionTimeline({onClose}:{onClose:()=>void}){
 const slot=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const host=slot.current;if(!host)return;
  const root=document.documentElement;
  const update=()=>{
   const box=host.getBoundingClientRect(),style=getComputedStyle(host);
   for(const [key,value] of Object.entries({left:box.left,top:box.top,width:box.width,height:box.height}))root.style.setProperty(`--asset-motion-${key}`,`${value}px`);
   for(const key of ['bg','bg-subtle','bg-muted','text','text-muted','border'])root.style.setProperty(`--asset-motion-${key}`,style.getPropertyValue(`--ui-${key}`));
  };
  update();const resize=new ResizeObserver(update);resize.observe(host);
  const theme=new MutationObserver(update);theme.observe(root,{attributes:true,attributeFilter:['data-theme','class']});theme.observe(document.body,{attributes:true,attributeFilter:['data-theme','class']});
  window.addEventListener('resize',update);window.addEventListener('scroll',update,true);
  return()=>{resize.disconnect();theme.disconnect();window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);};
 },[]);
 return <div ref={slot} className="asset-motion-slot" aria-label="Advanced animation timeline"><DialTimeline visible defaultOpen productionEnabled onVisibilityChange={visible=>{if(!visible)onClose();}}/></div>;
});
