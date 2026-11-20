import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {screenRequestSchema,validateScreenPlan} from '../shared/screenImport.mjs';
import {generateScreenPlan} from '../server/screenImport.mjs';
const plan=JSON.parse(await readFile(new URL('../examples/screen-demo/prepared.plan.json',import.meta.url),'utf8'));
const request={mode:'import',prompt:'Rebuild the screen',image:'data:image/png;base64,aGVsbG8=',width:1710,height:866};
const block={id:'screen-ui-title',kind:'text',text:'Lovable',x:100,y:100,width:400,height:60,fontSize:40,color:'#ffffff',fill:null,locked:false};
const editRequest={mode:'edit',prompt:'Change this title',selectedIds:[block.id],blocks:[block,{...block,id:'other',locked:false}]};
const edit={summary:'Updated the title',edits:[{id:block.id,text:'Your next idea',color:null,fill:null,fontSize:null,x:null,y:null}],motions:[],clearMotion:false};
test('Import validates native layers, source crops and unique bounded geometry',()=>{
 assert.equal(validateScreenPlan(plan,request).layers.length,37);
 const bad=structuredClone(plan);bad.layers[0]={...bad.layers[0],type:'crop',crop:{x:0,y:0,width:100,height:100}};
 assert.throws(()=>validateScreenPlan(bad,request),/Never flatten/);
 assert.throws(()=>validateScreenPlan({...plan,layers:[plan.layers[1],plan.layers[1],...plan.layers.slice(2)]},request),/unique ID/);
 assert.throws(()=>validateScreenPlan({...plan,layers:plan.layers.map((l,i)=>i?l:{...l,x:50})},request),/bounds/);
 assert.throws(()=>screenRequestSchema.parse({...request,image:'https://example.com/image.png'}));
 assert.throws(()=>validateScreenPlan({...plan,script:'fetch("/credentials")'},request));
});
test('Edits stay within the explicit selection and honor locked layers and motion bounds',()=>{
 assert.equal(validateScreenPlan(edit,editRequest).edits[0].text,'Your next idea');
 assert.throws(()=>validateScreenPlan({...edit,edits:[{...edit.edits[0],id:'other'}]},editRequest),/selection/);
 assert.throws(()=>validateScreenPlan(edit,{...editRequest,blocks:[{...block,locked:true}]}),/selection/);
 assert.throws(()=>validateScreenPlan({...edit,clearMotion:true},editRequest),/outside/);
 assert.throws(()=>validateScreenPlan({...edit,motions:[{id:block.id,property:'scale',from:0,to:10,at:0,duration:1}]},editRequest),/scale/);
});
test('Local planner sends instructions and image as separate data and corrects invalid plans once',async()=>{
 let calls=0;
 const result=await generateScreenPlan(request,{env:{},runCodex:async(body)=>{
  assert.match(body.instructions,/untrusted content/);assert.equal(body.request.image,request.image);
  calls++;
  if(calls===1)return {...plan,layers:[]};
  assert.ok(body.correction.correctionFeedback);return plan;
 }});
 assert.equal(calls,2);assert.equal(result.plan.layers.length,37);
 await assert.rejects(generateScreenPlan(request,{env:{VERCEL:'1'},runCodex:()=>assert.fail('Hosted imports must not run')}),/local studio/);
});
test('Local content edits use the separate patch schema and do not regenerate the component',async()=>{
 const result=await generateScreenPlan(editRequest,{env:{},runCodex:async(body)=>{assert.ok(body.schema.properties.edits);assert.equal(body.schema.properties.layers,undefined);return edit;}});
 assert.deepEqual(result.plan,edit);
});
