import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer as httpServer} from 'node:http';
import {randomBytes,randomUUID} from 'node:crypto';
import {access as fileAccess} from 'node:fs/promises';
import {createServer} from 'vite';
import sharp from 'sharp';
import {createHubHandler,maxHubBody} from '../server/hubApi.mjs';
import {HubError,tokenHash} from '../server/hubAccess.mjs';
import {hubWorkspaces,hubScopes,catalog} from '../shared/hubApiCatalog.mjs';

const vite=await createServer({configFile:false,cacheDir:'node_modules/.vite-test-hub',server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
const documents=await vite.ssrLoadModule('/server/hubDocument.ts');
const makeKey=(id,extra={})=>{const token='lhub_'+randomBytes(32).toString('base64url');return {token,record:{id,name:id,sha256:tokenHash(token),workspaces:['lovable'],scopes:hubScopes,expiresAt:'2099-01-01T00:00:00Z',...extra}};};
const owner=makeKey('owner'),reader=makeKey('reader',{scopes:['guidelines:read','assets:read','templates:read','designs:read']}),expired=makeKey('expired',{expiresAt:'2020-01-01T00:00:00Z'}),revoked=makeKey('revoked',{revoked:true});
const env={HUB_API_KEYS:JSON.stringify([owner,reader,expired,revoked].map(k=>k.record)),HUB_API_PUBLIC_ORIGIN:'https://hub.example'};
const records=new Map();let writes=0;
const store={
  async read(w,id){const value=records.get(w+'/'+id);return value?structuredClone(value):null;},
  async write(w,id,record,etag){await Promise.resolve();const current=records.get(w+'/'+id);if(current?.etag!==etag)throw new HubError(412,'Concurrent update rejected.');records.set(w+'/'+id,{record:structuredClone(record),etag:randomUUID()});writes++;},
  async list(w){return {ids:[...records.keys()].filter(id=>id.startsWith(w+'/')).map(id=>id.slice(w.length+1)),cursor:null};},
};
const app=httpServer(createHubHandler({env,storeFactory:()=>store,loadDocuments:async()=>documents}));
await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${app.address().port}`;
after(async()=>{await new Promise(resolve=>app.close(resolve));await vite.close();});
const request=(path,options={},key=owner)=>fetch(origin+'/api/hub/v1/'+path,{...options,headers:{...(key?{Authorization:'Bearer '+key.token}:{}),...options.headers}});
const source=()=>documents.exampleDocument();
const body=document=>JSON.stringify({document});
const create=document=>request('designs?workspace=lovable',{method:'POST',headers:{'Content-Type':'application/json'},body:body(document)});

test('Every protected operation rejects missing, invalid, expired and revoked keys',async()=>{
  for(const key of [null,expired,revoked,{token:owner.token+'x'}])for(const path of ['me','workspaces','assets?workspace=lovable','designs?workspace=lovable']){
    const res=await request(path,{},key);assert.equal(res.status,401);assert.equal(res.headers.get('cache-control'),'private, no-store');assert.match(res.headers.get('www-authenticate'),/Bearer/);
  }
  const me=await (await request('me')).json();assert.equal(me.id,'owner');assert.equal(me.sha256,undefined);
  const workspaces=await (await request('workspaces')).json();assert.deepEqual(workspaces.data.map(w=>w.id),['lovable']);
});
test('Workspace and write permissions are enforced before reading or writing storage',async()=>{
  for(const path of ['assets?workspace=ambassadors','designs?workspace=partners'])assert.equal((await request(path)).status,403);
  assert.equal((await request('assets')).status,400);
  const before=writes;assert.equal((await request('designs?workspace=lovable',{method:'POST',headers:{'Content-Type':'application/json'},body:body(source())},reader)).status,403);assert.equal(writes,before);
});
test('Create, read and update preserve native layers, omit local chats and assign a fresh shared identity',async()=>{
  const original=source();original.workspaceChats=[{id:'private-chat',title:'Private',updatedAt:1}];original.workspaceActiveChatId='private-chat';original.messages=[];original.series=[{id:randomUUID(),title:'Unshared'}];
  const created=await create(original);assert.equal(created.status,201);const first=await created.json();assert.notEqual(first.id,original.id);assert.deepEqual(first.document.editor,original.editor);assert.equal(first.document.messages,undefined);assert.equal(first.document.series,undefined);assert.equal(first.document.workspaceChats,undefined);
  const path=`designs/${first.id}?workspace=lovable`,read=await request(path,{},reader),etag=read.headers.get('etag');assert.equal(read.status,200);assert.ok(etag);
  const edited={...first.document,title:'Updated together'};
  assert.equal((await request(path,{method:'PUT',headers:{'Content-Type':'application/json'},body:body(edited)})).status,428);
  const saved=await request(path,{method:'PUT',headers:{'Content-Type':'application/json','If-Match':etag},body:body(edited)});assert.equal(saved.status,200);assert.notEqual(saved.headers.get('etag'),etag);
  assert.equal((await request(path,{method:'PUT',headers:{'Content-Type':'application/json','If-Match':etag},body:body(edited)})).status,412);
  const latest=await (await request(path)).json();assert.equal(latest.document.title,'Updated together');assert.deepEqual(latest.document.editor,original.editor);
  const listed=await (await request('designs?workspace=lovable')).json();assert.ok(listed.data.some(d=>d.id===first.id));assert.ok(listed.data.every(d=>!d.document));
});
test('Simultaneous updates cannot both overwrite the same version',async()=>{
  const created=await create(source()),etag=created.headers.get('etag'),first=await created.json();
  const results=await Promise.all(['First','Second'].map(title=>request(`designs/${first.id}?workspace=lovable`,{method:'PUT',headers:{'Content-Type':'application/json','If-Match':etag},body:body({...first.document,title})})));
  assert.deepEqual(results.map(r=>r.status).sort(),[200,412]);
});
test('Invalid sources, mismatched IDs, malformed JSON and oversized input do not reach storage',async()=>{
  const before=writes;
  assert.equal((await create({version:1})).status,400);
  assert.equal((await request('designs?workspace=lovable',{method:'POST',headers:{'Content-Type':'text/plain'},body:'x'})).status,415);
  assert.equal((await request('designs?workspace=lovable',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
  assert.equal((await request('designs?workspace=lovable',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(maxHubBody+1)})).status,413);
  assert.equal(writes,before);
  const created=await create(source()),etag=created.headers.get('etag'),first=await created.json();
  assert.equal((await request(`designs/${first.id}?workspace=lovable`,{method:'PUT',headers:{'Content-Type':'application/json','If-Match':etag},body:body({...first.document,id:randomUUID()})})).status,400);
  assert.equal((await request(`designs/${randomUUID()}?workspace=lovable`)).status,404);
});
test('Browser origins and route boundaries are checked; the contract is available without a key',async()=>{
  assert.equal((await request('me',{headers:{Origin:'https://untrusted.example'}})).status,403);
  const cors=await request('me',{headers:{Origin:'https://hub.example'}});assert.equal(cors.headers.get('access-control-allow-origin'),'https://hub.example');
  assert.equal((await request('me',{method:'POST'})).status,405);
  assert.equal((await request('designs/not-an-id?workspace=lovable')).status,404);
  const contract=await (await request('openapi',{},null)).json();assert.equal(contract.openapi,'3.1.0');assert.ok(contract.paths['/designs/{id}'].put);assert.ok(contract.components.securitySchemes.hubKey);
  const routed=await fetch(origin+'/api/hub?path=workspaces',{headers:{Authorization:'Bearer '+owner.token}});assert.equal(routed.status,200);
});
test('Missing or malformed access configuration fails closed',async()=>{
  const previous=env.HUB_API_KEYS;
  for(const value of ['', '{', JSON.stringify([{...owner.record,workspaces:['*']}])]){env.HUB_API_KEYS=value;assert.equal((await request('me')).status,503);}
  env.HUB_API_KEYS=previous;
});
test('Starter source validates and decodes; catalog links use real local masters',async()=>{
  const example=await (await request('example?workspace=lovable')).json();assert.ok(documents.validateDocument(example.document));
  const image=await sharp(Buffer.from(example.document.reference.src.split(',')[1],'base64')).raw().toBuffer({resolveWithObject:true});assert.equal(image.info.width,1);assert.equal(image.data[3],0);
  for(const workspace of hubWorkspaces)for(const asset of catalog('assets',workspace)){await fileAccess(new URL('../public'+asset.src,import.meta.url));}
  assert.equal(catalog('templates','partners').length,8);assert.equal(catalog('templates','ambassadors').length,7);
});
