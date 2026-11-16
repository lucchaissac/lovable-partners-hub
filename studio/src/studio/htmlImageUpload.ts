const formats = new Set(['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']);
/** Preserve small originals; resize large artwork and rasterize SVGs for the image block. */
export async function readHtmlImage(file:File):Promise<string> {
  if(!formats.has(file.type))throw new Error('Choose a PNG, JPG, WebP, GIF or SVG image.');
  if(file.size>20_000_000)throw new Error('Choose an image smaller than 20 MB.');
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();image.src=url;await image.decode();
    if(file.type!=='image/svg+xml'&&file.size<=1_700_000)return await new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('This image could not be read.'));reader.readAsDataURL(file);
    });
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
    if(!context)throw new Error('This image could not be opened.');
    const width=image.naturalWidth||image.width||1024,height=image.naturalHeight||image.height||1024;
    let edge=Math.min(2560,Math.max(width,height));
    for(let attempt=0;attempt<7;attempt++){
      const scale=Math.min(1,edge/Math.max(width,height));
      canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
      context.drawImage(image,0,0,canvas.width,canvas.height);
      const data=canvas.toDataURL(file.type==='image/svg+xml'&&attempt===0?'image/png':'image/webp',.92-attempt*.06);
      if(data.length<=2_300_000)return data;
      edge*=.8;
    }
    throw new Error('This image is too large. Try a smaller version.');
  }finally{URL.revokeObjectURL(url);}
}
