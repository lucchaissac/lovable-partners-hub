import test from 'node:test';
import assert from 'node:assert/strict';
import {validateChatPlan} from '../shared/communityChat.mjs';
import {communityDesignMetrics} from '../shared/communityDesignRules.mjs';
import {communityPlanReplies} from '../shared/communityReview.mjs';
import {validatedCommunityGeneration} from '../server/communityChat.mjs';

const frame=(x,y,width,height,opacity=1)=>({x,y,width,height,rotation:0,opacity});
const request={prompt:'Analyse cette affiche et refais une version conforme.',title:'Test',width:900,height:600,blocks:[],conversation:[],sources:[{id:'attachment-0',kind:'image',name:'Event.png',image:'data:image/png;base64,AAAA'}]};
const metrics=communityDesignMetrics('badge',900,600);
const logo={id:'logo',kind:'brand',asset:'community-logo',color:'light',city:'',frame:frame(metrics.inset,metrics.inset,metrics.logoWidth,metrics.logoHeight)};
const title={id:'headline',kind:'text',text:'Build together.',fontSize:104,weight:700,align:'left',color:'#f7f4ed',lineHeight:108,frame:frame(60,238,780,112)};
const review={sourceId:'attachment-0',verdict:'off-brand',diagnosis:'La signature Community manque.',issues:[{area:'identity',problem:'Signature Lovable seule.',correction:'Utiliser la signature complète Lovable Community.'}],keep:['Le message'],remove:['Le faux logo'],retainedVisuals:[],uncertainties:[]};
const plan={reviews:[review],summary:'Une version corrigée est créée.',badgeBatch:null,designs:[{title:'Corrected event',reference:'badge',visualTreatment:'typographic',width:900,height:600,background:'ink',elements:[logo,title]}],edits:[],removeIds:[]};
const clone=()=>structuredClone(plan);
const image={id:'scene',kind:'image',sourceId:'attachment-0',crop:{x:.05,y:.6,width:.9,height:.25},placement:'inset',alt:'Coastal illustration',fit:'contain',radius:0,frame:frame(54,400,792,140)};
function retained(){const p=clone();p.designs[0].visualTreatment='retained-visual';p.designs[0].elements.push(structuredClone(image));p.reviews[0].retainedVisuals.push({sourceId:'attachment-0',elementId:'scene',kind:'illustration',reason:'The coastal scene supports the event location without its old typography.'});return p;}

test('Image-led redesigns include a source-specific review and a complete Community composition',()=>{
 assert.ok(validateChatPlan(plan,request));
 const noReview=clone();noReview.reviews=[];assert.throws(()=>validateChatPlan(noReview,request),/Inspect each attached/);
 const noLogo=clone();noLogo.designs[0].elements.shift();assert.throws(()=>validateChatPlan(noLogo,request),/exactly one/);
 const onlyLogo=clone();onlyLogo.designs[0].elements.pop();assert.throws(()=>validateChatPlan(onlyLogo,request),/isolated logo/);
 const wordmark=clone();wordmark.designs[0].elements[1].text='Lovable';assert.throws(()=>validateChatPlan(wordmark,request),/isolated logo|wordmark/);
 const wrongSource=clone();wrongSource.reviews[0].sourceId='invented';assert.throws(()=>validateChatPlan(wrongSource,request));
 const noDiagnosis=clone();noDiagnosis.reviews[0].issues=[];assert.throws(()=>validateChatPlan(noDiagnosis,request),/specific brand problems/);
});
test('Retained imagery uses an explicit useful crop, not the complete off-brand poster',()=>{
 assert.ok(validateChatPlan(retained(),request));
 for(const crop of [null,{x:0,y:0,width:1,height:1},{x:.9,y:0,width:.5,height:.5}]){const p=retained();p.designs[0].elements[2].crop=crop;assert.throws(()=>validateChatPlan(p,request),/whole off-brand|inside the source/);}
 const unexplained=retained();unexplained.reviews[0].retainedVisuals=[];assert.throws(()=>validateChatPlan(unexplained,request),/Explain why/);
 const absent=retained();absent.designs[0].elements.pop();assert.throws(()=>validateChatPlan(absent,request),/must appear/);
 const justLogo=retained();justLogo.reviews[0].retainedVisuals[0].kind='partner-logo';assert.throws(()=>validateChatPlan(justLogo,request),/main illustration/);
});
test('A clean supplied photo can remain whole; background use preserves signature legibility and order',()=>{
 const p=retained();p.reviews[0].verdict='reference-only';p.reviews[0].issues=[];
 const photo=p.designs[0].elements.pop();photo.crop=null;photo.placement='background';photo.frame=frame(0,0,900,600,.25);p.designs[0].elements.unshift(photo);
 assert.ok(validateChatPlan(p,request));
 photo.frame.opacity=1;assert.throws(()=>validateChatPlan(p,request),/legibility/);
 photo.frame.opacity=.25;p.designs[0].elements.push(p.designs[0].elements.shift());assert.throws(()=>validateChatPlan(p,request),/behind/);
});
test('Reviewed layouts preserve whitespace, avoid overlapping copy and do not mix competing scenes',()=>{
 const p=clone();p.designs[0].elements.push({...title,id:'details',text:'Another line',fontSize:32,weight:600,frame:frame(60,280,700,60)});assert.throws(()=>validateChatPlan(p,request),/frames overlap/);
 const mixed=retained();mixed.designs[0].elements.unshift({...logo,id:'globe',asset:'globe',frame:frame(400,100,600,600)});assert.throws(()=>validateChatPlan(mixed,request),/one coherent visual treatment/);
});
test('Review-only requests retain the canvas and return an explicit verdict with concrete corrections',()=>{
 const p=clone();p.designs=[];assert.ok(validateChatPlan(p,request));
 const replies=communityPlanReplies(p,request).join('\n');assert.match(replies,/Hors charte/);assert.match(replies,/signature complète/);assert.match(replies,/À conserver/);
 const large=clone();large.reviews[0].issues=Array.from({length:8},()=>({area:'layout',problem:'a'.repeat(300),correction:'b'.repeat(300)}));
 const chunks=communityPlanReplies(large,request);assert.ok(chunks.length>2);assert.ok(chunks.every(chunk=>chunk.length<=4000));assert.equal(chunks.join('\n').split('a'.repeat(300)).length-1,8);
});
test('An invalid retained poster is corrected once before reaching the canvas',async()=>{
 const bad=retained();bad.designs[0].elements[2].crop=null;let calls=0;
 const result=await validatedCommunityGeneration(request,async feedback=>{calls++;if(!feedback)return bad;assert.match(feedback.correctionFeedback,/whole off-brand/);return retained();});
 assert.equal(calls,2);assert.equal(result.designs[0].elements[2].crop.height,.25);
});
