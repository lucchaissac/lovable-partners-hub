import {useEffect,useRef} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';

/** Drag an unfocused inspector value; a click still enters ordinary text editing. */
export function useNumberScrub(){
 const cleanup=useRef<(()=>void)|undefined>(undefined);
 useEffect(()=>()=>cleanup.current?.(),[]);
 return (event:ReactPointerEvent<HTMLSpanElement>)=>{
  if(event.defaultPrevented||event.button!==0||event.pointerType==='touch')return;
  const input=event.currentTarget.querySelector<HTMLInputElement>('input[type="number"]');
  if(!input||input.matches(':disabled')||input.readOnly||!input.closest('.lovable-design,.hcs-design-design-panel,.hev-inspector,.studio-properties'))return;
  if(input.ownerDocument.activeElement===input&&event.target===input)return;
  const start=input.valueAsNumber;
  if(!Number.isFinite(start))return;
  event.preventDefault();
  const doc=input.ownerDocument,pointer=event.pointerId,x=event.clientX,gesture=crypto.randomUUID();
  const step=input.step==='any'?.01:Number(input.step)||1;
  const min=input.min===''?-Infinity:Number(input.min),max=input.max===''?Infinity:Number(input.max);
  const setValue=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
  let dragging=false,last=input.value;
  const write=(value:number)=>{
   const next=String(Number(Math.min(max,Math.max(min,value)).toFixed(6)));
   if(next===last)return;last=next;
   setValue.call(input,next);input.dispatchEvent(new Event('input',{bubbles:true}));
  };
  const move=(e:PointerEvent)=>{
   if(e.pointerId!==pointer)return;
   const dx=e.clientX-x;
   if(!dragging&&Math.abs(dx)<3)return;
   dragging=true;doc.documentElement.dataset.numberScrubbing=gesture;e.preventDefault();
   write(start+Math.round(dx/3)*(e.shiftKey?10:1)*step);
  };
  const stop=()=>{delete doc.documentElement.dataset.numberScrubbing;doc.removeEventListener('pointermove',move);doc.removeEventListener('pointerup',up);doc.removeEventListener('pointercancel',cancel);doc.removeEventListener('keydown',key);cleanup.current=undefined;};
  const up=(e:PointerEvent)=>{if(e.pointerId!==pointer)return;stop();if(!dragging){input.focus();input.select();}};
  const cancel=()=>{write(start);stop();};
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel();}};
  cleanup.current?.();cleanup.current=stop;
  doc.addEventListener('pointermove',move,{passive:false});doc.addEventListener('pointerup',up);doc.addEventListener('pointercancel',cancel);doc.addEventListener('keydown',key);
 };
}
