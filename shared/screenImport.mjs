import {z} from 'zod';

const color=z.string().regex(/^(?:#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?|transparent)$/);
const id=z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/);
export const screenIcons=['arrow-right','arrow-up','check','chevron-down','chevron-right','circle','code','download','external-link','eye','file-text','globe','image','layers','layout-grid','lock','mail','menu','message-square','minus','monitor','more-horizontal','plus','search','settings','shield','star','upload','user','users','x'];
const rect={x:z.number().min(0).max(100),y:z.number().min(0).max(100),width:z.number().positive().max(100),height:z.number().positive().max(100)};
export const screenLayerSchema=z.object({
 id:z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/),type:z.enum(['text','shape','icon','crop','lovable-logo','lovable-heart']),...rect,
 text:z.string().max(2000).nullable(),fontSize:z.number().min(.3).max(30).nullable(),weight:z.union([z.literal(600),z.literal(700)]).nullable(),
 color:color.nullable(),fill:color.nullable(),radius:z.number().min(0).max(10).nullable(),align:z.enum(['left','center','right']).nullable(),
 icon:z.enum(screenIcons).nullable(),crop:z.object(rect).strict().nullable(),
}).strict();
export const screenImportPlanSchema=z.object({summary:z.string().min(1).max(1500),layers:z.array(screenLayerSchema).min(2).max(60)}).strict();
const patch=z.object({id,text:z.string().max(2000).nullable(),color:color.nullable(),fill:color.nullable(),fontSize:z.number().min(1).max(500).nullable(),x:z.number().min(-2000).max(4000).nullable(),y:z.number().min(-2000).max(4000).nullable()}).strict();
export const screenEditPlanSchema=z.object({summary:z.string().min(1).max(1500),edits:z.array(patch).max(60),
 motions:z.array(z.object({id,property:z.enum(['x','y','scale','opacity','rotation']),from:z.number().min(-1000).max(1000),to:z.number().min(-1000).max(1000),at:z.number().min(0).max(30),duration:z.number().min(.1).max(15)}).strict()).max(16),
 clearMotion:z.boolean(),
}).strict();
export const screenImportRequestSchema=z.object({mode:z.literal('import'),prompt:z.string().max(4000),image:z.string().max(4_000_000).regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/),width:z.number().int().positive().max(20000),height:z.number().int().positive().max(20000)}).strict();
export const screenEditRequestSchema=z.object({mode:z.literal('edit'),prompt:z.string().min(1).max(4000),selectedIds:z.array(id).max(320),
 blocks:z.array(z.object({id,kind:z.enum(['text','shape','image']),text:z.string().max(8000).nullable(),x:z.number(),y:z.number(),width:z.number(),height:z.number(),fontSize:z.number().nullable(),color:z.string().nullable(),fill:z.string().nullable(),locked:z.boolean()}).strict()).max(320),
}).strict();
export const screenRequestSchema=z.discriminatedUnion('mode',[screenImportRequestSchema,screenEditRequestSchema]);
export function validateScreenPlan(value,request){
 if(request.mode==='import'){
  const plan=screenImportPlanSchema.parse(value),ids=new Set();
  if(!plan.layers.some(layer=>layer.type==='text'&&layer.text?.trim()))throw Error('Rebuild the readable interface as native text, not an image.');
  for(const layer of plan.layers){
   if(ids.has(layer.id))throw Error('Each layer needs a unique ID.');ids.add(layer.id);
   if(layer.x+layer.width>100.1||layer.y+layer.height>100.1)throw Error('Keep every interface layer inside the screenshot bounds.');
   if(layer.type==='text'&&(!layer.text||!layer.fontSize||!layer.color))throw Error('Text layers need readable text, size and color.');
   if(layer.type==='icon'&&!layer.icon)throw Error('Use a supplied icon name.');
   if(layer.type==='crop'){
    const crop=layer.crop;
    if(!crop||crop.x+crop.width>100.1||crop.y+crop.height>100.1||crop.width*crop.height>5000)throw Error('Crop only an illustration, photo or original logo. Never flatten the interface.');
   }
  }
  return plan;
 }
 const plan=screenEditPlanSchema.parse(value),allowed=new Set(request.blocks.filter(b=>!b.locked&&(!request.selectedIds.length||request.selectedIds.includes(b.id))).map(b=>b.id));
 for(const change of [...plan.edits,...plan.motions])if(!allowed.has(change.id))throw Error('Only change editable layers within the requested selection.');
 for(const change of plan.edits){
  const block=request.blocks.find(b=>b.id===change.id);
  if((change.text!==null||change.fontSize!==null)&&block.kind!=='text')throw Error('Only text layers can receive copy or font edits.');
  if(change.fill!==null&&block.kind!=='shape')throw Error('Fill edits apply only to shapes.');
  if(change.color!==null&&block.kind==='image')throw Error('Keep original image artwork unchanged.');
 }
 for(const motion of plan.motions){if(motion.property==='scale'&&(Math.min(motion.from,motion.to)<.1||Math.max(motion.from,motion.to)>4))throw Error('Keep animated scale between 0.1 and 4.');if(motion.property==='opacity'&&(Math.min(motion.from,motion.to)<0||Math.max(motion.from,motion.to)>1))throw Error('Opacity is between 0 and 1.');}
 if(plan.clearMotion&&request.selectedIds.length)throw Error('Do not remove motion outside a selected layer.');
 return plan;
}
