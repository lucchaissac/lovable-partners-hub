import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseCommunityRoster} from '../shared/communityRoster.mjs';
import {validateChatPlan} from '../shared/communityChat.mjs';

const request={prompt:'Make name badges for our event in Paris.',title:'Event',width:1200,height:630,blocks:[],conversation:[],sources:[],availablePageSlots:63};
const batch={reviews:[],summary:'Created the name badges.',badgeBatch:{sourceId:'attachment-0',people:[],city:'Paris',role:''},designs:[],edits:[],removeIds:[]};
const withCsv=text=>({...request,sources:[{id:'attachment-0',name:'people.csv',kind:'text',text}]});

test('A first badge batch consumes the starting template instead of leaving a spare event page',()=>{
 const csv=['name',...Array.from({length:64},(_,i)=>`Guest ${i+1}`)].join('\n');
 const result=validateChatPlan(batch,{...withCsv(csv),startingTemplate:true});
 assert.equal(result.replaceCurrent,true);
 assert.equal(result.badgeBatch.people.length,64);
 assert.throws(()=>validateChatPlan(batch,withCsv(csv)),/64 people.*63 more/);
});

test('CSV supports quoted names, escaped quotes, multiline fields, BOM, CRLF and ignored columns',()=>{
 assert.deepEqual(parseCommunityRoster('\uFEFFname,role,city,email\r\n"Martin, Camille","Designer,\nmaker",Paris,ignored@example.test\r\n"Alex ""Al"" Moreau",,Lyon,'),[
  {name:'Martin, Camille',role:'Designer, maker',city:'Paris'},
  {name:'Alex "Al" Moreau',role:'',city:'Lyon'},
 ]);
 assert.deepEqual(parseCommunityRoster('Prénom;Nom;Fonction;Ville\nLina;Bernard;Designer;Paris'),[{name:'Lina Bernard',role:'Designer',city:'Paris'}]);
 assert.deepEqual(parseCommunityRoster('Name\tRole\tCity\nSam Dubois\tBuilder\tParis'),[{name:'Sam Dubois',role:'Builder',city:'Paris'}]);
});
test('Plain lists retain order and duplicate names; malformed or oversized rows fail without truncation',()=>{
 assert.deepEqual(parseCommunityRoster('- Camille Martin\n2. Alex Moreau\n• Camille Martin').map(p=>p.name),['Camille Martin','Alex Moreau','Camille Martin']);
 for(const text of ['name,role\n,Designer','name,role','name\n"Unclosed','name\n'+ 'a'.repeat(49),Array(65).fill('Camille Martin').join('\n')])assert.throws(()=>parseCommunityRoster(text));
});
test('Batch validation reads every CSV row itself, preserves per-person fields and applies supplied defaults',()=>{
 const csv='name,role,city\nCamille Martin,Designer,\nAlex Moreau,,Lyon\nLina Bernard,,\nNoah Petit,,\nSam Dubois,,\nJules Thomas,,\nCharlie Robert,,';
 const result=validateChatPlan(batch,withCsv(csv));
 assert.equal(result.badgeBatch.people.length,7);
 assert.deepEqual(result.badgeBatch.people[0],{name:'Camille Martin',role:'Designer',city:'Paris'});
 assert.equal(result.badgeBatch.people[1].city,'Lyon');
 assert.deepEqual(validateChatPlan(result,withCsv(csv)),result);
 assert.throws(()=>validateChatPlan(batch,{...withCsv(csv),availablePageSlots:6}),/7 people.*6 more/);
 assert.throws(()=>validateChatPlan({...batch,removeIds:['old']},withCsv(csv)),/separately/);
 assert.throws(()=>validateChatPlan(batch,request),/missing/);
});
test('Pasted and inline names are supported without inventing attendee details',()=>{
 const pasted={...batch,badgeBatch:{...batch.badgeBatch,sourceId:'prompt'}};
 const result=validateChatPlan(pasted,{...request,prompt:'Make badges for Paris:\nCamille Martin\nAlex Moreau'});
 assert.equal(result.badgeBatch.people.length,2);
 const inline={...batch,badgeBatch:{...batch.badgeBatch,sourceId:null,people:[{name:'Camille Martin',role:'',city:''}]}};
 assert.equal(validateChatPlan(inline,{...request,prompt:'Make a badge for Camille Martin for our event in Paris.'}).badgeBatch.people[0].city,'Paris');
 assert.throws(()=>validateChatPlan(inline,request),/supplied/);
 assert.throws(()=>validateChatPlan({...pasted,badgeBatch:{...pasted.badgeBatch,city:'Berlin'}},{...request,prompt:'Make badges for Paris:\nCamille Martin'}),/supplied/);
});
test('The downloadable Paris example has exactly five usable attendees',async()=>{
 const csv=await readFile(new URL('../examples/community-badges-paris.csv',import.meta.url),'utf8');
 assert.equal(validateChatPlan(batch,withCsv(csv)).badgeBatch.people.length,5);
});
test('QR elements accept only supplied links and preserve the square',()=>{
 const qr={id:'join-qr',kind:'qr',url:'https://lovable.dev/community',frame:{x:100,y:100,width:80,height:80,rotation:0,opacity:1}};
 const edit={reviews:[],summary:'Added a QR.',badgeBatch:null,designs:[],edits:[qr],removeIds:[]};
 const linked={...request,prompt:'Add a QR for https://lovable.dev/community'};
 assert.equal(validateChatPlan(edit,linked).edits[0].url,qr.url);
 assert.throws(()=>validateChatPlan(edit,request),/exact link/);
 assert.throws(()=>validateChatPlan({...edit,edits:[{...qr,frame:{...qr.frame,height:160}}]},linked),/square/);
});
