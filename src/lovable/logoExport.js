// Only original, locally bundled logo masters are passed to this exporter.
export async function logoExportBlob(src,format){
 const response=await fetch(src);
 if(!response.ok)throw new Error('The logo could not be loaded. Please try again.');
 const source=await response.text();
 const svg=new DOMParser().parseFromString(source,'image/svg+xml').documentElement;
 if(svg.localName!=='svg')throw new Error('The logo could not be loaded. Please try again.');
 const [, , width,height]=svg.getAttribute('viewBox').trim().split(/[\s,]+/).map(Number);
 const blob=new Blob([source],{type:'image/svg+xml'});
 if(format==='svg')return blob;
 if(format==='pdf'){
  const [{jsPDF}]=await Promise.all([import('jspdf'),import('svg2pdf.js')]);
  const pdf=new jsPDF({orientation:width>=height?'landscape':'portrait',unit:'pt',format:[width,height],compress:true});
  await pdf.svg(svg,{x:0,y:0,width,height});
  return pdf.output('blob');
 }
 if(!['png','webp'].includes(format))throw new Error('Choose SVG, PNG, WebP or PDF.');
 const url=URL.createObjectURL(blob);
 try{
  const image=new Image();image.src=url;await image.decode();
  const canvas=document.createElement('canvas');
  canvas.width=2400;canvas.height=Math.round(2400*height/width);
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  const raster=await new Promise(resolve=>canvas.toBlob(resolve,`image/${format}`,1));
  if(!raster||raster.type!==`image/${format}`)throw new Error(`This browser could not export ${format}. Please choose another format.`);
  return raster;
 }finally{URL.revokeObjectURL(url);}
}
export async function downloadLogo(src,format,name){
 const blob=await logoExportBlob(src,format),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=`${name}.${format}`;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
