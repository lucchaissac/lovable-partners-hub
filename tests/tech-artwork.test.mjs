import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {techArtworkSvg,curveDefaults,gridDefaults,curvePresets} from '../shared/techArtwork.mjs';
test('every construction remains inside the authored crop, including rotated extremes',async()=>{
 for(const {id:preset} of curvePresets)for(const count of [3,64]){
  const svg=techArtworkSvg({...curveDefaults,preset,count,spread:160,rotation:137,stroke:4,opacity:100});
  assert.doesNotMatch(svg,/NaN|Infinity|<image|<script/);
  const {data,info}=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let visible=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const alpha=data[(y*info.width+x)*4+3];
   if(alpha){visible++;assert.ok(x>=393&&x<=645&&y>=28&&y<=309,`${preset} escaped crop at ${x},${y}`);}
  }
  assert.ok(visible>200,`${preset} is empty`);
 }
});
test('a denser dotted grid actually adds points and stays native SVG',async()=>{
 const loose=techArtworkSvg({...gridDefaults,style:'dots',spacing:40,stroke:1});
 const dense=techArtworkSvg({...gridDefaults,style:'dots',spacing:16,stroke:1});
 assert.ok((dense.match(/<circle/g)||[]).length>(loose.match(/<circle/g)||[]).length);
 assert.doesNotMatch(dense,/<image|<script/);
 assert.equal((await sharp(Buffer.from(dense)).metadata()).width,674);
});
