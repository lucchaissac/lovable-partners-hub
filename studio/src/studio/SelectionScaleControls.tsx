import {Button,Tooltip} from '@asset/ui';
import {StudioShapeNumber} from './PresentationElementDesign';
import type {ScaleOrigin} from './selectionScale';

/** Shared compact origin picker, using the existing button and tooltip tokens. */
export function SelectionScaleControls({scale,origin,onScale,onOrigin}:{scale:number;origin:ScaleOrigin;onScale:(scale:number)=>void;onOrigin:(origin:ScaleOrigin)=>void}){
 return <>
  <div className="hcs-design-design-row"><span>Scale</span><StudioShapeNumber label="Group scale" value={Math.round(scale*10000)/100} min={1} max={10000} suffix="%" onChange={(value:number)=>onScale(value/100)}/></div>
  <div className="hcs-design-design-row"><span>Origin</span><div className="hcs-scale-origin" role="group" aria-label="Scale origin">{[0,.5,1].flatMap((y,row)=>[0,.5,1].map((x,col)=>{
   const label=row===1&&col===1?'Center':`${['Top','Middle','Bottom'][row]} ${['left','center','right'][col]}`;
   return <Tooltip key={label} label={label} side="top"><Button variant="ghost" size="sm" aria-label={`Scale from ${label.toLowerCase()}`} aria-pressed={origin[0]===x&&origin[1]===y} onClick={()=>onOrigin([x,y])}><span className="hcs-origin-dot"/></Button></Tooltip>;
  }))}</div></div>
 </>;
}
