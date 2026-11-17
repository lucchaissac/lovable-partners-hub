import {readFile,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';

// Source URLs are recorded from the public brand hub, not generated assets.
const manifest=JSON.parse(await readFile(new URL('../design/lovable/source.json',import.meta.url),'utf8'));
const target=new URL('../public/brand/assets/',import.meta.url);
await mkdir(target,{recursive:true});
async function download(url){
 const response=await fetch(url);if(!response.ok)throw Error(`${response.status}: ${url}`);
 return Buffer.from(await response.arrayBuffer());
}
for(const logo of manifest.logos){
 const data=await download(logo.url);if(!data.toString().includes('<svg'))throw Error(`Invalid vector: ${logo.id}`);
 await writeFile(new URL(`${logo.id}.svg`,target),data);
}
const output=[];
for(let offset=0;offset<manifest.media.length;offset+=4){
 const batch=await Promise.all(manifest.media.slice(offset,offset+4).map(async asset=>{
  const buffer=await download(asset.url),meta=await sharp(buffer).metadata();
  for(const width of [640,1280])await sharp(buffer).rotate().resize({width,withoutEnlargement:true}).webp({quality:86}).toFile(new URL(`${asset.id}-${width}.webp`,target).pathname);
  return {...asset,width:meta.width,height:meta.height,src:`/brand/assets/${asset.id}-1280.webp`,thumbnail:`/brand/assets/${asset.id}-640.webp`};
 }));output.push(...batch);
}
const catalog={...manifest,media:output,logos:manifest.logos.map(logo=>({...logo,src:`/brand/assets/${logo.id}.svg`}))};
await writeFile(new URL('../src/lovable/assets.json',import.meta.url),JSON.stringify(catalog,null,2)+'\n');
console.log(`Prepared ${output.length} images and ${catalog.logos.length} original vectors.`);
