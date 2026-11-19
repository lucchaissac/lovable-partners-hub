import test from 'node:test';
import assert from 'node:assert/strict';
import {textAnimationTimeline,textAnimationOpacity} from '../shared/textAnimation.mjs';

test('character animation preserves Unicode graphemes, whitespace and line breaks',()=>{
 const text='Ée\u0301 👩🏽‍💻\nHi!';
 const units=textAnimationTimeline(text,'characters');
 assert.deepEqual(units.map(unit=>text.slice(unit.start,unit.end)),['É','e\u0301',' ','👩🏽‍💻','\n','H','i','!']);
 assert.equal(units.map(unit=>text.slice(unit.start,unit.end)).join(''),text);
});
test('word reveals preserve exact copy and punctuation without reflowing it',()=>{
 const text='  Hello,\nLovable world!';
 const units=textAnimationTimeline(text,'words');
 assert.deepEqual(units.map(unit=>text.slice(unit.start,unit.end)),['  ','Hello,','\n','Lovable',' ','world!']);
 assert.ok(units.every(unit=>textAnimationOpacity(unit,0)===0));
 assert.ok(units.every(unit=>textAnimationOpacity(unit,1)===1));
 assert.ok(units.every(unit=>textAnimationOpacity(unit,2)===1));
 assert.ok(units.every(unit=>textAnimationOpacity(unit,-1)===0));
});
test('natural typing has repeatable, uneven keystrokes and a punctuation pause',()=>{
 const text='Hello, world.',units=textAnimationTimeline(text,'typing');
 assert.deepEqual(units,textAnimationTimeline(text,'typing'));
 assert.ok(units.every(unit=>unit.fade===0));
 assert.ok(units[5].at-units[4].at>units[4].at-units[3].at);
 const partial=units.map(unit=>textAnimationOpacity(unit,.4));
 assert.ok(partial.includes(0)&&partial.includes(1));
 assert.deepEqual(partial,[...partial].sort((a,b)=>b-a));
 assert.deepEqual(textAnimationTimeline(text,'none'),[]);
 assert.deepEqual(textAnimationTimeline('','typing'),[]);
});
