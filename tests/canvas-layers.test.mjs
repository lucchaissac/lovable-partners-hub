import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
async function moduleAt(name){const source=await readFile(new URL(`../studio/src/assets-tool/${name}.ts`,import.meta.url),'utf8');return import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`);}
const {canvasLayers,reorderCanvasLayers,canvasLayerAction}=await moduleAt('canvasLayers');
const {nativeBrandDivider,partnershipDivider}=await moduleAt('brandDivider');
const block=(id,groupId)=>({id,kind:'image',value:{src:`/${id}.png`,alt:id},editor:{position:'absolute',x:50,y:100,widthPx:200,height:100,...(groupId?{groupId}:{})}});
const doc=(...blocks)=>({version:1,pages:[{id:'page',sections:[{id:'canvas',columns:[blocks]}]}]});
const ids=state=>state.pages[0].sections[0].columns[0].map(block=>block.id);
test('Layer tree shows frontmost first and retains group children in paint order',()=>{
 const list=[block('back'),block('group-back','g'),block('group-front','g'),block('front')];
 const tree=canvasLayers(list);
 assert.deepEqual(tree.map(row=>row.id),['front','group:g','back']);
 assert.deepEqual(tree[1].blocks.map(block=>block.id),['group-front','group-back']);
 assert.deepEqual(list.map(block=>block.id),['back','group-back','group-front','front']);
});
test('Drag reorder keeps artwork intact and groups together, while children can reorder inside a group',()=>{
 const state=doc(block('back'),block('a','g'),block('b','g'),block('front'));
 const moved=reorderCanvasLayers(state,['back'],['front'],'before');
 assert.deepEqual(ids(moved),['a','b','front','back']);
 assert.deepEqual(ids(state),['back','a','b','front']);
 const grouped=reorderCanvasLayers(state,['a'],['front'],'before');
 assert.deepEqual(ids(grouped),['back','front','a','b']);
 assert.deepEqual(grouped.pages[0].sections[0].columns[0][2],state.pages[0].sections[0].columns[0][1]);
 const child=reorderCanvasLayers(state,['a'],['b'],'before');
 assert.deepEqual(ids(child),['back','b','a','front']);
 assert.equal(child.pages[0].sections[0].columns[0][1].editor.groupId,'g');
 const below=reorderCanvasLayers(state,['front'],['a','b'],'after');
 assert.deepEqual(ids(below),['back','front','a','b']);
});
test('Locked layers, missing targets and cross-column drops cannot lose content',()=>{
 const a=block('a'),b=block('b');a.editor.locked=true;const state=doc(a,b);
 assert.equal(reorderCanvasLayers(state,['a'],['b'],'before'),state);
 assert.equal(reorderCanvasLayers(state,['b'],['missing'],'before'),state);
 const split=doc(a);split.pages[0].sections[0].columns.push([b]);
 assert.equal(reorderCanvasLayers(split,['a'],['b'],'before'),split);
});
test('Partnership divider uses the native line at the original optical position',()=>{
 const line=partnershipDivider(),frame=line.editor;
 assert.equal(line.shape,'line');assert.equal(frame.rotation,90);assert.equal(frame.appearance.lineWidth,2);
 assert.ok(Math.abs(frame.x+frame.widthPx/2-617)<1e-9);
 assert.ok(Math.abs(frame.y+frame.height/2-(307+65.19/2))<1e-9);
 assert.equal(frame.widthPx,65.19);
 const legacy={id:'brand-divider',kind:'shape',shape:'rectangle',editor:{position:'absolute',x:700,y:123,widthPx:4,height:120,rotation:20,opacity:.6,appearance:{fill:'#123456'}}};
 const upgraded=nativeBrandDivider(legacy);
 assert.equal(upgraded.editor.rotation,110);assert.equal(upgraded.editor.appearance.lineWidth,4);
 assert.equal(upgraded.editor.appearance.fill,'#123456');assert.equal(upgraded.editor.opacity,.6);
 assert.equal(legacy.shape,'rectangle');assert.equal(nativeBrandDivider(upgraded),upgraded);
 assert.equal(nativeBrandDivider({...legacy,id:'unrelated'}).shape,'rectangle');
});
test('Group and ungroup preserve artwork, include existing siblings and reject locked or cross-column edits',()=>{
 const state=doc(block('a','old'),block('b','old'),block('c'),block('outside'));
 const grouped=canvasLayerAction(state,['a','c'],'group','new');
 assert.deepEqual(ids(grouped),ids(state));
 const members=grouped.pages[0].sections[0].columns[0];
 assert.deepEqual(members.map(b=>b.editor.groupId),['new','new','new',undefined]);
 for(let i=0;i<3;i++){const original=state.pages[0].sections[0].columns[0][i];assert.deepEqual(members[i],{...original,editor:{...original.editor,groupId:'new'}});}
 const ungrouped=canvasLayerAction(grouped,['b'],'ungroup');
 assert.ok(ungrouped.pages[0].sections[0].columns[0].every(b=>!b.editor.groupId));
 assert.equal(canvasLayerAction(grouped,['a','b'],'group','another'),grouped);
 const locked=canvasLayerAction(state,['b'],'lock');
 assert.equal(canvasLayerAction(locked,['a','c'],'group','new'),locked);
 assert.equal(canvasLayerAction(locked,['a'],'ungroup'),locked);
 const split=doc(block('a'));split.pages[0].sections[0].columns.push([block('b')]);
 assert.equal(canvasLayerAction(split,['a','b'],'group','new'),split);
});
test('Hidden and locked state persist without destroying layers and can be reversed independently',()=>{
 const state=doc(block('a','g'),block('b','g'));
 const locked=canvasLayerAction(state,['a'],'lock');
 const hidden=canvasLayerAction(locked,['a'],'hide');
 assert.deepEqual(ids(hidden),['a','b']);
 assert.equal(hidden.pages[0].sections[0].columns[0][0].editor.hidden,true);
 assert.equal(hidden.pages[0].sections[0].columns[0][1],state.pages[0].sections[0].columns[0][1]);
 const shown=canvasLayerAction(JSON.parse(JSON.stringify(hidden)),['a'],'show');
 assert.equal(shown.pages[0].sections[0].columns[0][0].editor.locked,true);
 const unlocked=canvasLayerAction(shown,['a'],'unlock').pages[0].sections[0].columns[0][0];
 assert.deepEqual({...unlocked.editor,hidden:undefined,locked:undefined},{...state.pages[0].sections[0].columns[0][0].editor,hidden:undefined,locked:undefined});
 assert.equal(state.pages[0].sections[0].columns[0][0].editor.hidden,undefined);
});
