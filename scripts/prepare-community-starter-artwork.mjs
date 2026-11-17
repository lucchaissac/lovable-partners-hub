// Reuse the full original Paris capture already saved with the approved campaign.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createCanvas,loadImage} from '@napi-rs/canvas';
const root=new URL('../',import.meta.url);
const source='examples/ai-for-impact/editorial/community.asset.json';
const document=JSON.parse(await readFile(new URL(source,root),'utf8'));
const globe=document.editor.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat()))
 .find(block=>block.ambassadorElement==='globe'&&block.ambassador.city==='Paris');
if(!globe?.value.src.startsWith('data:image/png;base64,'))throw Error('Missing original Paris globe.');
const jobs=[
 ['paris-globe-1080.webp',Buffer.from(globe.value.src.split(',')[1],'base64'),source],
 ['heart-overlay.webp',await readFile(new URL('public/ambassadors/assets/heart-overlay.png',root)),'public/ambassadors/assets/heart-overlay.png'],
];
const records=[];
for(const [name,bytes,source] of jobs){
 const image=await loadImage(bytes),canvas=createCanvas(image.width,image.height);
 canvas.getContext('2d').drawImage(image,0,0);
 const output=await canvas.encode('webp',92);
 const decoded=await loadImage(output);
 if(decoded.width!==image.width||decoded.height!==image.height)throw Error(`Invalid prepared image: ${name}`);
 await writeFile(new URL(`public/ambassadors/assets/${name}`,root),output);
 records.push({name,source,width:image.width,height:image.height,quality:92,sourceBytes:bytes.length,preparedBytes:output.length,sourceSha256:createHash('sha256').update(bytes).digest('hex')});
}
await writeFile(new URL('examples/community-square-default/prepared-artwork.json',root),JSON.stringify(records,null,2)+'\n');
console.log(records.map(({name,sourceBytes,preparedBytes})=>({name,sourceBytes,preparedBytes})));
