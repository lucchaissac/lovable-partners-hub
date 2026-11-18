import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../studio/src/studio/selectionScale.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {scaleSelection,selectionResizeFactor,modifiedScaleOrigin,patchScaledSelection}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} ≠ ${b}`);
const item=(id,x,y,width,height,rotation=0)=>({id,width,height,parentWidth:1200,frame:{position:'absolute',x,y,widthPx:width,height,rotation,groupId:'group'},box:{left:x+100,top:y+200,width,height}});
test('A group scales its type, stroke, padding and corners with its layout while preserving native content',()=>{
 const items=[item('text',10,20,200,100),item('line',310,80,100,2),item('image',450,20,100,100)];
 items[0].frame.appearance={padding:10,letterSpacing:2,lineHeight:120};
 items[1].frame.appearance={lineWidth:2};items[2].frame.appearance={radius:8,borderWidth:2,opacity:55};
 const blocks=[{id:'text',kind:'text',value:{size:40,runs:[{text:'Native text'}]}},{id:'line',kind:'shape',shape:'line'},{id:'image',kind:'image',value:{src:'/image.png'}}];
 const bounds={left:110,top:220,width:540,height:100};
 const {frames,factor}=scaleSelection(items,blocks,bounds,2,[0,0]);
 assert.equal(factor,2);close(frames.text.x,10);close(frames.text.y,20);
 close(frames.line.x,610);close(frames.image.x,890);
 assert.equal(frames.text.appearance.fontSize,80);assert.equal(frames.text.appearance.padding,20);
 assert.equal(frames.text.appearance.letterSpacing,4);assert.equal(frames.text.appearance.lineHeight,120);
 assert.equal(frames.line.height,4);assert.equal(frames.line.appearance.lineWidth,4);
 assert.equal(frames.image.appearance.radius,16);assert.equal(frames.image.appearance.opacity,55);
 const state={pages:[{sections:[{columns:[blocks]}]}]},result=patchScaledSelection(state,frames).pages[0].sections[0].columns[0];
 assert.equal(result[0].value.size,80);assert.equal(result[0].value.runs,blocks[0].value.runs);
 assert.equal(result[2].value.src,'/image.png');assert.equal(blocks[0].value.size,40);
});
test('Rotated members preserve their angles and orbit the same pivot at every origin',()=>{
 const items=[item('a',10,20,200,100,90),item('b',310,80,100,40,-30)];
 // Measured bounds are rotated, but the physical frame sizes stay unrotated.
 items[0].box={left:160,top:170,width:100,height:200};
 items[1].box={left:406.7,top:257.68,width:106.6,height:84.64};
 const bounds={left:160,top:170,width:353.3,height:200};
 for(const origin of [[0,0],[.5,.5],[1,1]])for(const factor of [.5,1.8]){
  const {frames}=scaleSelection(items,[],bounds,factor,origin);
  for(const i of items){
   const f=frames[i.id],cx=i.box.left+i.box.width/2,cy=i.box.top+i.box.height/2;
   const px=bounds.left+bounds.width*origin[0],py=bounds.top+bounds.height*origin[1];
   close(cx+f.x-i.frame.x+(f.widthPx-i.width)/2,px+(cx-px)*factor);
   close(cy+f.y-i.frame.y+(f.height-i.height)/2,py+(cy-py)*factor);
   close(f.widthPx/i.width,f.height/i.height);assert.equal(f.rotation,i.frame.rotation);
  }
 }
});
test('Limits clamp the entire group rather than distorting an individual child',()=>{
 const items=[item('a',0,0,100,50),item('b',200,0,100,2)];items[1].frame.appearance={lineWidth:2};
 const bounds={left:100,top:200,width:300,height:50};
 const small=scaleSelection(items,[],bounds,.01);assert.equal(small.factor,.5);
 for(const i of items)close(small.frames[i.id].widthPx/i.width,.5);
 const big=scaleSelection(items,[],bounds,100);assert.equal(big.factor,12);
 for(const i of items)close(big.frames[i.id].widthPx/i.width,12);
});
test('All resize handles use the fixed origin, including centered edge and corner gestures',()=>{
 const bounds={left:0,top:0,width:200,height:100};
 for(const [handle,delta] of [['e',{x:50,y:0}],['w',{x:-50,y:0}],['s',{x:0,y:25}],['n',{x:0,y:-25}],['se',{x:50,y:25}],['nw',{x:-50,y:-25}]])close(selectionResizeFactor(bounds,delta,handle,[.5,.5]),1.5);
 close(selectionResizeFactor(bounds,{x:50,y:25},'se',[0,0]),1.25);
 const single=item('a',100,200,200,100,35),frames=scaleSelection([single],[],single.box,1.5,[.5,.5],false).frames;
 close(frames.a.x+frames.a.widthPx/2,200);close(frames.a.y+frames.a.height/2,250);
});
test('Option + Shift resizes around the center even when the saved origin is a corner',()=>{
 const keys={shiftKey:true,altKey:true,ctrlKey:false,metaKey:false},saved=[0,0];
 const origin=modifiedScaleOrigin(keys,saved);
 assert.deepEqual(origin,[.5,.5]);assert.deepEqual(saved,[0,0]);
 const a=item('a',100,200,200,100),b=item('b',400,200,100,100),bounds={left:200,top:400,width:400,height:100};
 for(const items of [[a],[a,b]]){
  const box=items.length===1?a.box:bounds,factor=selectionResizeFactor(box,{x:50,y:0},'e',origin);
  const {frames}=scaleSelection(items,[],box,factor,origin);
  const left=Math.min(...items.map(i=>frames[i.id].x)),right=Math.max(...items.map(i=>frames[i.id].x+frames[i.id].widthPx));
  close((left+right)/2,items.length===1?200:300);
 }
 assert.equal(modifiedScaleOrigin({...keys,shiftKey:false},saved),undefined);
 assert.equal(modifiedScaleOrigin({...keys,altKey:false},saved),undefined);
 assert.deepEqual(modifiedScaleOrigin({...keys,altKey:false,metaKey:true},saved),saved);
 assert.deepEqual(modifiedScaleOrigin({...keys,altKey:false,ctrlKey:true},saved),saved);
});
