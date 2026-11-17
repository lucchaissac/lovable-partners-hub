import {z} from 'zod';
import {communityReferenceIds,communityWorkingCanvasLimit,validateCommunityDesignRules} from './communityDesignRules.mjs';
import {resolveBadgeBatch} from './communityRoster.mjs';
import {reviewSchema,imageCropSchema,validateCommunityReview} from './communityReview.mjs';
import {communityMediaById} from './communityMediaLibrary.mjs';

const id=z.string().min(1).max(80).regex(/^[a-zA-Z0-9-]+$/);
const color=z.string().regex(/^(#[0-9a-fA-F]{6}|transparent)$/);
const frame=z.object({x:z.number().min(-4000).max(4000),y:z.number().min(-4000).max(4000),width:z.number().min(1).max(4000),height:z.number().min(1).max(4000),rotation:z.number().min(-360).max(360),opacity:z.number().min(0).max(1)}).strict();
export const chatIcons=['arrow-right','arrow-up-right','check','sparkles','calendar','map-pin','clock','users','globe','plus','code','laptop','lightbulb','message-circle','star','rocket','zap','coffee','link','play','quote'];
export const chatElementSchema=z.union([
 z.object({id,kind:z.literal('text'),frame,text:z.string().max(3000),fontSize:z.number().min(6).max(600),weight:z.union([z.literal(600),z.literal(700)]),align:z.enum(['left','center','right']),color,lineHeight:z.number().min(85).max(180)}).strict(),
 z.object({id,kind:z.literal('shape'),frame,shape:z.enum(['rectangle','circle','triangle','line']),fill:color,stroke:color,strokeWidth:z.number().min(0).max(24),radius:z.number().min(0).max(1500)}).strict(),
 z.object({id,kind:z.literal('icon'),frame,name:z.enum(chatIcons),color,filled:z.boolean()}).strict(),
 z.object({id,kind:z.literal('brand'),frame,asset:z.enum(['community-logo','globe','gradient','community-photo']),color:z.enum(['light','dark']),city:z.string().max(45)}).strict(),
 z.object({id,kind:z.literal('qr'),frame,url:z.string().max(300).url().regex(/^https?:\/\//)}).strict(),
 z.object({id,kind:z.literal('image'),frame,sourceId:id,fit:z.enum(['cover','contain']),radius:z.number().min(0).max(1500),crop:imageCropSchema.nullable(),placement:z.enum(['inset','background']),alt:z.string().min(1).max(200)}).strict(),
 z.object({id,kind:z.literal('reuse'),sourceId:id,frame:frame.nullable()}).strict(),
]);
export const chatPlanSchema=z.object({
 summary:z.string().min(1).max(1200),
 replaceCurrent:z.boolean().default(false),
 reviews:z.array(reviewSchema).max(7),
 badgeBatch:z.object({sourceId:id.nullable(),people:z.array(z.object({name:z.string().min(1).max(48),role:z.string().max(55),city:z.string().max(45)}).strict()).max(64),city:z.string().max(45),role:z.string().max(55)}).strict().nullable(),
 designs:z.array(z.object({title:z.string().min(1).max(100),reference:z.enum(communityReferenceIds),visualTreatment:z.enum(['brand-scene','retained-visual','typographic']),width:z.number().int().min(200).max(communityWorkingCanvasLimit),height:z.number().int().min(200).max(communityWorkingCanvasLimit),background:z.enum(['ink','white','beige']),elements:z.array(chatElementSchema).min(1).max(60)}).strict()).max(6),
 edits:z.array(chatElementSchema).max(80),removeIds:z.array(id).max(80),
}).strict();
export const chatPlanJSONSchema=z.toJSONSchema(chatPlanSchema);

const snapshotBlock=z.object({id,kind:z.string().max(30),frame:z.record(z.string(),z.unknown()).optional(),text:z.string().max(8000).optional(),style:z.record(z.string(),z.unknown()).optional(),asset:z.string().max(120).optional(),alt:z.string().max(500).optional()}).strict();
export const chatRequestSchema=z.object({
 prompt:z.string().trim().min(1).max(4000),title:z.string().max(100),width:z.number().min(100).max(4000),height:z.number().min(100).max(4000),
 availablePageSlots:z.number().int().min(0).max(64).optional(),
 startingTemplate:z.boolean().optional(),
 blocks:z.array(snapshotBlock).max(200),context:z.string().max(6000).optional(),
 conversation:z.array(z.object({user:z.boolean(),text:z.string().max(8000)}).strict()).max(16),
 sources:z.array(z.object({id,name:z.string().max(160),kind:z.enum(['image','text','link']),text:z.string().max(20000).optional(),image:z.string().max(400000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).optional()}).strict()).max(6),
 preview:z.string().max(2000000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).optional(),
}).strict();
export function validateChatPlan(value,request){
 const plan=chatPlanSchema.parse(value);
 if(request.startingTemplate&&(plan.designs.length||plan.badgeBatch))plan.replaceCurrent=true;
 if(plan.badgeBatch&&(plan.designs.length||plan.edits.length||plan.removeIds.length))throw Error('Create a badge batch separately from other designs or edits.');
 if(plan.designs.length&&(plan.edits.length||plan.removeIds.length))throw Error('Create designs or edit the current canvas, not both.');
 if(plan.replaceCurrent&&!plan.designs.length&&!plan.badgeBatch)throw Error('Replacing the current asset needs a complete design.');
 if(plan.replaceCurrent&&request.blocks.some(block=>block.frame?.locked))throw Error('Unlock the current asset before replacing its composition.');
 plan.badgeBatch=resolveBadgeBatch(plan.badgeBatch,{...request,availablePageSlots:(request.availablePageSlots??64)+(plan.replaceCurrent?1:0)});
 if(plan.designs.length-(plan.replaceCurrent?1:0)>(request.availablePageSlots??64))throw Error('This canvas is full. Start another canvas or remove an asset before generating more.');
 let selected=[];try{if(request.context?.startsWith('HTML_SELECTION '))selected=JSON.parse(request.context.slice(15)).blockIds??[];}catch{}
 if(plan.replaceCurrent&&selected.length)throw Error('Clear the element selection before replacing the entire asset.');
 if(!plan.designs.length&&selected.length){
  const changed=[...plan.edits.filter(e=>request.blocks.some(b=>b.id===e.id)).map(e=>e.id),...plan.removeIds];
  if(changed.some(id=>!selected.includes(id)))throw Error('The edit changed an unselected element. Please retry.');
 }
 const known=new Set([...request.blocks.map(b=>b.id),...request.sources.filter(s=>s.kind==='image').map(s=>s.id)]);
 for(const elements of [...plan.designs.map(d=>d.elements),plan.edits]){
  if(new Set(elements.map(e=>e.id)).size!==elements.length)throw Error('Duplicate element IDs.');
  for(const e of elements){if((e.kind==='reuse'||e.kind==='image')&&!known.has(e.sourceId)&&!(e.kind==='image'&&communityMediaById.has(e.sourceId)))throw Error('Unknown image or canvas element.');}
  for(const e of elements.filter(e=>e.kind==='qr')){
   const supplied=[request.prompt,...request.sources.map(s=>s.text??''),...request.conversation.filter(m=>m.user).map(m=>m.text)].join('\n');
   if(!supplied.includes(e.url))throw Error('Use the exact link supplied in the message for the QR code.');
   if(Math.abs(e.frame.width-e.frame.height)>.1)throw Error('Keep the QR code square.');
  }
 }
 if(plan.removeIds.some(id=>!request.blocks.some(b=>b.id===id)))throw Error('Cannot remove an unknown element.');
 return validateCommunityDesignRules(validateCommunityReview(plan,request),request);
}
