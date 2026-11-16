import {parse} from 'opentype.js';
import {createRenderer,DEFAULTS,cityLocation,validateDetails} from './source/renderer.mjs';
import qrcode from './source/qrcode.js';
export {DEFAULTS};
const toData=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
const read=async path=>{const response=await fetch(path);if(!response.ok)throw Error('The community artwork could not load. Please try again.');return response;};
let renderer,cityIndex;
function loadRenderer(){return renderer??=Promise.all([read('/fonts/CameraPlain-Bold.ttf').then(r=>r.arrayBuffer()).then(parse),read('/ambassadors/assets/CameraPlain-Regular.ttf').then(r=>r.arrayBuffer()).then(parse),read('/ambassadors/assets/heart-overlay.png').then(r=>r.blob()).then(toData)]).then(([bold,regular,heartOverlay])=>createRenderer({bold,regular,heartOverlay,qrcode})).catch(error=>{renderer=undefined;throw error;});}
// The scene is the original kit renderer. Only its capture bridge is new.
class Scene {
 constructor(spotlight){this.spotlight=spotlight;this.listeners=new Set();this.revision=0;this.lastCity='';this.queue=Promise.resolve();}
 send(data){this.frame.contentWindow.postMessage(data,location.origin);}
 wait(type,test=()=>true){return new Promise((resolve,reject)=>{const listener=data=>{if(data.type!==type||!test(data))return;clearTimeout(timer);this.listeners.delete(listener);resolve(data);};const timer=setTimeout(()=>{this.listeners.delete(listener);reject(Error('The community globe could not render. Please retry with WebGL enabled.'));},25000);this.listeners.add(listener);});}
 async mount(){
  if(this.ready)return this.ready;
  this.frame=document.createElement('iframe');this.frame.title='Community artwork renderer';this.frame.setAttribute('aria-hidden','true');this.frame.tabIndex=-1;
  Object.assign(this.frame.style,{position:'fixed',left:'-1200px',top:'0',width:'1080px',height:'1080px',border:'0',pointerEvents:'none'});
  this.message=event=>{if(event.origin===location.origin&&event.source===this.frame.contentWindow)for(const listener of this.listeners)listener(event.data||{});};
  window.addEventListener('message',this.message);
  this.ready=this.wait('ready').catch(error=>{this.dispose();throw error;});
  this.frame.src=`/ambassadors/scene/asset.html?embed&hd&${this.spotlight?'spotlight':'live-globe'}`;
  document.body.append(this.frame);return this.ready;
 }
 dispose(){this.frame?.remove();window.removeEventListener('message',this.message);this.ready=undefined;this.lastCity='';}
 async capture(state,pixels=2160){
  await this.mount();this.send({type:'renderer-active',active:true});
  try{
   if(this.spotlight){this.send({type:'avatarMode',on:true});this.send({type:'loop',on:false});this.send({type:'spotlight-details',name:state.name,city:state.city,ambassadorType:state.role});const photo=this.wait('photo-ready');this.send({type:'avatarSrc',src:state.photo});await photo;}
   if(this.lastCity!==state.city){
    let point=cityLocation(state.city);if(!point){cityIndex??=read('/ambassadors/assets/cities.json').then(r=>r.json()).then(data=>data.cities).catch(()=>({}));point=cityLocation(state.city,await cityIndex);}
    const [lat,lon]=point||[28,10],requestId=++this.revision;
    const settled=this.spotlight?new Promise(resolve=>setTimeout(resolve,1800)):this.wait('globe-city-settled',data=>data.requestId===requestId);
    this.send({type:'city',name:state.city,lat,lon,requestId});await settled;this.lastCity=state.city;
   }
   const requestId=++this.revision,pending=this.wait(this.spotlight?'render-done':'globe-render-done',data=>data.requestId===requestId);
   this.send({type:this.spotlight?'render':'render-globe',pixels,requestId});
   const result=await pending;if(!(result.blob instanceof Blob))throw Error('The community artwork could not render.');return toData(result.blob);
  }finally{this.send({type:'renderer-active',active:false});}
 }
}
const globe=new Scene(false),spotlight=new Scene(true),globes=new Map();let jobs=Promise.resolve();
function globeImage(state,pixels){const key=`${state.city.trim().toLowerCase()}:${pixels}`;if(!globes.has(key)){const result=globe.capture(state,pixels).catch(error=>{globes.delete(key);throw error;});globes.set(key,result);if(globes.size>8)globes.delete(globes.keys().next().value);}return globes.get(key);}
/** @param {object} settings @param {{pixels?:number,element?:'globe',signal?:AbortSignal}} [options] */
export function renderAmbassador(settings,{pixels=1600,element=undefined,signal=undefined}={}){
 const run=async()=>{
  signal?.throwIfAborted();
  const state={...structuredClone(DEFAULTS),...settings,badgeMode:'single'};
  const globePixels=pixels<=1600?1080:pixels<=2160?2160:4320;
  if(element==='globe'){
   if(!state.city.trim())throw Error('Add a city.');
   const src=await globeImage(state,globePixels);signal?.throwIfAborted();
   return {src,svg:'',width:globePixels,height:globePixels};
  }
  const error=validateDetails(state);if(error)throw Error(error);
  const engine=await loadRenderer(),unsupported=engine.unsupported(state);if(unsupported)throw Error(`The brand font does not support: ${unsupported}`);
  const options=state.format==='spotlight'?{spotlightImage:await spotlight.capture(state)}:state.format==='badge'?{}:{globeImage:await globeImage(state,globePixels)};
  signal?.throwIfAborted();
  const svg=engine.render(state,options),image=new Image();image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;await image.decode();
  const canvas=document.createElement('canvas'),scale=pixels/Math.max(image.naturalWidth,image.naturalHeight);canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);const context=canvas.getContext('2d');context.fillStyle='#1b1b1b';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  return {src:canvas.toDataURL('image/jpeg',.94),svg,width:image.naturalWidth,height:image.naturalHeight};
 };
 const result=jobs.catch(()=>{}).then(run);jobs=result;return result;
}
