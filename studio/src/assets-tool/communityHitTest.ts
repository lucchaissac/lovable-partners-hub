// Transparent parts of Community art must not hide the objects underneath them.
const masks=new WeakMap<HTMLImageElement,{src:string;data:Uint8ClampedArray}>();
export function communityImageHit(element:HTMLElement,x:number,y:number,zoom:number){
 if(!/^block-community-(?:glow|globe)-/.test(element.id))return true;
 const image=element.querySelector('img');if(!image?.complete||!image.naturalWidth)return true;
 try{
  let mask=masks.get(image);
  if(!mask||mask.src!==image.src){const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,0,0,96,96);mask={src:image.src,data:ctx.getImageData(0,0,96,96).data};masks.set(image,mask);}
  const rect=element.getBoundingClientRect(),angle=Number(element.style.transform.match(/rotate\(([-\d.]+)deg\)/)?.[1]??0)*Math.PI/180;
  const dx=(x-rect.left-rect.width/2)/zoom,dy=(y-rect.top-rect.height/2)/zoom;
  const u=(dx*Math.cos(angle)+dy*Math.sin(angle))/element.offsetWidth+.5,v=(-dx*Math.sin(angle)+dy*Math.cos(angle))/element.offsetHeight+.5;
  if(u<0||v<0||u>=1||v>=1)return false;
  return mask.data[(Math.floor(v*96)*96+Math.floor(u*96))*4+3]>24;
 }catch{return true;}
}
