import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../studio/src/studio/canvasLine.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {tightCanvasLine,resizeCanvasLine}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} ≠ ${b}`);
const endpoints=f=>{const a=(f.rotation??0)*Math.PI/180,cx=f.x+f.widthPx/2,cy=f.y+f.height/2;return [-1,1].map(s=>({x:cx+s*Math.cos(a)*f.widthPx/2,y:cy+s*Math.sin(a)*f.widthPx/2}));};
test('Tight line frames preserve the visible stroke at every angle, including an oversized old frame',()=>{
 for(const rotation of [0,90,-35,180])for(const height of [24,120]){
  const line={id:'line',kind:'shape',shape:'line',editor:{position:'absolute',x:584.405,y:327.595,widthPx:65.19,height,rotation,appearance:{fill:'#fff',lineWidth:2,opacity:65}}};
  const result=tightCanvasLine(line);
  assert.equal(result.editor.height,2);
  const before=endpoints(line.editor),after=endpoints(result.editor);
  before.forEach((p,i)=>{close(p.x,after[i].x);close(p.y,after[i].y);});
  assert.equal(result.editor.appearance,line.editor.appearance);
  assert.equal(tightCanvasLine(result),result);
 }
});
test('Line endpoint resizing preserves its opposite endpoint and thickness at all angles',()=>{
 for(const rotation of [0,90,-45,135])for(const end of ['start','end']){
  const frame={position:'absolute',x:100,y:200,widthPx:65.19,height:2,rotation,appearance:{lineWidth:2}};
  const sign=end==='end'?1:-1,a=rotation*Math.PI/180;
  const next=resizeCanvasLine(frame,frame.widthPx,{x:sign*Math.cos(a)*40,y:sign*Math.sin(a)*40},end);
  const before=endpoints(frame),after=endpoints(next),fixed=end==='end'?0:1;
  close(next.widthPx,105.19);assert.equal(next.height,2);assert.equal(next.rotation,rotation);
  close(before[fixed].x,after[fixed].x);close(before[fixed].y,after[fixed].y);
 }
});
test('Perpendicular motion cannot inflate the line frame or move its endpoints',()=>{
 const frame={position:'absolute',x:100,y:200,widthPx:65,height:2,rotation:90};
 const next=resizeCanvasLine(frame,65,{x:300,y:0},'end');
 close(next.widthPx,65);close(next.x,100);close(next.y,200);assert.equal(next.height,2);
});

test('Origin resize keeps the line center fixed and moves both endpoints equally',()=>{
 for(const rotation of [0,90,-37,155])for(const end of ['start','end']){
  const frame={position:'absolute',x:30,y:80,widthPx:120,height:2,rotation},a=rotation*Math.PI/180,sign=end==='end'?1:-1;
  const result=resizeCanvasLine(frame,120,{x:20*Math.cos(a)*sign,y:20*Math.sin(a)*sign},end,true);
  close(result.widthPx,160);close(result.x+result.widthPx/2,90);close(result.y,80);
  assert.equal(result.height,2);
 }
});

test('Origin line resize stops at coordinate limits without drifting its pivot',()=>{
 for(const x of [-4000,4000])for(const dx of [-200,200]){
  const frame={x,y:0,widthPx:100,height:2};
  const result=resizeCanvasLine(frame,100,{x:dx,y:0},'end',true);
  assert.ok(result.x>=-4000&&result.x<=4000);close(result.x+result.widthPx/2,x+50);
 }
});
