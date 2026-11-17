// Package the two previously approved monochrome marks for independent library use.
// This only crops the existing transparent master; it never redraws the identities.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createCanvas,loadImage} from '@napi-rs/canvas';
const root=new URL('../',import.meta.url);
const output=new URL('public/ambassadors/library/',root);
await mkdir(output,{recursive:true});
const source=await loadImage(await readFile(new URL('examples/malaga-community/refinement/partners-monochrome.png',root)));
const marks=[
 {name:'startup-oasis',x:80,y:174,width:979,height:428},
 {name:'malaga-startups',x:1209,y:121,width:895,height:444},
];
for(const mark of marks){
 const canvas=createCanvas(mark.width,mark.height);
 canvas.getContext('2d').drawImage(source,mark.x,mark.y,mark.width,mark.height,0,0,mark.width,mark.height);
 await writeFile(new URL(`${mark.name}.png`,output),canvas.toBuffer('image/png'));
 const thumb=createCanvas(320,Math.round(320*mark.height/mark.width));
 thumb.getContext('2d').drawImage(canvas,0,0,thumb.width,thumb.height);
 await writeFile(new URL(`${mark.name}-thumb.webp`,output),await thumb.encode('webp',92));
 console.log(`${mark.name}: ${mark.width} × ${mark.height}`);
}
