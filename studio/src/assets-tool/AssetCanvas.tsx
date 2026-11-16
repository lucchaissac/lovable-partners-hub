import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Dropdown } from '@asset/ui';
import { Artwork } from './Artwork';
import { assetDimensions, type AssetDocument } from './model';

type Props = {toolbar?:ReactNode;asset:AssetDocument;onChange:(asset:AssetDocument)=>void;preview:boolean;busy:boolean;zoom:number;onZoom:(zoom:number)=>void};
/** Only viewport/zoom chrome. Selection, gestures, text tools and Design belong to HtmlEditorV1. */
export function AssetCanvas({asset,onChange,preview,busy,zoom,onZoom,toolbar}:Props) {
  const viewport=useRef<HTMLDivElement>(null);
  const [bounds,setBounds]=useState({width:800,height:600});
  const dimensions=assetDimensions(asset);
  const fit=Math.min(1,Math.max(.1,(bounds.width-80)/dimensions.width),Math.max(.1,(bounds.height-120)/dimensions.height));
  const scale=zoom||fit;
  useLayoutEffect(()=>{const element=viewport.current;if(!element)return;const observer=new ResizeObserver(([entry])=>setBounds({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(element);return()=>observer.disconnect();},[]);
  return <div className="we-main asset-canvas-area">{toolbar}
    <div ref={viewport} className="asset-canvas-scroll studio-workspace-scroll" data-html-selection-surface={!preview&&!busy||undefined} aria-label="Asset canvas">
      <div className="asset-canvas-center"><div className="asset-scaled-board" style={{width:dimensions.width*scale,height:dimensions.height*scale}}>
        <div className="asset-canvas-transform" style={{transform:`scale(${scale})`}}><Artwork asset={asset} onChange={!preview&&!busy?onChange:undefined} scale={scale}/></div>
        {busy&&<div className="asset-generating-overlay" aria-hidden="true"/>}
      </div></div>
    </div>
    <div className="asset-canvas-footer"><span>{dimensions.width} × {dimensions.height}</span><div className="asset-zoom">
      <input type="range" className="asset-zoom-range" min={10} max={300} step={1} value={Math.round(scale*100)} aria-label="Zoom" aria-valuetext={`${Math.round(scale*100)}%`} style={{background:`linear-gradient(to right, var(--ui-border-default) ${(scale*100-10)/290*100}%, var(--ui-border) 0)`}} onChange={event=>onZoom(Number(event.target.value)/100)}/>
      <Dropdown align="end" placement="top" listHeight="auto" value={zoom?String(Math.round(scale*100)):'fit'} items={[...[300,200,125,100,75,50,25,10].map(value=>({id:String(value),label:`${value}%`})),{kind:'separator'},{id:'fit',label:'Fit'}]} onChange={value=>onZoom(value==='fit'?0:Number(value)/100)} trigger={<Button variant="ghost" size="sm" aria-label={`Zoom: ${Math.round(scale*100)}%`}>{Math.round(scale*100)}%</Button>}/>
    </div></div>
  </div>;
}
