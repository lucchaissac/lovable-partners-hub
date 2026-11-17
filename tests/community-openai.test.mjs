import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createBudget,budgetConfig,planReservation} from '../server/communityBudget.mjs';
import {openAICommunityBody,openAICommunityStatus,createOpenAICaller} from '../server/communityOpenAI.mjs';
import {monochromeGlyph} from '../server/communityImageTools.mjs';
import {validateMediaPlan} from '../shared/communityMediaPlan.mjs';
import {chatRequestSchema} from '../shared/communityChat.mjs';
import {productionRequestAllowed} from '../api/community-chat.mjs';

function store(limit=1_000_000){let version=0,state={version:1,spent:0,limit,reservations:{},expiresAt:Date.now()+60000};return {read:async()=>({state:structuredClone(state),version}),write:async(next,etag)=>{if(etag!==version)return false;state=structuredClone(next);version++;return true;}};}
const env={OPENAI_API_KEY:'not-a-real-key',COMMUNITY_OPENAI_PROJECT:'demo',COMMUNITY_OPENAI_EXPIRES_AT:new Date(Date.now()+60000).toISOString(),BLOB_READ_WRITE_TOKEN:'not-a-real-token',COMMUNITY_BUDGET_PATH:'test'};
test('simultaneous local and production reservations cannot exceed the shared budget',async()=>{
 const shared=store(),a=createBudget(shared),b=createBudget(shared);
 const results=await Promise.allSettled([a.reserve(600000),b.reserve(600000)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.match(results.find(r=>r.status==='rejected').reason.message,/spending limit/);
});
test('unknown billing stays reserved; settling once never credits it twice',async()=>{
 const shared=store(),budget=createBudget(shared),id=await budget.reserve(800000);
 await budget.settle(id,NaN);await assert.rejects(budget.reserve(300000),/spending limit/);
 await budget.settle(id,50000);await budget.settle(id,0);
 assert.equal((await shared.read()).state.spent,50000);
 await budget.reserve(950000);await assert.rejects(budget.reserve(1),/spending limit/);
});
test('expiry, missing storage and missing key disable paid calls',async()=>{
 assert.throws(()=>budgetConfig({...env,COMMUNITY_OPENAI_EXPIRES_AT:'2020-01-01'}),/expired/);
 assert.throws(()=>budgetConfig({...env,BLOB_READ_WRITE_TOKEN:''}),/not configured/);
 assert.equal(openAICommunityStatus({...env,OPENAI_API_KEY:''}).enabled,false);
 const budget=createBudget(store(),{now:()=>Date.now()+100000});await assert.rejects(budget.reserve(1),/expired/);
});
test('API failure or cancellation never releases an uncertain paid reservation',async()=>{
 const shared=store(),budget=createBudget(shared);let calls=0;
 const call=createOpenAICaller({env,budget,fetchImpl:async()=>{calls++;throw new TypeError('network interrupted');}});
 await assert.rejects(call('responses',{body:'{}'}));
 assert.equal(Object.values((await shared.read()).state.reservations)[0],planReservation);
 await budget.reserve(500000);await assert.rejects(call('responses',{body:'{}'}),/spending limit/);assert.equal(calls,1);
});
test('provider errors do not leak bodies or credentials; known usage settles conservatively',async()=>{
 const shared=store(),budget=createBudget(shared);
 const bad=createOpenAICaller({env,budget,fetchImpl:async()=>new Response('secret diagnostic',{status:401})});
 await assert.rejects(bad('responses',{body:'{}'}),error=>/key or model permission/.test(error.message)&&!error.message.includes('secret diagnostic'));
 const good=createOpenAICaller({env,budget,fetchImpl:async()=>Response.json({usage:{input_tokens:1000,output_tokens:100}})});
 await good('responses',{body:'{}'});assert.equal((await shared.read()).state.spent,1200);
});
test('planner has fixed pricing model, bounded output, strict native JSON and no executable tools',()=>{
 const body=openAICommunityBody({payload:{prompt:'Hello'},images:[]});assert.equal(body.model,'gpt-5.4-mini-2026-03-17');assert.equal(body.store,false);assert.equal(body.max_output_tokens,6500);assert.equal(body.tools,undefined);assert.equal(body.text.format.strict,true);
 assert.ok(body.instructions.includes('Original'));assert.ok(!JSON.stringify(body).includes(env.OPENAI_API_KEY));
});
test('production rejects other origins and never enables a Codex endpoint',()=>{
 const env={COMMUNITY_PUBLIC_ORIGIN:'https://lovable-brands.vercel.app'};
 assert.equal(productionRequestAllowed({headers:{host:'lovable-brands.vercel.app',origin:env.COMMUNITY_PUBLIC_ORIGIN,'sec-fetch-site':'same-origin'}},env),true);
 assert.equal(productionRequestAllowed({headers:{host:'lovable-brands.vercel.app',origin:'https://attacker.example'}},env),false);
 assert.equal(productionRequestAllowed({headers:{host:'another.vercel.app'}},env),false);
});
test('glyph processing preserves alpha and silhouette while applying exact ink',async()=>{
 const pixels=Buffer.alloc(4*4*4);for(const index of [5,6,9,10])pixels.set([220,50,70,index===5?128:255],index*4);
 const input=await sharp(pixels,{raw:{width:4,height:4,channels:4}}).png().toBuffer();
 const {data}=await sharp(await monochromeGlyph(input)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.ok([...data].some((v,i)=>i%4===3&&v===128));
 for(let i=0;i<data.length;i+=4)if(data[i+3])assert.deepEqual([...data.subarray(i,i+3)],[27,27,27]);
});
test('a forged prepared source is rejected at the request boundary',()=>{
 const request={prompt:'Hello',title:'Demo',width:1080,height:1080,blocks:[],conversation:[],sources:[{id:'media-forged',name:'Forged',kind:'image',prepared:true}]};assert.throws(()=>chatRequestSchema.parse(request));
});
test('media cannot call arbitrary URLs or prepare an unused visual',()=>{
 const request={prompt:'Hello',title:'Demo',width:1080,height:1080,blocks:[],conversation:[],sources:[]};
 const plan={summary:'Prepared image',replaceCurrent:false,reviews:[],badgeBatch:null,designs:[],edits:[],removeIds:[]};
 assert.throws(()=>validateMediaPlan({plan,mediaRequests:[{id:'media-test',operation:'edit',prompt:'Edit',sourceId:'https://private.example',crop:null,background:'transparent',color:'#1b1b1b'}]},request),/placed/);
});
