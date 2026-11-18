import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../studio/src/assets-tool/assetSelection.ts',import.meta.url),'utf8');
const {selectAsset,singleAssetSelection}=await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`);
const order=['a','b','c','d','e'];
test('Additive selection toggles individual assets and keeps collection order',()=>{
 let selected=singleAssetSelection('c');
 selected=selectAsset(order,selected,'a',{additive:true});
 assert.deepEqual(selected.ids,['a','c']);assert.equal(selected.focus,'a');
 selected=selectAsset(order,selected,'c',{additive:true});assert.deepEqual(selected.ids,['a']);
 selected=selectAsset(order,selected,'a',{additive:true});assert.deepEqual(selected.ids,[]);
});
test('Range selection includes intermediates and contracts from a stable anchor in both directions',()=>{
 let selected=singleAssetSelection('b');
 selected=selectAsset(order,selected,'e',{range:true});assert.deepEqual(selected.ids,['b','c','d','e']);
 selected=selectAsset(order,selected,'c',{range:true});assert.deepEqual(selected.ids,['b','c']);
 selected=selectAsset(order,selected,'a',{range:true});assert.deepEqual(selected.ids,['a','b']);assert.equal(selected.anchor,'b');
});
test('Additive ranges preserve earlier picks; plain selection resets without stale anchors',()=>{
 let selected=selectAsset(order,singleAssetSelection('a'),'c',{additive:true});
 selected=selectAsset(order,selected,'e',{range:true,additive:true});assert.deepEqual(selected.ids,['a','c','d','e']);
 selected=selectAsset(order,selected,'d');assert.deepEqual(selected,singleAssetSelection('d'));
 assert.equal(selectAsset(order,selected,'missing'),selected);
 assert.deepEqual(selectAsset(['a','b'],selected,'b',{range:true}),singleAssetSelection('b'));
});
