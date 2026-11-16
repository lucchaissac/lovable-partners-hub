import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanLogoPixels } from './logoPixels.ts';

function fixture(background:number[],foreground:number[]) {
  const data=new Uint8ClampedArray(10*10*4);
  for(let i=0;i<100;i++)data.set(background,i*4);
  for(let y=3;y<7;y++)for(let x=2;x<8;x++)data.set(foreground,(y*10+x)*4);
  return data;
}
for(const [name,background,foreground] of [
  ['white',[255,255,255,255],[0,0,0,255]],
  ['dark',[0,0,0,255],[255,255,255,255]],
  ['compressed off-white',[248,247,246,255],[30,30,30,255]],
] as const) test(`removes a ${name} matte and trims empty margins`,()=>{
  const result=cleanLogoPixels(fixture([...background],[...foreground]),10,10);
  assert.equal(result.pixels[3],0);
  assert.deepEqual([...result.pixels.slice((4*10+4)*4,(4*10+4)*4+4)],[255,255,255,255]);
  assert.deepEqual(result.crop,{x:2,y:3,width:6,height:4});
  assert.equal(result.removed,true);
});
test('preserves existing partial transparency',()=>{
  const result=cleanLogoPixels(fixture([0,0,0,0],[10,20,30,128]),10,10);
  assert.equal(result.pixels[(4*10+4)*4+3],128);
  assert.equal(result.removed,false);
});
test('rejects an empty image instead of replacing the previous logo',()=>{
  assert.throws(()=>cleanLogoPixels(fixture([255,255,255,255],[255,255,255,255]),10,10),/No logo/);
});
test('rejects a complex background instead of erasing unknown artwork',()=>{
  const data=fixture([0,0,0,255],[20,20,20,255]);
  for(let i=0;i<100;i++)data.set([i*29%255,i*61%255,i*43%255,255],i*4);
  assert.throws(()=>cleanLogoPixels(data,10,10),/plain background/);
});
