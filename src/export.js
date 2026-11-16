import { badgeSvg } from './badges.js';

const imageCache=new Map();
async function embedImage(href){
 if(href.startsWith('data:'))return href;
 if(!imageCache.has(href))imageCache.set(href,fetch(href).then(r=>{if(!r.ok)throw new Error('A badge asset could not load.');return r.blob();}).then(blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);})).catch(error=>{imageCache.delete(href);throw error;}));
 return imageCache.get(href);
}

export async function makeExportSvg(format,options){
 const doc=new DOMParser().parseFromString(badgeSvg(format,options),'image/svg+xml');
 const svg=doc.documentElement;
 await Promise.all([...svg.querySelectorAll('image')].map(async image=>image.setAttribute('href',await embedImage(image.getAttribute('href')))));
 const box=svg.getAttribute('viewBox').split(' ').map(Number);svg.setAttribute('width',Math.ceil(box[2]));svg.setAttribute('height',Math.ceil(box[3]));svg.removeAttribute('class');svg.removeAttribute('data-format');svg.removeAttribute('data-figma-node');
 return new XMLSerializer().serializeToString(svg);
}

function save(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function exportBadge(format,options,type='svg',scale=2){
 const svg=await makeExportSvg(format,options);
 if(type==='copy'){try{await navigator.clipboard.writeText(svg);}catch{throw new Error('Clipboard access is unavailable. Download the .svg instead.');}return;}
 const filename=`lovable-${format}-${options.tier.toLowerCase()}-${options.year}`;
 const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
 if(type==='svg'){save(blob,`${filename}.svg`);return;}
 const url=URL.createObjectURL(blob);
 try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth*scale;canvas.height=img.naturalHeight*scale;canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!png)throw new Error('The image export could not finish.');save(png,`${filename}@${scale}x.png`);}finally{URL.revokeObjectURL(url);}
}
