import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
async function moduleAt(name){const source=await readFile(new URL(`../studio/src/studio/${name}.ts`,import.meta.url),'utf8');return import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`);}
const {copiedCanvasBlocks,pasteCanvasBlocks}=await moduleAt('canvasClipboard');
const {mixedAppearance,patchSelectionAppearance}=await moduleAt('selectionAppearance');
const text=(id,size=80)=>({id,kind:'text',value:{runs:[{text:`Copy ${id}`,bold:true}],size,style:'Text',align:'left',color:'#ffffff'},editor:{position:'absolute',x:40,y:150,widthPx:400,height:100,groupId:'group',appearance:{fontSize:size,fontWeight:700,lineHeight:110}}});
const document=(...blocks)=>({version:1,pages:[{id:'page',sections:[{id:'board',columns:[blocks]}]}]});

test('Copy/paste across canvases retains media, crop, typography and group geometry with fresh identities',()=>{
 const image={id:'photo',kind:'image',value:{src:'/__asset-asset-reference__',crop:{x:10,y:20,width:100,height:100}},editor:{x:480,y:160,widthPx:400,height:400,groupId:'group'}};
 const source=[text('headline'),image],copied=copiedCanvasBlocks(source,{'/__asset-asset-reference__':'data:image/png;base64,original'});
 assert.equal(copied[1].value.src,'data:image/png;base64,original');
 let id=0;const target=document(text('unrelated')),result=pasteCanvasBlocks(target,'page',copied,1080,1080,()=>`new-${++id}`);
 const blocks=result.state.pages[0].sections[0].columns[0];
 assert.equal(blocks.length,3);assert.equal(target.pages[0].sections[0].columns[0].length,1);
 assert.deepEqual(blocks[1].value,source[0].value);assert.deepEqual(blocks[2].value.crop,image.value.crop);
 assert.equal(blocks[1].editor.x,40);assert.equal(blocks[2].editor.x,480);
 assert.equal(blocks[1].editor.groupId,blocks[2].editor.groupId);assert.notEqual(blocks[1].editor.groupId,'group');
 assert.notEqual(blocks[1].id,source[0].id);assert.equal(source[1].value.src,'/__asset-asset-reference__');
});
test('Pasting on the same canvas offsets the copy; smaller canvases keep the group visible',()=>{
 const original=text('original');let id=0;
 const same=pasteCanvasBlocks(document(original),'page',[original],1080,1080,()=>`id-${++id}`);
 assert.equal(same.state.pages[0].sections[0].columns[0][1].editor.x,64);
 const smaller=pasteCanvasBlocks(document(),'page',[original],300,300,()=>`id-${++id}`);
 assert.equal(smaller.state.pages[0].sections[0].columns[0][0].editor.x,0);
 assert.equal(pasteCanvasBlocks(document(...Array.from({length:80},(_,i)=>text(String(i)))),'page',[original],1080,1080),null);
});
test('A common style changes only that property across mixed text values, preserving content and geometry',()=>{
 const a=text('headline',160),b=text('date',32),locked={...text('locked'),editor:{...text('locked').editor,locked:true}};
 b.value.runs=[{text:'18 November',italic:true}];b.editor.x=650;
 assert.equal(mixedAppearance([a,b]).fontSize,true);assert.equal(mixedAppearance([a,b]).fontWeight,false);
 const state=document(a,b,locked),next=patchSelectionAppearance(state,['headline','date','locked'],{uppercase:true,fill:'#ff0178'});
 const blocks=next.pages[0].sections[0].columns[0];
 assert.equal(blocks[0].editor.appearance.uppercase,true);assert.equal(blocks[1].editor.appearance.uppercase,true);
 assert.equal(blocks[0].value.color,'#ff0178');assert.equal(blocks[1].value.color,'#ff0178');
 assert.deepEqual(blocks[0].value.runs,a.value.runs);assert.deepEqual(blocks[1].value.runs,b.value.runs);
 assert.equal(blocks[0].value.size,160);assert.equal(blocks[1].value.size,32);assert.equal(blocks[1].editor.x,650);
 assert.deepEqual(blocks[2],locked);assert.equal(a.editor.appearance.uppercase,undefined);
 const uniform=patchSelectionAppearance(next,['headline','date'],{fontSize:64});
 assert.equal(mixedAppearance(uniform.pages[0].sections[0].columns[0].slice(0,2)).fontSize,false);
});

const {translateCanvasSelection}=await moduleAt('selectionPosition');
const {selectionDesignKind}=await moduleAt('selectionAppearance');
test('Mixed images and a divider expose common properties and keep distinct content and geometry',()=>{
 const logo={id:'logo',kind:'image',value:{src:'/logo.svg',crop:{x:2,y:3,width:200,height:100}},editor:{position:'absolute',x:40,y:100,widthPx:300,height:150,opacity:.5,appearance:{radius:18}}};
 const divider={id:'divider',kind:'shape',shape:'rectangle',editor:{position:'absolute',x:360,y:100,widthPx:2,height:150,opacity:.8,appearance:{fill:'#ffffff'}}};
 const second={...structuredClone(logo),id:'second',editor:{...logo.editor,x:400,opacity:undefined,appearance:{opacity:100}}};
 assert.equal(selectionDesignKind([logo,divider,second]),'selection');
 assert.equal(selectionDesignKind([logo,second]),'image');
 assert.equal(mixedAppearance([logo,second]).opacity,true);
 const original=document(logo,divider,second),next=patchSelectionAppearance(original,['logo','divider','second'],{opacity:55});
 for(const block of next.pages[0].sections[0].columns[0]){assert.equal(block.editor.appearance.opacity,55);assert.equal(block.editor.opacity,undefined);}
 assert.deepEqual(next.pages[0].sections[0].columns[0][0].value,logo.value);
 assert.equal(next.pages[0].sections[0].columns[0][0].editor.appearance.radius,18);
 assert.equal(next.pages[0].sections[0].columns[0][1].editor.widthPx,2);
 const moved=translateCanvasSelection(next,['logo','divider','second'],{x:50,y:-20});
 assert.deepEqual(moved.pages[0].sections[0].columns[0].map(b=>[b.editor.x,b.editor.y]),[[90,80],[410,80],[450,80]]);
 assert.deepEqual(next.pages[0].sections[0].columns[0].map(b=>b.editor.x),[40,360,400]);
 assert.deepEqual(moved.pages[0].sections[0].columns[0].map(b=>[b.editor.widthPx,b.editor.height]),[[300,150],[2,150],[300,150]]);
 assert.equal(original.pages[0].sections[0].columns[0][0].editor.opacity,.5);
});
test('Group coordinate limits and locks never alter relative spacing or unrelated layers',()=>{
 const a=text('a'),b=text('b');a.editor.x=3900;b.editor.x=3950;
 const initial=document(a,b,text('other')),bounded=translateCanvasSelection(initial,['a','b'],{x:200});
 assert.deepEqual(bounded.pages[0].sections[0].columns[0].map(b=>b.editor.x),[3950,4000,40]);
 const locked=document(a,{...b,editor:{...b.editor,locked:true}});
 assert.equal(translateCanvasSelection(locked,['a','b'],{x:50}),locked);
 const sectionLocked=document(a,b);sectionLocked.pages[0].sections[0].locked=true;
 assert.equal(translateCanvasSelection(sectionLocked,['a','b'],{x:50}),sectionLocked);
 assert.equal(translateCanvasSelection(initial,['a','b'],{x:NaN}),initial);
});
