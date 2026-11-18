import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const compiled=ts.transpileModule(await readFile(new URL('../studio/src/studio/fileDragLifecycle.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {listenForFileDragEnd}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
function browser(){
 const listeners=[];
 return {innerWidth:1000,innerHeight:800,addEventListener:(name,fn,capture)=>listeners.push({name,fn,capture}),removeEventListener:(name,fn,capture)=>{const i=listeners.findIndex(l=>l.name===name&&l.fn===fn&&l.capture===capture);if(i>=0)listeners.splice(i,1);},
 dispatch(name,event={},consume=false){for(const l of listeners.filter(l=>l.name===name&&l.capture))l.fn(event);if(!consume)for(const l of listeners.filter(l=>l.name===name&&!l.capture))l.fn(event);},listeners};
}
test('a drop consumed by the nested chat still clears the outer upload overlay',()=>{
 const target=browser();let dragging=true;
 const cleanup=listenForFileDragEnd(()=>{dragging=false;},target);
 target.dispatch('drop',{},true);assert.equal(dragging,false);
 cleanup();assert.equal(target.listeners.length,0);
});
test('cancel, window exit and release clear the indicator without clearing it between child elements',()=>{
 const target=browser();let resets=0;listenForFileDragEnd(()=>resets++,target);
 target.dispatch('dragleave',{relatedTarget:{},clientX:0,clientY:0});
 target.dispatch('dragleave',{relatedTarget:null,clientX:400,clientY:300});
 target.dispatch('keydown',{key:'Enter'});assert.equal(resets,0);
 target.dispatch('dragleave',{relatedTarget:null,clientX:0,clientY:300});
 for(const name of ['dragend','blur','pointerup'])target.dispatch(name);
 target.dispatch('keydown',{key:'Escape'});assert.equal(resets,5);
});
