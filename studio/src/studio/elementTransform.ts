import type {ElementFrame} from './htmlSelectionOperations';

/** Keep the flat path unchanged; the same CSS is sampled for motion and exports. */
export function elementTransform(frame:ElementFrame={}){
 const translation=`translateY(${frame.position==='absolute'?0:frame.y??0}px)`;
 const rotation=`rotate(${frame.rotation??0}deg)`;
 if(!frame.rotationX&&!frame.rotationY&&!frame.depth)return `${translation} ${rotation}`;
 const perspective=frame.perspective??800,depth=Math.min(frame.depth??0,perspective*.9);
 return `${translation} perspective(${perspective}px) translateZ(${depth}px) ${rotation} rotateX(${frame.rotationX??0}deg) rotateY(${frame.rotationY??0}deg)`;
}
