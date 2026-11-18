import {StudioShapeNumber} from './PresentationElementDesign';
import type {HtmlBlock} from './htmlEditorModel';

export function SelectionPositionControls({blocks,onChange}:{blocks:HtmlBlock[];onChange:(delta:{x?:number;y?:number})=>void}) {
 if(!blocks.every(block=>block.editor?.position==='absolute'))return null;
 return <div className="hcs-design-design-fields">
  {(['x','y'] as const).map(axis=>{
   const positions=blocks.map(block=>block.editor?.[axis]??0),value=Math.min(...positions);
   return <div className="hcs-design-design-row" key={axis}><span>{axis==='x'?'X':'Y'}</span><StudioShapeNumber label={`Selection ${axis}`} value={value} min={Math.ceil(value+Math.max(...positions.map(position=>-4000-position)))} max={Math.floor(value+Math.min(...positions.map(position=>4000-position)))} onChange={(next:number)=>onChange({[axis]:next-value})}/></div>;
  })}
 </div>;
}
