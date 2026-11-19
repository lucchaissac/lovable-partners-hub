import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:false,server:{middlewareMode:true,hmr:false},logLevel:'silent'});
const {toggleCanvasTextMark,textShortcut}=await server.ssrLoadModule('/studio/src/studio/textShortcuts.ts');
const {htmlEditorSchema}=await server.ssrLoadModule('/studio/src/studio/htmlEditorModel.ts');
await server.close();
const text=(id,weight=700)=>({id,kind:'text',value:{runs:[{text:'Keep this headline',bold:true}],style:'Text',size:120,align:'left',color:'#ffffff'},editor:{x:40,y:80,widthPx:900,height:300,appearance:{fontWeight:weight,fontSize:120,shader:{preset:'chrome',intensity:100,speed:50,animated:true}}}});
const state=(blocks)=>({version:1,pages:[{id:'p',name:'Canvas',sections:[{id:'s',name:'Scene',columns:[blocks],padding:0,gap:0,background:'transparent'}]}]});
const blocks=s=>s.pages[0].sections[0].columns[0];
test('Block shortcuts toggle bold and retain geometry, editable copy, effects and neighbours',()=>{
 const source=state([text('a'),text('b')]),next=toggleCanvasTextMark(source,['a'],'bold');
 assert.equal(blocks(next)[0].editor.appearance.fontWeight,600);assert.equal(blocks(next)[0].value.runs[0].bold,undefined);
 const restored=toggleCanvasTextMark(next,['a'],'bold');assert.equal(blocks(restored)[0].editor.appearance.fontWeight,700);
 for(const field of ['x','y','widthPx','height'])assert.equal(blocks(next)[0].editor[field],blocks(source)[0].editor[field]);
 assert.deepEqual(blocks(next)[0].editor.appearance.shader,blocks(source)[0].editor.appearance.shader);
 assert.deepEqual(blocks(next)[1],blocks(source)[1]);assert.equal(blocks(source)[0].editor.appearance.fontWeight,700);
});
test('Mixed selections apply one mark; locked text and other layer kinds stay unchanged',()=>{
 const locked={...text('locked'),editor:{...text('locked').editor,locked:true}},shape={id:'shape',kind:'shape',shape:'rectangle'};
 const source=state([text('a'),text('b',600),locked,shape]),next=toggleCanvasTextMark(source,['a','b','locked','shape'],'italic');
 assert.ok(blocks(next).slice(0,2).every(b=>b.value.runs[0].italic));assert.deepEqual(blocks(next).slice(2),blocks(source).slice(2));
 assert.equal(toggleCanvasTextMark(source,['shape'],'bold'),source);
});
test('Inline mark overrides survive strict saved-document validation',()=>{
 const value=text('a');value.value.inlineFormatting=true;value.value.runs=[{text:'Bold',bold:true},{text:' plain',bold:false,italic:true,underline:true}];
 assert.deepEqual(blocks(htmlEditorSchema.parse(state([value])))[0].value,value.value);
 assert.equal(textShortcut('B'),'bold');assert.equal(textShortcut('i'),'italic');assert.equal(textShortcut('u'),'underline');assert.equal(textShortcut('x'),undefined);
});
