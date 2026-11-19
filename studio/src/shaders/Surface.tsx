import { createContext, useContext, useEffect, useLayoutEffect, useRef } from 'react';
import type { HtmlBlock } from '../studio/htmlEditorModel';
import { shaderMoves, type ShaderEffect } from './settings';
import type { CapturedSource } from './source';
import './shaders.css';

type Clock={time:number;exporting?:boolean};
export const ShaderClockContext=createContext<Clock|null>(null);
export const ShaderArtworkContext=createContext<{live:boolean;fonts:()=>Promise<string>}|null>(null);
type Controller={render:(time:number)=>Promise<void>;ready:()=>Promise<void>};
const surfaces=new Map<HTMLCanvasElement,Controller>();

/** Export explicitly waits for sources and GPU work. Nested layer effects render first. */
export async function sampleShaderSurfaces(root:HTMLElement,time=0){
  const canvases=[...root.querySelectorAll<HTMLCanvasElement>('.studio-shader-surface')].sort((a,b)=>Number(a.dataset.whole)-Number(b.dataset.whole));
  for(const canvas of canvases){const controller=surfaces.get(canvas);if(controller){await controller.ready();await controller.render(time);}}
}
export function hasShaderSurfaces(root:HTMLElement){return !!root.querySelector('.studio-shader-surface');}

export function ShaderSurface({effect,revision,block,blocks,whole=false}:{effect:ShaderEffect;revision:string;block?:HtmlBlock;blocks?:HtmlBlock[];whole?:boolean}){
  const canvas=useRef<HTMLCanvasElement>(null),context=useContext(ShaderArtworkContext),clock=useContext(ShaderClockContext);
  const settings=useRef(effect),currentClock=useRef(clock);settings.current=effect;currentClock.current=clock;
  const controller=useRef<Controller|undefined>(undefined);
  useLayoutEffect(()=>{if(clock&&!clock.exporting)void controller.current?.render(clock.time).catch(()=>{});else if(!clock)void controller.current?.render(0).catch(()=>{});},[effect,clock?.time]);
  useEffect(()=>{
    const output=canvas.current,target=output?.parentElement;if(!output||!target||!context)return;
    let disposed=false,visible=false,frame=0,last=0,time=0,source:CapturedSource|undefined,gpu:Awaited<ReturnType<typeof import('./gpu')['createEffectRenderer']>>|undefined;
    let pending:Promise<void>|undefined,queue=Promise.resolve(),failure:unknown,requested=0;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const failed=(error:unknown)=>{const first=!failure;failure=error;target.removeAttribute('data-shader-ready');output.style.display='none';output.dataset.error=error instanceof Error?error.message:'Effect unavailable';if(first&&!disposed)window.dispatchEvent(new CustomEvent('studio-effect-error',{detail:output.dataset.error}));};
    const initialize=()=>pending??=(async()=>{
      await document.fonts.ready;
      const [{createEffectRenderer},{captureLayer,captureArtwork},fonts]=await Promise.all([import('./gpu'),import('./source'),context.fonts()]);
      if(disposed)return;
      if(whole){const nested=target.querySelector<HTMLElement>('.hev');if(nested)await sampleShaderSurfaces(nested,0);}
      source=whole?await captureArtwork(target,blocks??[],fonts):await captureLayer(target,block,fonts);
      if(disposed){source.dispose();return;}
      gpu=await createEffectRenderer(source.canvas,output);
      if(disposed){gpu.dispose();source.dispose();return;}
      source.update();await gpu.render(settings.current,0);
      if(!disposed){target.setAttribute('data-shader-ready','');output.dataset.ready='true';}
    })().catch(error=>{failed(error);throw error;});
    const render=(at:number)=>{
      // Coalesce interactive frames; exports await each request and never skip a sample.
      const sequence=++requested;
      queue=queue.catch(()=>{}).then(async()=>{
        if(disposed||(!currentClock.current?.exporting&&sequence!==requested))return;await initialize();if(disposed||!gpu||!source)return;
        source.update();await gpu.render(settings.current,at);output.dataset.time=String(Math.round(at));
      }).catch(error=>{failed(error);throw error;});return queue;
    };
    const api:Controller={ready:initialize,render};controller.current=api;surfaces.set(output,api);
    const tick=(now:number)=>{
      if(disposed)return;
      const active=!failure&&visible&&!document.hidden&&!reduced.matches&&context.live&&!currentClock.current&&shaderMoves(settings.current)&&!target.hasAttribute('data-editing');
      if(active&&now-last>=1000/30){time+=last?Math.min(100,now-last):0;last=now;void render(time).catch(()=>{}).finally(()=>{if(!disposed)frame=requestAnimationFrame(tick);});}
      else {if(!active)last=now;frame=requestAnimationFrame(tick);}
    };
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible&&!failure)void render(currentClock.current?.time??time).catch(()=>{});});observer.observe(target);
    frame=requestAnimationFrame(tick);
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();surfaces.delete(output);controller.current=undefined;target.removeAttribute('data-shader-ready');void queue.catch(()=>{}).finally(()=>{gpu?.dispose();source?.dispose();});};
  },[revision,whole,context?.fonts]);
  return <canvas ref={canvas} className="studio-shader-surface" data-whole={Number(whole)} aria-hidden="true"/>;
}
