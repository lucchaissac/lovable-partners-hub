import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {toCanvas} from 'html-to-image';
import {BufferTarget,CanvasSource,Mp4OutputFormat,WebMOutputFormat,Output,Quality,canEncodeVideo} from 'mediabunny';
import {Artwork} from './Artwork';
import {assetDimensions,type AssetDocument} from './model';
import {newsletterAnimationGlobe} from './assetPlayback';
import {embeddedAssetFonts,filename} from './media';
import {videoDimensions} from './videoExport';
import {createNewsletterMotionRenderer} from '../../../src/ambassadors/render.js';
import {communityGradientPreview,communityGradientMaster} from '../../../shared/communityPreparedArtwork.mjs';
import {newsletterLoopSeconds} from '../../../public/ambassadors/scene/newsletter-motion.mjs';

/** Rasterize the native static layers once, retaining the exact layer order.
 * Stream only the animated globe between them; never rasterize native type
 * or move the user's composition on every frame. */
export async function exportNewsletterVideo(asset:AssetDocument,parent:HTMLElement,signal:AbortSignal,onProgress:(percent:number)=>void){
 const globe=newsletterAnimationGlobe(asset);
 if(!globe||globe.kind!=='image'||!globe.ambassador)throw Error('Choose a Newsletter globe first.');
 const blocks=asset.editor!.pages.flatMap(p=>p.sections.flatMap(s=>s.columns.flat()));
 if(blocks.some(b=>b.kind==='media'&&!b.editor?.hidden)||blocks.filter(b=>b.kind==='image'&&b.ambassadorElement==='globe'&&!b.editor?.hidden).length!==1)throw Error('Export globe motion with one globe and static surrounding layers.');
 if(globe.editor?.rotation||globe.editor?.groupId)throw Error('Ungroup the globe and reset its rotation before exporting globe motion.');
 const size=assetDimensions(asset),{width,height}=videoDimensions(asset),frameRate=30;
 const quality=new Quality({bitrate:Math.max(8_000_000,Math.round(width*height*frameRate*.22))});
 const config={width,height,quality,frameRate};
 const codec=await canEncodeVideo('avc',config)?'avc':await canEncodeVideo('vp9',config)?'vp9':undefined;
 if(!codec)throw Error('Video export is unavailable in this browser. Try Chrome, Edge or Safari.');
 signal.throwIfAborted();
 const target=new BufferTarget(),format=codec==='avc'?new Mp4OutputFormat({fastStart:'in-memory'}):new WebMOutputFormat();
 const output=new Output({format,target});
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d',{alpha:false})!;
 const video=new CanvasSource(canvas,{codec,quality,keyFrameInterval:2});output.addVideoTrack(video,{frameRate});
 const host=document.createElement('div');parent.append(host);const root=createRoot(host);
 let renderer:Awaited<ReturnType<typeof createNewsletterMotionRenderer>>|undefined,before:HTMLCanvasElement|undefined,after:HTMLCanvasElement|undefined,finished=false;
 try{
  flushSync(()=>root.render(<Artwork asset={asset}/>));
  const board=host.querySelector<HTMLElement>('.asset-artwork')!;
  for(const img of board.querySelectorAll<HTMLImageElement>('img'))if(img.getAttribute('src')===communityGradientPreview)img.src=communityGradientMaster;
  await document.fonts.ready;await Promise.all([...board.querySelectorAll('img')].map(img=>img.decode()));
  const image=[...board.querySelectorAll('img')].find(img=>img.getAttribute('src')===globe.value.src);
  const globeElement=image?.closest<HTMLElement>('.hev-block');
  if(!image||!globeElement)throw Error('The globe layer could not be prepared for export.');
  const rect=image.getBoundingClientRect(),bounds=board.getBoundingClientRect();
  const frame={x:rect.left-bounds.left,y:rect.top-bounds.top,width:rect.width,height:rect.height};
  const appearance=getComputedStyle(globeElement),opacity=Number(appearance.opacity),filter=appearance.filter;
  const layers=[...board.querySelectorAll<HTMLElement>('.hev-block')],at=layers.indexOf(globeElement);
  if(at<0)throw Error('The globe layer order could not be read.');
  const fontEmbedCSS=await embeddedAssetFonts(asset);
  const capture=()=>toCanvas(board,{...size,pixelRatio:1,fontEmbedCSS,style:{transform:'none',margin:'0'},filter:node=>!(node instanceof Element&&node.hasAttribute('data-editor-only'))});
  layers.forEach((layer,index)=>layer.style.visibility=index>=at?'hidden':'');
  before=await capture();signal.throwIfAborted();
  layers.forEach((layer,index)=>layer.style.visibility=index<=at?'hidden':'');board.style.backgroundColor='transparent';
  after=await capture();signal.throwIfAborted();
  renderer=await createNewsletterMotionRenderer(globe.ambassador,{pixels:2160,signal});
  await output.start();
  const frames=newsletterLoopSeconds*frameRate,scale=Math.min(width/size.width,height/size.height);
  for(let frameIndex=0;frameIndex<frames;frameIndex++){
   signal.throwIfAborted();
   const bitmap=await renderer.frame(frameIndex/frameRate);
   try{
    context.resetTransform();context.globalAlpha=1;context.filter='none';
    context.fillStyle='#1b1b1b';context.fillRect(0,0,width,height);context.scale(scale,scale);
    context.drawImage(before,0,0);context.globalAlpha=opacity;context.filter=filter;
    context.drawImage(bitmap,frame.x,frame.y,frame.width,frame.height);
    context.globalAlpha=1;context.filter='none';context.drawImage(after,0,0);
    await video.add(frameIndex/frameRate,1/frameRate);
   }finally{bitmap.close();}
   onProgress(Math.min(99,Math.round((frameIndex+1)/frames*100)));
   if(frameIndex%5===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  await output.finalize();signal.throwIfAborted();finished=true;onProgress(100);
  return {blob:new Blob([target.buffer!],{type:format.mimeType}),name:`${filename(asset.title)}-${width}x${height}${format.fileExtension}`};
 }finally{
  renderer?.dispose();if(!finished)await output.cancel().catch(()=>{});
  root.unmount();host.remove();canvas.width=canvas.height=0;
  if(before)before.width=before.height=0;if(after)after.width=after.height=0;
 }
}
