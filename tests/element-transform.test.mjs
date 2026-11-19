import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../studio/src/studio/elementTransform.ts',import.meta.url),'utf8');
const {elementTransform}=await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`);
test('Old flat frames keep exactly their existing transform and absolute positioning',()=>{
 assert.equal(elementTransform({y:80,rotation:35}),'translateY(80px) rotate(35deg)');
 assert.equal(elementTransform({position:'absolute',y:80,rotation:-35}),'translateY(0px) rotate(-35deg)');
});
test('3D frames combine perspective and all rotations without modifying saved geometry',()=>{
 const frame={position:'absolute',x:100,y:200,rotation:25,rotationX:30,rotationY:-45,depth:80,perspective:1200};
 assert.equal(elementTransform(frame),'translateY(0px) perspective(1200px) translateZ(80px) rotate(25deg) rotateX(30deg) rotateY(-45deg)');
 assert.equal(frame.x,100);assert.equal(frame.y,200);
 assert.match(elementTransform({...frame,perspective:100,depth:2000}),/translateZ\(90px\)/);
});
