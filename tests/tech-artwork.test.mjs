import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {techArtworkSvg,curveDefaults,gridDefaults,curvePresets,interpolateTechArtwork} from '../shared/techArtwork.mjs';
test('every construction remains inside the authored crop, including rotated extremes',async()=>{
 for(const {id:preset} of curvePresets)for(const count of [3,64])for(const transform of [{},{scale:280,offsetX:37,offsetY:-24}]){
  const svg=techArtworkSvg({...curveDefaults,preset,count,spread:160,rotation:137,stroke:4,opacity:100,...transform});
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
test('Smart artwork interpolation changes native construction parameters, not image opacity',async()=>{
 const from={...curveDefaults},to={...curveDefaults,scale:214,offsetX:30,spread:60,count:13,rotation:40,stroke:2,opacity:70,color:'#1b1b1b'};
 const middle=interpolateTechArtwork(from,to,.5);
 assert.equal(middle.scale,157);assert.equal(middle.offsetX,15);assert.equal(middle.count,10);assert.equal(middle.rotation,20);assert.equal(middle.spread,80);
 assert.equal(middle.color,'#8d8d8d');assert.equal(from.scale,undefined);
 const frames=await Promise.all([from,middle,to].map(settings=>sharp(Buffer.from(techArtworkSvg(settings))).png().toBuffer()));
 assert.ok(!frames[0].equals(frames[1])&&!frames[1].equals(frames[2]));
 assert.equal(interpolateTechArtwork(from,{...to,preset:'rays'},.5),null);
 assert.equal(interpolateTechArtwork(gridDefaults,{...gridDefaults,spacing:56.08},.5).spacing,42.08);
});
