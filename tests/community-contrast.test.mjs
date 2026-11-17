import test from 'node:test';
import assert from 'node:assert/strict';
import {communityContrast,contrastRatio,backgroundHex} from '../shared/communityContrast.mjs';
test('Community graphic chooses the most legible brand ink for every swatch',()=>{
 for(const color of ['ink','white','beige','blue-soft','mint','yellow-soft','pink-soft','#ff0178','#ff6d1b','#ffa510','#4b73ff','#000000']){
  const result=communityContrast(color),background=backgroundHex(color);
  assert.ok(result.ratio>=3,color);
  assert.equal(result.ratio,Math.max(contrastRatio(background,'#ffffff'),contrastRatio(background,'#1b1b1b')));
 }
 assert.equal(communityContrast('ink').ink,'#ffffff');
 assert.equal(communityContrast('white').ink,'#1b1b1b');
});
