import test from 'node:test';
import assert from 'node:assert/strict';
import {canvasBackgroundSchema,canvasBackgroundPresets,communityBrandColors} from '../shared/communityColors.mjs';

test('Canvas backgrounds round-trip legacy presets and selected brand/custom colors',()=>{
 for(const value of [...canvasBackgroundPresets,...communityBrandColors,'#123abc','#123abc80','transparent']){
  assert.equal(canvasBackgroundSchema.parse(JSON.parse(JSON.stringify(value))),value);
 }
});
test('Custom backgrounds accept colors, not CSS expressions or image URLs',()=>{
 for(const value of ['#12','not-a-color','url(https://example.com/image.png)','var(--secret)','linear-gradient(red,blue)']){
  assert.equal(canvasBackgroundSchema.safeParse(value).success,false);
 }
});
