import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../studio/src/studio/selectionToolbarPosition.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {rotationHandlePosition}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('Oversized and off-canvas objects keep the complete rotation target inside the viewport at every zoom',()=>{
 const viewport={left:80,top:100,width:640,height:500};
 const objects=[{left:300,top:20,width:1400,height:1600},{left:-1800,top:-1500,width:1300,height:1000},{left:250,top:220,width:80,height:60}];
 for(const zoom of [.1,.4,1,3])for(const object of objects){
  const logical=rect=>Object.fromEntries(Object.entries(rect).map(([key,value])=>[key,value/zoom]));
  const position=rotationHandlePosition(logical(object),logical(viewport),32/zoom,12/zoom);
  assert.ok(position.left*zoom>=viewport.left+12-.001);
  assert.ok((position.left+32/zoom)*zoom<=viewport.left+viewport.width-12+.001);
  assert.ok(position.top*zoom>=viewport.top+12-.001);
  assert.ok((position.top+32/zoom)*zoom<=viewport.top+viewport.height-12+.001);
 }
});
test('A pinned rotation handle clears the selection toolbar',()=>{
 const visible={left:0,top:0,width:500,height:400},toolbar={left:100,top:12,width:250,height:40};
 const position=rotationHandlePosition({left:0,top:-600,width:450,height:500},visible,32,12,toolbar);
 assert.ok(position.top>=toolbar.top+toolbar.height+12);
});
test('Clamping does not put the rotation control on the object pivot',()=>{
 const position=rotationHandlePosition({left:100,top:200,width:400,height:600},{left:0,top:0,width:640,height:544},32,12);
 assert.ok(Math.hypot(position.left+16-300,position.top+16-500)>=56);
});
test('Short lines keep the rotation handle nearby instead of sending it to a viewport edge',()=>{
 const visible={left:0,top:0,width:1000,height:700};
 for(const bounds of [{left:600,top:300,width:65,height:2},{left:600,top:300,width:2,height:65},{left:600,top:300,width:23,height:1}]){
  const result=rotationHandlePosition(bounds,visible,32,12);
  const distance=Math.hypot(result.left+16-(bounds.left+bounds.width/2),result.top+16-(bounds.top+bounds.height/2));
  assert.ok(distance>=56-.001&&distance<80);
  assert.ok(Math.abs(result.left+16-(bounds.left+bounds.width/2))<1);
 }
});
