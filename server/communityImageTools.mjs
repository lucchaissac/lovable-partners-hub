import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
import {communityMediaById} from '../shared/communityMediaLibrary.mjs';
import {imageReservation} from './communityBudget.mjs';
export const communityImageModel='gpt-image-2.6-flare';
const publicRoot=new URL('../public/',import.meta.url);

export async function mediaSource(id,request){
 const data=request.sources.find(s=>s.id===id&&s.kind==='image')?.image??request.canvasImages?.find(s=>s.id===id)?.image;
 if(data)return Buffer.from(data.slice(data.indexOf(',')+1),'base64');
 const prepared=communityMediaById.get(id);
 if(prepared)return readFile(new URL(prepared.src.slice(1),publicRoot));
 throw Error('Attach or select the actual image to edit.');
}
export async function cropMedia(input,crop){
 let pipeline=sharp(input,{limitInputPixels:20_000_000}).rotate();
 if(crop){
  const {width,height}=await pipeline.metadata();
  const left=Math.floor(width*crop.x),top=Math.floor(height*crop.y);
  pipeline=pipeline.extract({left,top,width:Math.max(1,Math.min(width-left,Math.round(width*crop.width))),height:Math.max(1,Math.min(height-top,Math.round(height*crop.height)))});
 }
 return pipeline.resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).png().toBuffer();
}
export async function monochromeGlyph(input,color='#1b1b1b'){
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const rgb=color.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
 const corners=[0,info.width-1,(info.height-1)*info.width,info.width*info.height-1].map(i=>[...data.subarray(i*4,i*4+4)]);
 const transparent=corners.some(c=>c[3]<240);
 const bg=[0,1,2].map(i=>Math.round(corners.reduce((s,c)=>s+c[i],0)/4));
 if(!transparent&&corners.some(c=>Math.max(...bg.map((v,i)=>Math.abs(v-c[i])))>28))throw Error('Crop the logo onto a plain background first. Its outline cannot be extracted reliably from this image.');
 let pixels=0;
 for(let i=0;i<data.length;i+=4){
  const alpha=transparent?data[i+3]:Math.round(data[i+3]*Math.min(1,Math.max(0,(Math.max(...bg.map((v,j)=>Math.abs(v-data[i+j])))-7)/40)));
  data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];data[i+3]=alpha;if(alpha>24)pixels++;
 }
 if(pixels<4)throw Error('No visible logo was found in the crop.');
 return sharp(data,{raw:info}).trim({background:'#00000000',threshold:1}).webp({lossless:true}).toBuffer();
}
export async function prepareCommunityMedia(items,request,{env,signal,budget,callOpenAI}){
 const output=[];
 for(const item of items){
  signal?.throwIfAborted();let buffer;
  const source=item.sourceId?await cropMedia(await mediaSource(item.sourceId,request),item.crop):null;
  if(item.operation==='glyph')buffer=await monochromeGlyph(source,item.color);
  else{
   const prompt=`Create only the separate visual for a Lovable Community editorial composition, not a finished poster. No headline, layout copy, invented UI, fake Lovable logo, or standalone heart. All typography and exact identity are added as native layers by the editor. Follow the requested art direction; use restrained, polished composition, believable materials and diverse people for group photography. ${item.background==='transparent'?'Make the cutout itself fill the image. Do not reserve empty space for headings inside this transparent asset: the native template already provides that space.':'Keep quiet areas requested for native text.'}\n${item.prompt}`;
   const common={model:communityImageModel,prompt,n:1,size:'1024x1024',quality:'medium',background:item.background,output_format:'webp',output_compression:85};
   let body,endpoint,headers;
   if(source){
    body=new FormData();for(const [k,v]of Object.entries(common))body.append(k,String(v));body.append('image',new Blob([source],{type:'image/png'}),'reference.png');endpoint='images/edits';headers={};
   }else{body=JSON.stringify(common);endpoint='images/generations';headers={'Content-Type':'application/json'};}
   const result=await callOpenAI(endpoint,{body,headers,reservation:imageReservation,limit:12_000_000,kind:'image'});
   const encoded=result.data?.[0]?.b64_json;if(typeof encoded!=='string')throw Error('The image service did not return an image. Please retry.');
   let image=sharp(Buffer.from(encoded,'base64'),{limitInputPixels:4_000_000});
   if(item.background==='transparent')image=image.trim({background:'#00000000',threshold:12});
   buffer=await image.resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toBuffer();
  }
  if(buffer.length>1_000_000)buffer=await sharp(buffer).webp({quality:70}).toBuffer();
  if(buffer.length>1_000_000)throw Error('The generated image is too large to save. Please retry.');
  output.push({id:item.id,name:item.operation==='glyph'?'Monochrome logo':'Generated visual',operation:item.operation,image:`data:image/webp;base64,${buffer.toString('base64')}`});
 }
 return output;
}
