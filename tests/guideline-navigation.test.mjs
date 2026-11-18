import test from 'node:test';
import assert from 'node:assert/strict';
import {mountGuidelineNavigation} from '../src/guidelineNavigation.js';

function fixture(t){
 const listeners=new Map(),frames=new Map(),calls=[],selected=[];
 let nextFrame=0,resize;
 const section=(id,y)=>({id,y,paddingTop:'32px',getBoundingClientRect(){return {top:this.y-globalThis.scrollY};}});
 const sections=[section('overview',100),section('identity',700),section('construction',1300)];
 const links=sections.map(({id})=>({dataset:{section:id},setAttribute(){},removeAttribute(){},getBoundingClientRect(){return {left:0,right:100};}}));
 const header={getBoundingClientRect:()=>({bottom:72})};
 const sidebar={position:'fixed',scrollWidth:160,clientWidth:160,getBoundingClientRect:()=>({height:56})};
 const root={querySelectorAll:selector=>selector==='.guide-section'?sections:links,querySelector:()=>sidebar};
 const values={
  scrollY:0,innerHeight:700,
  document:{querySelector:()=>header,documentElement:{scrollHeight:2000,clientWidth:1200},fonts:{ready:Promise.resolve()}},
  getComputedStyle:element=>element,
  matchMedia:()=>({matches:false}),
  requestAnimationFrame:callback=>{frames.set(++nextFrame,callback);return nextFrame;},
  cancelAnimationFrame:id=>frames.delete(id),
  ResizeObserver:class {constructor(callback){resize=callback;}observe(){}disconnect(){}},
  window:{addEventListener:(name,handler)=>listeners.set(name,handler),removeEventListener:name=>listeners.delete(name),scrollTo:options=>{calls.push(options);globalThis.scrollY=options.top;}},
 };
 const previous=Object.fromEntries(Object.keys(values).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 Object.assign(globalThis,values);
 const navigation=mountGuidelineNavigation(root,id=>selected.push(id));
 t.after(()=>{navigation.destroy();for(const key of Object.keys(values)){if(previous[key])Object.defineProperty(globalThis,key,previous[key]);else delete globalThis[key];}});
 const flush=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback());};
 return {navigation,sections,sidebar,calls,selected,flush,resize:()=>{resize();flush();},event:(name,event={})=>{listeners.get(name)?.(event);flush();}};
}

test('direct links stay aligned after earlier media or fonts resize, without restarting an unchanged scroll',t=>{
 const f=fixture(t);f.navigation.go('identity','instant');f.flush();
 assert.equal(scrollY,636);assert.equal(f.selected.at(-1),'identity');assert.equal(f.calls.length,1);
 f.sections[1].y+=260;f.resize();assert.equal(scrollY,896);
 f.resize();assert.equal(f.calls.length,2);
 f.sidebar.position='sticky';f.resize();assert.equal(scrollY,840);
});

test('manual scrolling releases the anchor and updates selection without pulling the reader back',t=>{
 const f=fixture(t);f.navigation.go('identity');f.event('wheel');
 globalThis.scrollY=1250;f.event('scroll');assert.equal(f.selected.at(-1),'construction');
 f.sections[1].y+=200;f.resize();assert.equal(scrollY,1250);assert.equal(f.calls.length,1);
 globalThis.scrollY=0;f.event('scroll');assert.equal(f.selected.at(-1),'overview');
});

test('rapid navigation keeps the latest destination and selects the final section at the page end',t=>{
 const f=fixture(t);f.navigation.go('identity');f.navigation.go('construction');f.flush();
 assert.equal(scrollY,1236);assert.equal(f.selected.at(-1),'construction');
 f.sections[2].y=1800;f.resize();assert.equal(scrollY,1300);
 f.event('wheel');f.event('scroll');assert.equal(f.selected.at(-1),'construction');
 f.navigation.go('missing');assert.equal(f.calls.length,3);
});
