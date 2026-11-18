import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../studio/src/studio/selectionRotation.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {rotateSelectionFrames}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} ≠ ${b}`);
test('A quarter turn moves the selected centers around their common pivot, preserving dimensions and initial angles',()=>{
 const items=[{id:'left',frame:{x:10,y:30,widthPx:80,height:40,rotation:0},box:{left:100,top:200,width:80,height:40}},{id:'right',frame:{x:170,y:30,widthPx:40,height:80,rotation:90},box:{left:260,top:200,width:80,height:40}}];
 const frames=rotateSelectionFrames(items,{left:100,top:200,width:240,height:40},90);
 close(frames.left.x,90);close(frames.left.y,-50);close(frames.right.x,90);close(frames.right.y,110);
 assert.equal(frames.left.rotation,90);assert.equal(frames.right.rotation,-180);
 assert.equal(frames.right.widthPx,40);assert.equal(frames.right.height,80);
 assert.equal(items[0].frame.x,10);
});
test('Arbitrary group rotation keeps every pairwise center distance and the shared pivot',()=>{
 const items=[{id:'a',frame:{x:-40,y:30,rotation:17},box:{left:50,top:100,width:80,height:40}},{id:'b',frame:{x:170,y:190,rotation:-50},box:{left:260,top:260,width:100,height:60}}];
 const bounds={left:50,top:100,width:310,height:220},cx=205,cy=210;
 for(const angle of [-270,-45,0,37,180,360]){
  const result=rotateSelectionFrames(items,bounds,angle);
  const old=items.map(i=>({x:i.box.left+i.box.width/2,y:i.box.top+i.box.height/2}));
  const next=items.map((i,n)=>({x:old[n].x+result[i.id].x-i.frame.x,y:old[n].y+result[i.id].y-i.frame.y}));
  close(Math.hypot(next[0].x-next[1].x,next[0].y-next[1].y),Math.hypot(old[0].x-old[1].x,old[0].y-old[1].y));
  next.forEach((p,n)=>close(Math.hypot(p.x-cx,p.y-cy),Math.hypot(old[n].x-cx,old[n].y-cy)));
 }
});
test('Single selection keeps its own center',()=>{
 const frame={x:26,y:42,widthPx:100,height:50,rotation:25},box={left:300,top:200,width:112,height:90};
 const result=rotateSelectionFrames([{id:'a',frame,box}],box,15).a;
 assert.deepEqual(result,{...frame,rotation:40});
});
