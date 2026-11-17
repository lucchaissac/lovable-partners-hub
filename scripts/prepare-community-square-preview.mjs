// Render the editable square Event geometry as a lightweight guideline preview.
import {readFile,writeFile} from 'node:fs/promises';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import opentype from 'opentype.js';
import {createRenderer,DEFAULTS} from '../src/ambassadors/source/renderer.mjs';
import {COMMUNITY_MARKUP,COMMUNITY_VIEWBOX} from '../src/ambassadors/source/brand.mjs';
import qrcode from '../src/ambassadors/source/qrcode.js';
import {squareEventLayers} from '../shared/communityStarter.mjs';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root));
const parse=bytes=>opentype.parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const bold=parse(await read('public/fonts/CameraPlain-Bold.ttf')),regular=parse(await read('public/ambassadors/assets/CameraPlain-Regular.ttf'));
const renderer=createRenderer({bold,regular,qrcode,heartOverlay:''});
const layers=squareEventLayers(renderer.layout({...DEFAULTS,format:'social'}));
const data=(bytes,type)=>`data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
const sources={
 glow:data(await read('public/ambassadors/assets/heart-overlay.png'),'image/png'),
 globe:data(await read('public/ambassadors/assets/paris-globe-1080.webp'),'image/webp'),
 logo:data(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${COMMUNITY_VIEWBOX}">${COMMUNITY_MARKUP}</svg>`,'image/svg+xml'),
};
const body=layers.map(layer=>{
 if(layer.kind!=='text')return `<image href="${sources[layer.kind]}" x="${layer.x}" y="${layer.y}" width="${layer.w}" height="${layer.h}"${layer.rotation?` transform="rotate(${layer.rotation} ${layer.x+layer.w/2} ${layer.y+layer.h/2})"`:''}/>`;
 const font=layer.weight==='regular'?regular:bold,options={kerning:true,letterSpacing:layer.tracking??0};
 const baseline=layer.y+(layer.leading+(font.ascender+font.descender)*layer.size/font.unitsPerEm)/2;
 const lines=layer.text.split('\n').flatMap(paragraph=>{
  const wrapped=[];let line='';
  for(const word of paragraph.split(' ')){
   const candidate=line?`${line} ${word}`:word;
   if(line&&font.getAdvanceWidth(candidate,layer.size,options)>layer.w){wrapped.push(line);line=word;}
   else line=candidate;
  }
  return [...wrapped,line];
 });
 return lines.map((line,i)=>{const x=layer.align==='right'?layer.x+layer.w-font.getAdvanceWidth(line,layer.size,options):layer.x;return `<path fill="#f7f4ed" d="${font.getPath(line,x,baseline+i*layer.leading,layer.size,options).toPathData(2)}"/>`;}).join('');
}).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#1b1b1b"/>${body}</svg>`;
const image=await loadImage(Buffer.from(svg)),canvas=createCanvas(720,720);
canvas.getContext('2d').drawImage(image,0,0,720,720);
await writeFile(new URL('public/ambassadors/previews/event-square.webp',root),await canvas.encode('webp',90));
console.log('Prepared square Event preview, 720 × 720.');
