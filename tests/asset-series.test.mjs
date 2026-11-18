import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../studio/src/assets-tool/assetSeries.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {assetPages,insertAssetPages,replaceAssetPage,animateAssetPages,MAX_ASSET_PAGES}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const first={id:'one',title:'First',editor:{text:'Keep my manual change'}},second={id:'two',title:'Second'},third={id:'three',title:'Third'};
test('A replacement keeps its URL and neighbors, discards old layers, and inserts alternatives directly after it',()=>{
 const replacement={id:'new',title:'New direction',editor:{text:'New headline'}};
 const alternative={id:'alternative',title:'Alternative'};
 const next=replaceAssetPage([first,second,third],'two',[replacement,alternative]);
 assert.deepEqual(next.map(page=>page.id),['one','two','alternative','three']);
 assert.deepEqual(next[0].editor,first.editor);
 assert.equal(next[1].title,'New direction');
 assert.deepEqual(next[1].editor,replacement.editor);
 assert.equal(second.editor,undefined);
 for(const page of next)assert.deepEqual(assetPages(page,next).map(p=>p.id),['one','two','alternative','three']);
 const full=Array.from({length:MAX_ASSET_PAGES},(_,i)=>({id:String(i),title:String(i)}));
 assert.equal(replaceAssetPage(full,'0',[replacement]).length,MAX_ASSET_PAGES);
 assert.throws(()=>replaceAssetPage(full,'0',[replacement,alternative]),/up to/);
 assert.throws(()=>replaceAssetPage([first],'missing',[replacement]));
 assert.throws(()=>replaceAssetPage([first],'one',[]));
});
test('Adding after any page preserves order, editable content and membership from every sibling',()=>{
 const added=insertAssetPages([first,second],first.id,[third]);
 assert.deepEqual(added.map(p=>p.id),['one','three','two']);
 assert.deepEqual(added[0].editor,first.editor);
 assert.equal(first.series,undefined);
 for(const page of added)assert.deepEqual(assetPages(page,JSON.parse(JSON.stringify(added))).map(p=>p.id),['one','three','two']);
});
test('Current edits and renamed titles take priority, and missing imported siblings are not ghost pages',()=>{
 const pages=insertAssetPages([first],first.id,[second]);
 const current={...pages[0],title:'Renamed',editor:{text:'New draft'}};
 assert.equal(assetPages(current,pages)[0],current);
 assert.deepEqual(assetPages(current,[]).map(p=>p.id),['one']);
 const next=insertAssetPages(assetPages(current,pages),'two',[third]);
 assert.equal(next[2].series[0].title,'Renamed');
 assert.throws(()=>insertAssetPages(pages,'missing',[third]));
 assert.throws(()=>insertAssetPages(pages,'one',[second]));
 assert.throws(()=>insertAssetPages(pages,'one',[third,third]));
});
test('Manual canvases can grow beyond one six-design generation without dropping earlier pages',()=>{
 const many=Array.from({length:10},(_,i)=>({id:String(i),title:`Asset ${i}`}));
 assert.equal(insertAssetPages(many,'4',[third]).length,11);
 const full=Array.from({length:MAX_ASSET_PAGES},(_,i)=>({id:String(i),title:`Asset ${i}`}));
 assert.throws(()=>insertAssetPages(full,'0',[third]),/up to/);
});

test('Reordering moves a page in both directions and persists the same order on every sibling',async()=>{
 const {moveAssetPage,linkAssetPages}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
 const original=linkAssetPages([first,second,third]);
 const moved=moveAssetPage(original,'three','one','before');
 assert.deepEqual(moved.map(p=>p.id),['three','one','two']);
 for(const page of moved)assert.deepEqual(assetPages(page,moved).map(p=>p.id),['three','one','two']);
 const restored=moveAssetPage(moved,'three','two','after');
 assert.deepEqual(restored.map(p=>p.id),['one','two','three']);
 assert.deepEqual(original.map(p=>p.id),['one','two','three']);
 assert.equal(moveAssetPage(original,'two','two','before'),original);
 assert.throws(()=>moveAssetPage(original,'missing','two','before'));
});

const animationDefaults={enabled:false,transition:'instant',durationMs:600,delayMs:0,easing:'ease-in-out'};
test('Animate reuses the existing next asset without changing its artwork or timing',()=>{
 const source={...first,animation:{...animationDefaults,durationMs:1200,delayMs:250,easing:'spring'}};
 const next=animateAssetPages([source,second,third],'one',animationDefaults,()=>{throw Error('Must not duplicate');},123);
 assert.equal(next.created,false);assert.equal(next.activeId,'one');assert.equal(next.pages.length,3);
 assert.equal(next.pages[1],second);assert.equal(next.pages[2],third);
 assert.deepEqual(next.pages[0].editor,first.editor);
 assert.deepEqual(next.pages[0].animation,{...source.animation,enabled:true,transition:'smart-animate'});
 assert.equal(source.animation.enabled,false);
});
test('Animate duplicates only the final endpoint, retaining layer identities and isolated editable content',()=>{
 const next=animateAssetPages([first,second],'two',animationDefaults,()=> 'copy',123);
 assert.equal(next.created,true);assert.equal(next.activeId,'copy');
 assert.deepEqual(next.pages.map(p=>p.id),['one','two','copy']);
 assert.equal(next.pages[2].animation.transition,'smart-animate');
 assert.notEqual(next.pages[2].animation,next.pages[1].animation);
 for(const page of next.pages)assert.deepEqual(assetPages(page,next.pages).map(p=>p.id),['one','two','copy']);
 const full=Array.from({length:MAX_ASSET_PAGES},(_,i)=>({id:String(i),title:String(i)}));
 assert.equal(animateAssetPages(full,'0',animationDefaults).pages.length,MAX_ASSET_PAGES);
 assert.throws(()=>animateAssetPages(full,String(MAX_ASSET_PAGES-1),animationDefaults),/up to/);
 assert.throws(()=>animateAssetPages(full,'missing',animationDefaults));
});
