// Render approved native branding overlays into single portable library photos.
// Raster scene edits are prepared separately with image_gen; identities stay exact vectors.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createCanvas,loadImage} from '@napi-rs/canvas';
const output=new URL('../public/ambassadors/library/',import.meta.url);
await mkdir(output,{recursive:true});
const root=new URL('../',import.meta.url);
const jobs=[
 ['flash-dark','examples/ai-for-impact/editorial/community-flash-badges-dark.png','examples/ai-for-impact/editorial/community-flash-branding-dark.svg'],
 ['flash-light','examples/ai-for-impact/editorial/community-flash-badges-light.png','examples/ai-for-impact/editorial/community-flash-branding-light.svg'],
 ['malaga-makers','examples/malaga-community/refinement/mediterranean-makers-badges.png','examples/malaga-community/refinement/mediterranean-makers-branding.svg'],
 ['paper-collage','examples/ai-for-impact/editorial/impact-collage-lovable-gradient.png'],
 ['mediterranean-materials','examples/malaga-community/refinement/mediterranean-materials.png'],
 ['leaf-macro','examples/ai-for-impact/editorial/nature-macro-lovable-refraction.png'],
 ['pixel-abstraction','public/ambassadors/assets/pixel-abstraction.svg'],
];
for(const [name,source,overlay] of jobs){
 const photo=await loadImage(await readFile(new URL(source,root)));
 const scale=Math.min(1,1600/Math.max(photo.width,photo.height));
 const canvas=createCanvas(Math.round(photo.width*scale),Math.round(photo.height*scale)),ctx=canvas.getContext('2d');
 ctx.drawImage(photo,0,0,canvas.width,canvas.height);
 if(overlay){const branding=await loadImage(await readFile(new URL(overlay,root)));ctx.drawImage(branding,0,0,canvas.width,canvas.height);}
 await writeFile(new URL(`${name}.webp`,output),await canvas.encode('webp',92));
 const thumbnail=createCanvas(320,Math.round(320*canvas.height/canvas.width));
 thumbnail.getContext('2d').drawImage(canvas,0,0,thumbnail.width,thumbnail.height);
 await writeFile(new URL(`${name}-thumb.webp`,output),await thumbnail.encode('webp',85));
 console.log(`${name}: ${canvas.width} × ${canvas.height}`);
}
