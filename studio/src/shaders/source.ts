import { toCanvas } from 'html-to-image';
import type { HtmlBlock } from '../studio/htmlEditorModel';

export type CapturedSource={canvas:HTMLCanvasElement;update:()=>void;dispose:()=>void};
const MAX_PREVIEW=1440;
const imageCache=new Map<string,Promise<HTMLImageElement>>();
function image(src:string){let pending=imageCache.get(src);if(!pending){pending=(async()=>{const img=new Image();img.crossOrigin='anonymous';img.src=src;await img.decode();return img;})();imageCache.set(src,pending);}return pending;}
function canvasSize(width:number,height:number){const scale=Math.min(1,MAX_PREVIEW/Math.max(width,height));return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};}

/** The clone is temporary capture DOM only. The live document is never flattened or mutated. */
async function snapshot(element:HTMLElement,fontEmbedCSS:string,whole=false){
  const clone=element.cloneNode(true) as HTMLElement;
  const originals=[...element.querySelectorAll('canvas')],copies=[...clone.querySelectorAll('canvas')];
  copies.forEach((canvas,i)=>{const original=originals[i];canvas.width=original.width;canvas.height=original.height;if(original.width&&original.height)canvas.getContext('2d')?.drawImage(original,0,0);});
  const width=element.offsetWidth,height=element.offsetHeight,size=canvasSize(width,height);
  clone.removeAttribute('id');clone.removeAttribute('data-editing');clone.setAttribute('data-shader-capture','');clone.inert=true;
  Object.assign(clone.style,{position:'relative',left:'0px',top:'0',width:`${width}px`,height:`${height}px`,minHeight:'0',transform:'none',opacity:'1',filter:'none',mixBlendMode:'normal',outline:'none',pointerEvents:'none'});
  clone.style.setProperty('--shader-source-opacity','1');
  if(whole)clone.querySelectorAll<HTMLElement>('.hev-block[data-shader-ready]').forEach(block=>block.style.setProperty('--shader-source-opacity','0'));
  // HTML clones cannot carry a decoded video frame. Replace only the capture copy.
  const videos=[...element.querySelectorAll('video')];
  clone.querySelectorAll('video').forEach((copy,i)=>{
    const video=videos[i],canvas=document.createElement('canvas');
    canvas.width=video.videoWidth||1;canvas.height=video.videoHeight||1;
    if(video.readyState>=2)canvas.getContext('2d')!.drawImage(video,0,0);
    const style=getComputedStyle(video);for(const property of style)canvas.style.setProperty(property,style.getPropertyValue(property));copy.replaceWith(canvas);
  });
  const host=document.createElement('div');Object.assign(host.style,{position:'fixed',left:'-50000px',top:'0',width:`${width}px`,height:`${height}px`,pointerEvents:'none'});host.append(clone);element.parentElement!.append(host);
  try{
    return await toCanvas(clone,{width,height,canvasWidth:size.width,canvasHeight:size.height,pixelRatio:1,fontEmbedCSS,style:{position:'relative',left:'0',top:'0',margin:'0',transform:'none'},
    filter:node=>!(node instanceof Element&&(node.hasAttribute('data-editor-only')||node.matches('.hcs-ui,.hev-block-tools')||node.matches('.studio-shader-surface')&&node.parentElement===clone))});}
  finally{host.remove();}
}

