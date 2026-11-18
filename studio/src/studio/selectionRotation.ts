import type {ElementFrame,Rect} from './htmlSelectionOperations';

/** Rotate every center around the shared pivot, then add the same angle to
 * each element. Measured boxes account for initial rotation and canvas zoom. */
export function rotateSelectionFrames(items:{id:string;frame:ElementFrame;box:Rect}[],bounds:Rect,degrees:number):Record<string,ElementFrame>{
 const cx=bounds.left+bounds.width/2,cy=bounds.top+bounds.height/2;
 const angle=degrees*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
 return Object.fromEntries(items.map(({id,frame,box})=>{
  const x=box.left+box.width/2-cx,y=box.top+box.height/2-cy;
  return [id,{...frame,x:(frame.x??0)+x*cos-y*sin-x,y:(frame.y??0)+x*sin+y*cos-y,rotation:(((frame.rotation??0)+degrees+180)%360+360)%360-180}];
 }));
}
