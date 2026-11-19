import test from 'node:test';
import assert from 'node:assert/strict';
import {newsletterLoopSeconds,newsletterMarkerMotion,newsletterMailScale} from '../public/ambassadors/scene/newsletter-motion.mjs';

test('Every staggered city pop and the main Mail join smoothly across the full loop',()=>{
 assert.equal(newsletterLoopSeconds,8);
 for(let index=0;index<26;index++){
  for(const time of [0,.3,2.7,7.999]){
   const a=newsletterMarkerMotion(time,index),b=newsletterMarkerMotion(time+8,index);
   for(const key of Object.keys(a))assert.ok(Math.abs(a[key]-b[key])<1e-10);
  }
  const before=newsletterMarkerMotion(8-.001,index),after=newsletterMarkerMotion(.001,index);
  assert.ok(Math.abs(before.scale-after.scale)<.01);
  assert.ok(Math.abs(before.opacity-after.opacity)<.01);
  assert.ok(Math.abs(before.opacity*before.mailMix-after.opacity*after.mailMix)<.01);
 }
 assert.ok(Math.abs(newsletterMailScale(0)-newsletterMailScale(8))<1e-10);
});

test('Markers keep bounded, gentle scale and opacity without synchronizing every city',()=>{
 const starts=new Set();
 for(let index=0;index<26;index++){
  starts.add(newsletterMarkerMotion(0,index).opacity.toFixed(3));
  for(let frame=0;frame<240;frame++){
   const motion=newsletterMarkerMotion(frame/30,index);
   assert.ok(motion.opacity>=0&&motion.opacity<=1);
   assert.ok(motion.scale>=0&&motion.scale<=1.12);
   assert.ok(motion.mailMix>=0&&motion.mailMix<=1);
   assert.ok(newsletterMailScale(frame/30)>=.955&&newsletterMailScale(frame/30)<=1.045);
  }
 }
 assert.ok(starts.size>8);
 assert.equal(newsletterMarkerMotion(1,0).mailMix,0);
 assert.equal(newsletterMarkerMotion(4,0).mailMix,1);
});