function drawFit(context:CanvasRenderingContext2D,video:HTMLVideoElement,x:number,y:number,w:number,h:number,fit:string){
  const vw=video.videoWidth,vh=video.videoHeight;if(!vw||!vh)return;
  if(fit==='fill'){context.drawImage(video,x,y,w,h);return;}
  const scale=fit==='contain'?Math.min(w/vw,h/vh):Math.max(w/vw,h/vh),dw=vw*scale,dh=vh*scale;
  context.save();context.beginPath();context.rect(x,y,w,h);context.clip();context.drawImage(video,x+(w-dw)/2,y+(h-dh)/2,dw,dh);context.restore();
}
async function videoSource(element:HTMLElement,block:Extract<HtmlBlock,{kind:'media'}>,fallback:HTMLCanvasElement):Promise<CapturedSource>{
  const canvas=document.createElement('canvas');canvas.width=fallback.width;canvas.height=fallback.height;
  const context=canvas.getContext('2d')!,video=element.querySelector('video');
  const mask=block.mediaWindow?.maskEnabled!==false&&block.mediaWindow?.maskSrc?await image(block.mediaWindow.maskSrc):undefined;
  const update=()=>{
    context.clearRect(0,0,canvas.width,canvas.height);
    if(!video||video.readyState<2){context.drawImage(fallback,0,0);return;}
    const w=canvas.width,h=canvas.height,m=block.mediaWindow;
    context.save();
    const radius=(block.editor?.appearance?.radius??block.editor?.radius??0)*w/element.offsetWidth;
    context.beginPath();context.roundRect(0,0,w,h,radius);context.clip();
    drawFit(context,video,m?w*m.x/100:0,m?h*m.y/100:0,m?w*m.width/100:w,m?h*m.height/100:h,block.editor?.appearance?.imageFit??'cover');
    if(mask){context.globalCompositeOperation='destination-in';context.drawImage(mask,0,0,w,h);}
    context.restore();
  };
  update();return {canvas,update,dispose(){canvas.width=0;fallback.width=0;}};
}
export async function captureLayer(element:HTMLElement,block:HtmlBlock|undefined,fontEmbedCSS:string):Promise<CapturedSource>{
  const canvas=await snapshot(element,fontEmbedCSS);
  if(block?.kind==='media'&&block.format==='Video')return videoSource(element,block,canvas);
  return {canvas,update(){},dispose(){canvas.width=0;}};
}

/** Native 2D layers are composited in their existing order, so videos stay behind type.
 * DOM capture supplies each static layer, including its font, crop, border and shadow. */
export async function captureArtwork(element:HTMLElement,blocks:HtmlBlock[],fontEmbedCSS:string):Promise<CapturedSource>{
  const elements=[...element.querySelectorAll<HTMLElement>('.hev-block')];
  // Static artwork needs only one exact DOM snapshot, including authored SVG and transforms.
  if(!element.querySelector('video,.hev-block[data-shader-ready]')){
    const canvas=await snapshot(element,fontEmbedCSS,true);return {canvas,update(){},dispose(){canvas.width=0;}};
  }
  const canvas=document.createElement('canvas'),size=canvasSize(element.offsetWidth,element.offsetHeight);Object.assign(canvas,size);
  const context=canvas.getContext('2d')!,scale=canvas.width/element.offsetWidth;
  const layers=await Promise.all(elements.map(async(node,i)=>{
    const source=await captureLayer(node,blocks[i],fontEmbedCSS);
    let x=0,y=0,parent:HTMLElement|null=node;
    while(parent&&parent!==element){x+=parent.offsetLeft;y+=parent.offsetTop;parent=parent.offsetParent as HTMLElement|null;}
    const style=getComputedStyle(node),transform=new DOMMatrix(style.transform==='none'?undefined:style.transform);
    return {node,source,x,y,width:node.offsetWidth,height:node.offsetHeight,opacity:Number(style.opacity),blend:style.mixBlendMode,transform};
  }));
  const background=getComputedStyle(element).backgroundColor;
  const update=()=>{
    context.clearRect(0,0,canvas.width,canvas.height);context.fillStyle=background;context.fillRect(0,0,canvas.width,canvas.height);
    context.save();context.scale(scale,scale);
    for(const layer of layers){
      layer.source.update();const {node,source,x,y,width,height,opacity,blend,transform:m}=layer;
      const effected=node.querySelector<HTMLCanvasElement>(':scope > .studio-shader-surface');
      context.save();context.globalAlpha=opacity;
      context.globalCompositeOperation=(blend==='normal'?'source-over':blend) as GlobalCompositeOperation;
      context.translate(x+width/2,y+height/2);if(m.is2D)context.transform(m.a,m.b,m.c,m.d,m.e,m.f);
      context.drawImage(effected&&node.hasAttribute('data-shader-ready')?effected:source.canvas,-width/2,-height/2,width,height);context.restore();
    }context.restore();
  };
  update();return {canvas,update,dispose(){layers.forEach(l=>l.source.dispose());canvas.width=0;}};
}
