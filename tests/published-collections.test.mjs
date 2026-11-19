import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';

const server=await createServer({configFile:false,cacheDir:'node_modules/.vite-test-published-collections',server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
after(()=>server.close());
const {assetCollectionSchema,editableAssetCollection}=await server.ssrLoadModule('/studio/src/assets-tool/assetCollection.ts');
const {parsePublishedCollection,loadPublishedCollection}=await server.ssrLoadModule('/studio/src/assets-tool/publishedCollections.ts');
const manifest=JSON.parse(await readFile(new URL('../public/collections/index.json',import.meta.url)));
const packed=JSON.parse(await readFile(new URL(`../public${manifest.collections[0].source}`,import.meta.url)));
const collection=parsePublishedCollection(packed);

test('Published snapshot retains all twelve native assets, including the added Newsletter copy',()=>{
 assert.equal(collection.assets.length,12);
 assert.equal(collection.activeId,collection.assets.at(-1).id);
 assert.equal(collection.assets.at(-1).title,'Community Newsletter · Copy');
 assert.ok(collection.assets.every(asset=>asset.editor&&asset.series.length===12));
 assert.ok(collection.assets.every(asset=>!asset.messages&&!asset.workspaceChats));
 const native=collection.assets.at(-1).editor.pages.flatMap(p=>p.sections.flatMap(s=>s.columns.flat()));
 assert.ok(native.some(block=>block.kind==='text'&&block.value.runs.map(run=>run.text).join('')==='Stay in the community\nloop'));
 assert.equal(native.find(block=>block.ambassadorElement==='globe').ambassador.city,'Stockholm');
 assert.deepEqual(editableAssetCollection(collection.assets,collection.activeId),collection);
});

test('Collection validation rejects duplicate pages, missing active assets and unresolved references',()=>{
 assert.throws(()=>assetCollectionSchema.parse({...collection,assets:[collection.assets[0],collection.assets[0]]}));
 assert.throws(()=>assetCollectionSchema.parse({...collection,activeId:crypto.randomUUID()}));
 assert.throws(()=>parsePublishedCollection({...packed,references:{}}));
});

test('Published lookup is scoped to workspace and retains order and geometry',async()=>{
 const calls=[];
 const request=async path=>{calls.push(path);return Response.json(path==='/collections/index.json'?manifest:packed);};
 const assets=await loadPublishedCollection(collection.activeId,'lovable',request);
 assert.deepEqual(assets,collection.assets);
 assert.equal(calls.length,2);
 assert.deepEqual(await loadPublishedCollection(collection.activeId,'partners',request),[]);
 assert.deepEqual(await loadPublishedCollection(crypto.randomUUID(),'lovable',request),[]);
 const count=calls.length;
 assert.deepEqual(await loadPublishedCollection('../private','lovable',request),[]);
 assert.equal(calls.length,count);
});

test('An incomplete or unavailable publication cannot silently seed a partial collection',async()=>{
 const broken={...packed,assets:packed.assets.slice(1)};
 await assert.rejects(loadPublishedCollection(collection.activeId,'lovable',async path=>Response.json(path.endsWith('index.json')?manifest:broken)),/incomplete/);
 await assert.rejects(loadPublishedCollection(collection.activeId,'lovable',async()=>new Response('',{status:503})),/Could not open/);
 assert.deepEqual(await loadPublishedCollection(collection.activeId,'lovable',async()=>new Response('',{status:404})),[]);
});
