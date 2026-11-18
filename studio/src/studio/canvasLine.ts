import type {HtmlBlock} from './htmlEditorModel';
import type {ElementFrame} from './htmlSelectionOperations';

/** A line's frame follows its ink, with no empty strip around it. Keep the
 * original stroke center when upgrading previously padded line frames. */
export function tightCanvasLine(block:HtmlBlock):HtmlBlock {
 if(block.kind!=='shape'||block.shape!=='line'||block.editor?.position!=='absolute')return block;
 const frame=block.editor,thickness=frame.appearance?.lineWidth||2,height=frame.height??24;
 if(height===thickness)return block;
 return {...block,editor:{...frame,y:(frame.y??0)+(height-thickness)/2,height:thickness}};
}

/** Resize along the line's own axis, keeping the opposite endpoint fixed. */
export function resizeCanvasLine(frame:ElementFrame,width:number,delta:{x:number;y:number},end:'start'|'end',centered=false):ElementFrame {
 const angle=(frame.rotation??0)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),side=end==='end'?1:-1;
 const minimum=centered?Math.max(1,width+2*((frame.x??0)-4000)):1,maximum=centered?Math.min(4000,width+2*((frame.x??0)+4000)):4000;
 const length=Math.max(minimum,Math.min(maximum,width+side*(delta.x*cos+delta.y*sin)*(centered?2:1))),change=length-width;
 return {...frame,width:undefined,widthPx:length,x:(frame.x??0)+(centered?-1:side*cos-1)*change/2,y:(frame.y??0)+(centered?0:side*sin*change/2)};
}
