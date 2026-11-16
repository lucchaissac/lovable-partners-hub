import test from 'node:test';
import {z} from 'zod';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {communityChatPlugin,localRequestAllowed,runProcess} from '../server/communityChat.mjs';
import {chatPlanSchema,validateChatPlan} from '../shared/communityChat.mjs';

const frame={x:64,y:64,width:700,height:120,rotation:0,opacity:1};
const text={id:'title',kind:'text',frame,text:'Build together.',fontSize:80,weight:700,align:'left',color:'#f7f4ed',lineHeight:105};
const request={prompt:'Make a square LinkedIn post',title:'Demo',width:1200,height:630,blocks:[{id:'title',kind:'text',text:'Original'}],conversation:[],sources:[]};
const plan={summary:'Created a LinkedIn post.',designs:[{title:'Community meetup',width:1080,height:1080,background:'ink',elements:[text]}],edits:[],removeIds:[]};

test('Generation accepts free formats and multiple designs, but rejects executable content and unknown sources',()=>{
 assert.equal(validateChatPlan({...plan,designs:[...plan.designs,{...plan.designs[0],width:1200,height:627}]},request).designs.length,2);
 assert.throws(()=>chatPlanSchema.parse({...plan,designs:[{...plan.designs[0],elements:[{id:'script',kind:'code',code:'alert(1)'}]}]}));
 assert.throws(()=>validateChatPlan({...plan,designs:[],edits:[{id:'copy',kind:'reuse',sourceId:'invented',frame:null}]},request));
 assert.throws(()=>validateChatPlan({...plan,edits:[text]},request));
 assert.throws(()=>validateChatPlan({...plan,designs:[],removeIds:['unknown']},request));
 assert.throws(()=>validateChatPlan({...plan,designs:[{...plan.designs[0],elements:[text,text]}]},request));
 assert.throws(()=>chatPlanSchema.parse({...plan,designs:[{...plan.designs[0],elements:[{...text,id:'invalid_native_id'}]}]}));
 assert.throws(()=>chatPlanSchema.parse({...plan,designs:[{...plan.designs[0],elements:[{...text,id:'a'.repeat(81)}]}]}));
});
test('Local bridge rejects cross-origin, rebinding and network requests',()=>{
 const req={headers:{host:'127.0.0.1:5173',origin:'http://127.0.0.1:5173'},socket:{remoteAddress:'127.0.0.1'}};
 assert.ok(localRequestAllowed(req));
 assert.equal(localRequestAllowed({...req,headers:{...req.headers,origin:'https://example.com'}}),false);
 assert.equal(localRequestAllowed({...req,headers:{host:'evil.example:5173'}}),false);
 assert.equal(localRequestAllowed({...req,socket:{remoteAddress:'192.168.1.10'}}),false);
 assert.equal(localRequestAllowed({...req,headers:{...req.headers,'sec-fetch-site':'cross-site'}}),false);
});
async function fixture(t,generate=async()=>plan){
 let middleware;const server=createServer((req,res)=>middleware(req,res));const plugin=communityChatPlugin({generate,checkStatus:async()=>({enabled:true})});
 assert.equal(plugin.apply,'serve');assert.equal(plugin.configurePreviewServer,undefined);
 plugin.configureServer({httpServer:server,middlewares:{use(_path,fn){middleware=fn;}}});
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
 return `http://127.0.0.1:${server.address().port}/api/community-chat`;
}
test('Local HTTP boundary enforces input validation and does not invoke a provider for rejected requests',async t=>{
 let calls=0;const url=await fixture(t,async()=>{calls++;return plan;});
 assert.equal((await (await fetch(url)).json()).enabled,true);
 assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)})).status,415);
 assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Lovable-Local':'1'},body:'{}'})).status,400);
 assert.equal(calls,0);
 const result=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Lovable-Local':'1'},body:JSON.stringify(request)});
 assert.equal(result.status,200);assert.deepEqual(await result.json(),plan);assert.equal(calls,1);
});
test('Closing a request cancels its provider job, and a second request cannot overlap',async t=>{
 let started,resolveCancelled;const ready=new Promise(resolve=>started=resolve),cancelled=new Promise(resolve=>resolveCancelled=resolve);
 const url=await fixture(t,(_request,signal)=>new Promise((_resolve,reject)=>{started();signal.addEventListener('abort',()=>{resolveCancelled();reject(new Error('Cancelled'));});}));
 const controller=new AbortController(),options={method:'POST',headers:{'Content-Type':'application/json','X-Lovable-Local':'1'},body:JSON.stringify(request)};
 const first=fetch(url,{...options,signal:controller.signal}).catch(()=>{});await ready;
 assert.equal((await fetch(url,options)).status,409);controller.abort();await first;await cancelled;
});
test('Stop terminates the local CLI process',async()=>{
 const abort=new AbortController();const result=runProcess(process.execPath,['-e','setInterval(()=>{},1000)'],{signal:abort.signal});abort.abort();await assert.rejects(result,/Cancelled/);
});

test('A selected-element edit cannot change or remove unrelated elements',()=>{
 const scoped={...request,blocks:[...request.blocks,{id:'other',kind:'text',text:'Keep this'}],context:'HTML_SELECTION '+JSON.stringify({blockIds:['title']})};
 assert.ok(validateChatPlan({...plan,designs:[],edits:[text]},scoped));
 assert.throws(()=>validateChatPlan({...plan,designs:[],edits:[{...text,id:'other'}]},scoped),/unselected/);
 assert.throws(()=>validateChatPlan({...plan,designs:[],removeIds:['other']},scoped),/unselected/);
});
test('The structured-output schema uses supported anyOf unions',()=>{
 const schema=z.toJSONSchema(chatPlanSchema);assert.equal(JSON.stringify(schema).includes('"oneOf"'),false);
});
