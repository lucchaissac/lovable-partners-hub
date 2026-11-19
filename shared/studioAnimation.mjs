import {textAnimationModes} from './textAnimation.mjs';
import {blendModes} from './blendModes.mjs';
import {z} from 'zod';
import {curveDefaults,gridDefaults} from './techArtwork.mjs';

const id=z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
const ranges={x:[-4000,4000],y:[-4000,4000],width:[1,4000],height:[1,4000],rotation:[-360,360],rotationX:[-360,360],rotationY:[-360,360],depth:[-2000,2000],perspective:[100,5000],opacity:[0,1],blur:[0,100],fontSize:[6,600],cornerRadius:[0,1500],lineWidth:[1,24],'tech.scale':[25,300],'tech.offsetX':[-100,100],'tech.offsetY':[-100,100],'tech.count':[3,64],'tech.spread':[25,160],'tech.rotation':[-180,180],'tech.stroke':[.1,4],'tech.opacity':[0,100],'tech.spacing':[10,84]};
const change=z.union([
 ...Object.entries(ranges).map(([property,[min,max]])=>z.object({id,property:z.literal(property),value:property==='tech.count'?z.number().int().min(min).max(max):z.number().min(min).max(max)}).strict()),
 ...['fill','color','tech.color'].map(property=>z.object({id,property:z.literal(property),value:z.string().regex(property==='tech.color'?/^#[0-9a-f]{6}$/i:/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i)}).strict()),
 z.object({id,property:z.literal('textAnimation'),value:z.enum(textAnimationModes)}).strict(),
 z.object({id,property:z.literal('blendMode'),value:z.enum(blendModes)}).strict(),
]);
const timing=z.object({durationMs:z.number().int().min(1).max(10000),delayMs:z.number().int().min(0).max(10000),easing:z.enum(['ease-in-out','linear','ease-in','ease-out','spring','custom']),curve:z.tuple([z.number().min(0).max(1),z.number().min(-1).max(2),z.number().min(0).max(1),z.number().min(-1).max(2)]),bounce:z.number().min(0).max(80),velocity:z.number().min(-10).max(10)}).strict();
export const studioAnimationPlanSchema=z.object({summary:z.string().min(1).max(1200),initialChanges:z.array(change).max(400),steps:z.array(z.object({title:z.string().min(1).max(100),changes:z.array(change).min(1).max(400),transition:timing}).strict()).max(63)}).strict();
export const studioAnimationRevisionSchema=z.object({summary:z.string().min(1).max(1200),updates:z.array(z.object({assetId:z.uuid(),changes:z.array(change).max(400),transition:timing.nullable()}).strict()).max(64)}).strict();
const snapshotBlock=z.object({id,kind:z.string().max(30),name:z.string().max(500),text:z.string().max(8000),locked:z.boolean(),groupId:z.string().max(100).nullable(),frame:z.record(z.string(),z.union([z.number(),z.string(),z.boolean()])),appearance:z.record(z.string(),z.union([z.number(),z.string(),z.boolean()])),techArtwork:z.record(z.string(),z.union([z.number(),z.string()])).nullable()}).strict();
const snapshotBlocks=z.array(snapshotBlock).min(1).max(200);
export const studioAnimationRequestSchema=z.object({
 prompt:z.string().trim().min(1).max(4000),workspace:z.enum(['lovable','partners','ambassadors','tech-blog']),assetId:z.uuid(),title:z.string().max(100),width:z.number().min(100).max(4000),height:z.number().min(100).max(4000),availablePageSlots:z.number().int().min(0).max(63),
 selectedIds:z.array(id).max(200),blocks:snapshotBlocks,
 sequence:z.array(z.object({assetId:z.uuid(),title:z.string().max(100),blocks:snapshotBlocks,animation:z.object({enabled:z.boolean(),transition:z.enum(['instant','smart-animate']),...timing.shape}).partial().nullable()}).strict()).max(64).default([]),
 conversation:z.array(z.object({user:z.boolean(),text:z.string().max(8000)}).strict()).max(16),
}).strict();

export function requestsCanvasAnimation(prompt){
 const text=prompt.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 return /\b(animat\w*|anim[ée]r?|animer|motion|keyframes?|smart[ -]*animate|transition\w*)\b|\b(fais|faire|fait) bouger\b|\bfade[ -]?(in|out)\b/.test(text)&&! /\b(don't|do not|ne pas|sans) anim/.test(text);
}
const newBrief=prompt=>/\b(?:do not|don't|ne pas|sans) anim|\b(?:new|another|different|nouveau|nouvelle) (?:design|canvas|asset|poster|banner|affiche)|\b(?:make|create|open|cree|ouvre).{0,35}app studio|\b(?:forget|oublie|stop|cancel|annule)\b/i.test(prompt.normalize('NFD').replace(/[\u0300-\u036f]/g,''));
/** Follow the conversation until an explicit new task, even if a fallback reply intervened. */
export function isAnimationFollowUp(prompt,conversation=/** @type {Array<{user:boolean,text:string}>} */([])){
 if(newBrief(prompt))return false;
 const users=conversation.filter(message=>message.user).slice(-16);
 for(let i=users.length-1;i>=0;i--){if(newBrief(users[i].text))return false;if(requestsCanvasAnimation(users[i].text))return true;}
 return false;
}
export function routesToAnimation(prompt,conversation=/** @type {Array<{user:boolean,text:string}>} */([])){return requestsCanvasAnimation(prompt)||isAnimationFollowUp(prompt,conversation);}
export function requestedAnimationSteps(prompt){
 const added=prompt.match(/\b(?:add|append|ajoute[rz]?)\s+(\d+)\s+(?:assets?|slides?|canvases?|etapes?|étapes?)\b/i);
 if(added)return Number(added[1]);
 const total=prompt.match(/\b(?:in|en|sur)\s+(\d+)\s+(?:assets?|slides?|states?|états?|etats?|keyframes?|étapes?|etapes?)\b/i);
 return total?Math.max(0,Number(total[1])-1):undefined;
}
export function animationCanvasKey(asset){
 if(!asset)return '';
 const {messages,workspaceChats,workspaceActiveChatId,updatedAt,...canvas}=asset;return JSON.stringify(canvas);
}
export function validateStudioAnimationPlan(value,request){
 const plan=studioAnimationPlanSchema.parse(value),blocks=new Map(request.blocks.map(block=>[block.id,block]));
 if(request.selectedIds.some(id=>!blocks.has(id)))throw Error('The selected layers are no longer on this canvas.');
 if(plan.steps.length>request.availablePageSlots)throw Error('There is not enough room in this collection for the animation.');
 const count=requestedAnimationSteps(request.prompt);
 if(plan.steps.length&&count!==undefined&&plan.steps.length!==count)throw Error(`Create exactly ${count} additional animation assets.`);
 if(!plan.steps.length&&plan.initialChanges.length)throw Error('An initial pose needs at least one animation endpoint.');
 for(const changes of [plan.initialChanges,...plan.steps.map(step=>step.changes)]){
  const seen=new Set();
  for(const patch of changes){
   const block=blocks.get(patch.id),key=`${patch.id}:${patch.property}`;
   if(!block)throw Error('The animation refers to an unknown layer.');
   if(block.locked)throw Error('Unlock the target layer before animating it.');
   if(request.selectedIds.length&&!request.selectedIds.includes(patch.id))throw Error('Animate only the selected layers.');
   if(seen.has(key))throw Error('Each layer property can change only once per pose.');seen.add(key);
   const range=ranges[patch.property];
   if(range&&(typeof patch.value!=='number'||!Number.isFinite(patch.value)||patch.value<range[0]||patch.value>range[1]))throw Error(`Invalid animation value for ${patch.property}.`);
   if(['fill','color','tech.color'].includes(patch.property)&&!/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(String(patch.value)))throw Error('Use a hex color for animation.');
   if(patch.property==='blendMode'&&!blendModes.includes(patch.value))throw Error('Unknown blend mode.');
   if(patch.property==='textAnimation'&&block.kind!=='text')throw Error('Only text supports text animation.');
   if(patch.property==='fontSize'&&block.kind!=='text')throw Error('Only text has a font size.');
   if(patch.property.startsWith('tech.')&&!block.techArtwork)throw Error('This layer is not a native Tech construction.');
   if(patch.property.startsWith('tech.')&&block.techArtwork&&((block.techArtwork.kind==='grid'&&!['tech.spacing','tech.stroke','tech.opacity','tech.color'].includes(patch.property))||(block.techArtwork.kind==='curves'&&patch.property==='tech.spacing')))throw Error('That parameter does not belong to this construction.');
   if(patch.property==='tech.color'&&!/^#[0-9a-f]{6}$/i.test(String(patch.value)))throw Error('Construction ink needs a six-digit hex color.');
   if(patch.property==='tech.count'&&!Number.isInteger(patch.value))throw Error('Construction count must be an integer.');
  }
 }
 return plan;
}
const blocksOf=editor=>editor.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat()));
const scalarRecord=value=>Object.fromEntries(Object.entries(value??{}).filter(([key,v])=>key!=='backgroundImage'&&['string','number','boolean'].includes(typeof v)));
export function animationSnapshotBlocks(editor){
 const lockedSections=new Set(editor.pages.flatMap(page=>page.sections.filter(section=>section.locked).flatMap(section=>section.columns.flat().map(block=>block.id))));
 return blocksOf(editor).map(block=>{
  const appearance=scalarRecord(block.editor?.appearance),frame=scalarRecord(block.editor);
  // Give the planner one unambiguous whole-object opacity, matching the renderer.
  frame.opacity=typeof appearance.opacity==='number'?appearance.opacity/100:frame.opacity??1;
  delete appearance.opacity;
  return {id:block.id,kind:block.kind,name:block.value?.alt??block.name??block.icon??block.shape??block.kind,text:block.kind==='text'?block.value.runs.map(run=>run.text).join(''):'',locked:!!block.editor?.locked||lockedSections.has(block.id),groupId:block.editor?.groupId??null,frame,appearance,techArtwork:block.techArtwork??(block.value?.src==='/tech-blog/cover-grid.svg'?gridDefaults:block.value?.src==='/tech-blog/cover-curves.svg'?curveDefaults:null)};
 });
}
export function studioAnimationRequest(asset,{prompt,workspace,selectedIds=/** @type {string[]} */([]),availablePageSlots,sequence=/** @type {any[]} */([])}){
 return studioAnimationRequestSchema.parse({prompt,workspace,assetId:asset.id,title:asset.title,...asset.dimensions,availablePageSlots,selectedIds,blocks:animationSnapshotBlocks(asset.editor),
  sequence:sequence.map(page=>({assetId:page.id,title:page.title,blocks:animationSnapshotBlocks(page.editor),animation:page.animation??null})),
  conversation:(asset.messages??[]).slice(-16).map(message=>({user:message.user,text:message.text.slice(0,8000)})),
 });
}
export function validateStudioAnimationRevision(value,request){
 const plan=studioAnimationRevisionSchema.parse(value),seen=new Set();
 for(const update of plan.updates){
  const pose=request.sequence.find(page=>page.assetId===update.assetId);
  if(!pose)throw Error('Revise only assets in the current animation.');
  if(seen.has(update.assetId))throw Error('Each animation asset can be updated only once.');seen.add(update.assetId);
  if(!update.changes.length&&!update.transition)throw Error('Each update needs a changed property or transition.');
  if(update.transition&&pose===request.sequence.at(-1))throw Error('The last pose has no outgoing transition in this animation.');
  if(update.changes.length)validateStudioAnimationPlan({summary:plan.summary,initialChanges:update.changes,steps:[{title:'Validate pose',changes:update.changes,transition:{durationMs:600,delayMs:0,easing:'ease-out',curve:[0,0,.2,1],bounce:25,velocity:0}}]},{...request,blocks:pose.blocks,prompt:'Animate',availablePageSlots:63});
 }
 return plan;
}
export function compileStudioAnimationRevision(pages,value,request,{now=Date.now()}={}){
 const plan=validateStudioAnimationRevision(value,request),updates=new Map(plan.updates.map(update=>[update.assetId,update]));
 return pages.map(page=>{
  const update=updates.get(page.id);if(!update)return page;
  const pose=request.sequence.find(item=>item.assetId===page.id);
  return {...structuredClone(page),editor:applyPose(page.editor,update.changes,{...request,blocks:pose.blocks}),...(update.transition?{animation:{enabled:true,transition:'smart-animate',...update.transition}}:{}),layouts:undefined,updatedAt:now};
 });
}
function applyPose(editor,changes,request){
 const next=structuredClone(editor),blocks=new Map(blocksOf(next).map(block=>[block.id,block]));
 for(const {id,property,value} of changes){
  const block=blocks.get(id),frame=block.editor??={};
  if(property.startsWith('tech.')){block.techArtwork={...(block.techArtwork??request.blocks.find(item=>item.id===id).techArtwork),[property.slice(5)]:value};continue;}
  if(['fill','color','blendMode','blur','textAnimation','fontSize','cornerRadius','lineWidth'].includes(property)){
   const appearance=frame.appearance??={};
   if(property==='fontSize'){appearance.fontSize=value;block.value.size=value;}
   else if(['color','fill'].includes(property)&&block.kind==='text')block.value.color=value;
   else appearance[property==='cornerRadius'?'radius':property==='color'?'fill':property]=value;
  }else if(property==='opacity'){
   frame.opacity=value;
   if(frame.appearance?.opacity!==undefined)frame.appearance.opacity=value*100;
  }else frame[property==='width'?'widthPx':property]=value;
 }
 return next;
}
/** Each pose reuses the whole editable document. Only validated properties change. */
export function compileStudioAnimation(base,value,request,{freshId=()=>crypto.randomUUID(),now=Date.now()}={}){
 const plan=validateStudioAnimationPlan(value,request);if(!plan.steps.length)return [];
 const source={...structuredClone(base),editor:applyPose(base.editor,plan.initialChanges,request),layouts:undefined,updatedAt:now},pages=[source];
 for(const [i,step] of plan.steps.entries()){
  const previous=pages.at(-1);previous.animation={enabled:true,transition:'smart-animate',...step.transition};
  pages.push({...structuredClone(base),id:freshId(),title:step.title,editor:applyPose(previous.editor,step.changes,request),series:undefined,layouts:undefined,updatedAt:now+i+1});
 }
 return pages;
}
