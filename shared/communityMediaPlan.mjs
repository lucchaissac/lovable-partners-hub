import {z} from 'zod';
import {chatPlanSchema,validateChatPlan} from './communityChat.mjs';
import {imageCropSchema} from './communityReview.mjs';
import {communityMediaById} from './communityMediaLibrary.mjs';

export const mediaRequestSchema=z.object({
 id:z.string().regex(/^media-[a-z0-9-]{1,60}$/),
 operation:z.enum(['generate','edit','glyph']),
 prompt:z.string().min(1).max(3000),
 sourceId:z.string().max(80).nullable(),crop:imageCropSchema.nullable(),
 background:z.enum(['transparent','opaque']),color:z.enum(['#1b1b1b','#ffffff','#f7f4ed']),
}).strict();
export const mediaPlanSchema=z.object({plan:chatPlanSchema,mediaRequests:z.array(mediaRequestSchema).max(2)}).strict();
export const generatedMediaSchema=z.array(z.object({id:z.string().regex(/^media-[a-z0-9-]{1,60}$/),name:z.string().min(1).max(160),operation:z.enum(['generate','edit','glyph']),image:z.string().max(1500000).regex(/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/)}).strict()).max(2);
export function requestWithMedia(request,media){return {...request,sources:[...request.sources,...media.map(item=>({id:item.id,name:item.name??item.prompt.slice(0,100),kind:'image',image:item.image,prepared:true,preparedKind:item.operation==='glyph'?'partner-logo':'illustration'}))]};}
export function validateMediaPlan(value,request,validate=validateChatPlan){
 const draft=mediaPlanSchema.parse(value),ids=new Set();
 const elements=[...draft.plan.designs.flatMap(d=>d.elements),...draft.plan.edits];
 for(const media of draft.mediaRequests){
  if(ids.has(media.id))throw Error('Duplicate generated image identifier.');ids.add(media.id);
  if(!elements.some(e=>e.kind==='image'&&e.sourceId===media.id))throw Error('Every prepared image must be placed on the editable canvas.');
  if(media.operation==='generate'&&media.sourceId!==null)throw Error('Use edit for an image based on an existing visual.');
  if(media.operation!=='generate'&&!request.sources.some(s=>s.kind==='image'&&s.id===media.sourceId)&&!request.canvasImages?.some(s=>s.id===media.sourceId)&&!communityMediaById.has(media.sourceId))throw Error('Attach or select the actual image to edit.');
  if(media.crop&&(media.crop.x+media.crop.width>1.00001||media.crop.y+media.crop.height>1.00001))throw Error('Keep the source crop inside the image.');
  if(media.operation!=='glyph'&&media.sourceId&&communityMediaById.get(media.sourceId)?.kind==='partner-logo')throw Error('Use glyph to preserve the exact partner mark.');
 }
 const augmented=requestWithMedia(request,draft.mediaRequests);
 return {...draft,plan:validate(draft.plan,augmented)};
}
