import {textAnimationTimeline,textAnimationOpacity} from '../../../shared/textAnimation.mjs';
import type {ElementAppearance} from '../studio/htmlElementAppearance';

/** Wrap text only in the disposable player DOM. Keep line breaks and rich runs intact. */
export function animateNativeText(element:HTMLElement,mode:NonNullable<ElementAppearance['textAnimation']>){
 const content=element.querySelector<HTMLElement>('.ewb-text-content');if(!content||mode==='none')return;
 const walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT),nodes:Text[]=[];
 while(walker.nextNode())nodes.push(walker.currentNode as Text);
 const units=textAnimationTimeline(nodes.map(node=>node.data).join(''),mode);
 const fragments:{original:Text;nodes:Node[]}[]=[],spans:{element:HTMLElement;unit:typeof units[number]}[]=[];
 let offset=0;
 for(const original of nodes){
  const start=offset;offset+=original.length;const fragment=document.createDocumentFragment();
  for(const unit of units){
   const a=Math.max(start,unit.start),b=Math.min(offset,unit.end);if(a>=b)continue;
   const span=document.createElement('span');span.textContent=original.data.slice(a-start,b-start);span.dataset.textAnimationUnit='';span.style.opacity='0';fragment.append(span);spans.push({element:span,unit});
  }
  if(fragment.childNodes.length){fragments.push({original,nodes:[...fragment.childNodes]});original.replaceWith(fragment);}
 }
 return {
  sample:(progress:number)=>spans.forEach(({element,unit})=>element.style.opacity=String(textAnimationOpacity(unit,progress))),
  sampleCharacters:(progress:number,cursor:boolean,time:number)=>{
   const count=Math.max(0,Math.min(units.length,Math.floor(progress*units.length+1e-6)));
   spans.forEach(({element,unit})=>{
    const visible=units.indexOf(unit)<count;
    element.style.opacity=visible?'1':'0';
    element.style.boxShadow=cursor&&count>0&&unit===units[count-1]&&Math.floor(time/550)%2===0?'1px 0 0 currentColor':'none';
   });
  },
  restore:()=>fragments.forEach(({original,nodes})=>{nodes[0].parentNode?.insertBefore(original,nodes[0]);nodes.forEach(node=>node.parentNode?.removeChild(node));}),
 };
}
