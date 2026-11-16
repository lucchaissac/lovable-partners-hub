import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

function releaseWidth(element: HTMLElement) {
  const wrappers: { node: HTMLElement; filled: boolean }[] = [];
  let child = element;
  while (child.parentElement) {
    const parent = child.parentElement;
    if (!parent.matches('div,section,article') || (parent.tagName !== 'DIV' && child !== element) || parent.matches('.ramp-page,.studio-workspace-content,.studio-workspace-scroll') || parent.children.length !== 1 || Array.from(parent.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())) break;
    wrappers.push({node:parent,filled:parent.hasAttribute('data-workspace-contact-fill')});
    parent.setAttribute('data-workspace-contact-fill', '');
    child = parent;
  }
  return () => wrappers.forEach(({node,filled}) => { if (!filled) node.removeAttribute('data-workspace-contact-fill'); });
}

/** Resize within the existing layout cell; only dedicated widget wrappers can expand. */
export function useWorkspaceWidgetWidth({width,enabled,selected,onChange,label='Contact cards width'}: {label?:string;width?:number;enabled:boolean;selected:boolean;onChange:(width:number)=>void}) {
  const ref = useRef<HTMLDivElement>(null);
  const [draft,setDraft] = useState<number>();
  const drag = useRef<{x:number;pixels:number;available:number;minimum:number;next:number;changed:boolean}|undefined>(undefined);
  const current = draft ?? width;
  const resized = current !== undefined;
  useLayoutEffect(() => {
    if (!resized || !ref.current) return;
    return releaseWidth(ref.current);
  }, [resized,enabled]);
  const cancel = () => { drag.current=undefined;setDraft(undefined); };
  useEffect(() => { if (!selected || !enabled) cancel(); }, [selected,enabled]);
  useEffect(() => { if (!drag.current) setDraft(undefined); }, [width]);
  function measure() {
    const node = ref.current!;
    const pixels = node.getBoundingClientRect().width;
    const restore = releaseWidth(node);
    const previous = node.style.width;
    node.style.width = '100%';
    const available = node.getBoundingClientRect().width;
    node.style.width = previous;
    restore();
    return {pixels,available,minimum:Math.min(100,Math.max(10,160/Math.max(1,available)*100))};
  }
  const clamp = (value:number,minimum:number) => Math.round(Math.max(minimum,Math.min(100,value))*100)/100;
  const handle = enabled && selected && <button type="button" role="slider" className="workspace-contact-resize" aria-label={label} aria-orientation="horizontal" aria-valuemin={10} aria-valuemax={100} aria-valuenow={Math.round(current ?? 100)} aria-valuetext={current === undefined ? 'Original width' : `${Math.round(current)}%`}
    onPointerDown={event=>{
      event.preventDefault();event.stopPropagation();event.currentTarget.focus();event.currentTarget.setPointerCapture(event.pointerId);
      const metrics=measure();const next=clamp(metrics.pixels/Math.max(1,metrics.available)*100,metrics.minimum);
      drag.current={...metrics,x:event.clientX,next,changed:false};setDraft(next);
    }}
    onPointerMove={event=>{const start=drag.current;if(!start)return;start.changed ||= Math.abs(event.clientX-start.x)>1;start.next=clamp((start.pixels+event.clientX-start.x)/Math.max(1,start.available)*100,start.minimum);setDraft(start.next);}}
    onPointerUp={()=>{const start=drag.current;drag.current=undefined;if(start?.changed)onChange(start.next);else setDraft(undefined);}}
    onPointerCancel={cancel} onLostPointerCapture={()=>{if(drag.current)cancel();}}
    onKeyDown={event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();event.stopPropagation();const metrics=measure();const value=current ?? metrics.pixels/Math.max(1,metrics.available)*100;
      const next=clamp(event.key==='Home'?metrics.minimum:event.key==='End'?100:value+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?10:2),metrics.minimum);setDraft(next);onChange(next);
    }}/>
  return {ref,handle,resized,style:{width:current===undefined?undefined:`${current}%`} as CSSProperties};
}
