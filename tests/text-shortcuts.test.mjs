import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:false,server:{middlewareMode:true,hmr:false},logLevel:'silent'});
const {toggleCanvasTextMark,textShortcut}=await server.ssrLoadModule('/studio/src/studio/textShortcuts.ts');
const {htmlEditorSchema}=await server.ssrLoadModule('/studio/src/studio/htmlEditorModel.ts');
const {assetSchema,referenceDocument}=await server.ssrLoadModule('/studio/src/assets-tool/model.ts');
await server.close();
const text=(id,weight=700)=>({id,kind:'text',value:{runs:[{text:'Keep this headline',bold:true}],style:'Text',size:120,align:'left',color:'#ffffff'},editor:{x:40,y:80,widthPx:900,height:300,appearance:{fontWeight:weight,fontSize:120,blur:4,opacity:80}}});
const state=(blocks)=>({version:1,pages:[{id:'p',name:'Canvas',sections:[{id:'s',name:'Scene',columns:[blocks],padding:0,gap:0,background:'transparent'}]}]});
const blocks=s=>s.pages[0].sections[0].columns[0];
test('Block shortcuts toggle bold and retain geometry, editable copy, appearance and neighbours',()=>{
 const source=state([text('a'),text('b')]),next=toggleCanvasTextMark(source,['a'],'bold');
 assert.equal(blocks(next)[0].editor.appearance.fontWeight,600);assert.equal(blocks(next)[0].value.runs[0].bold,undefined);
 const restored=toggleCanvasTextMark(next,['a'],'bold');assert.equal(blocks(restored)[0].editor.appearance.fontWeight,700);
 for(const field of ['x','y','widthPx','height'])assert.equal(blocks(next)[0].editor[field],blocks(source)[0].editor[field]);
 assert.equal(blocks(next)[0].editor.appearance.blur,4);assert.equal(blocks(next)[0].editor.appearance.opacity,80);
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

test('Retired prototype effects are stripped while native drafts and inline text remain valid',()=>{
 const native=text('a');native.value.inlineFormatting=true;
 const editor=state([native]),legacy=structuredClone(editor);
 blocks(legacy)[0].editor.appearance.shader={preset:'chrome',intensity:100,speed:50,animated:true};
 const reference={name:'Local demo',src:'data:image/png;base64,AAAA',width:1,height:1};
 const document=referenceDocument(reference,'landscape');document.editor=legacy;document.shader={preset:'ripple'};
 const restored=assetSchema.parse(document);
 assert.equal('shader' in restored,false);assert.deepEqual(restored.editor,htmlEditorSchema.parse(editor));
 assert.equal('shader' in blocks(restored.editor)[0].editor.appearance,false);
 assert.equal(blocks(legacy)[0].editor.appearance.shader.preset,'chrome');
 const invalid=structuredClone(legacy);blocks(invalid)[0].editor.appearance.unexpected='value';
 assert.equal(htmlEditorSchema.safeParse(invalid).success,false);
});
