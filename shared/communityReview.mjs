import {z} from 'zod';
import {CommunityDesignRuleError} from './communityDesignRules.mjs';

const sourceId=z.string().min(1).max(80).regex(/^[a-zA-Z0-9-]+$/);
export const reviewSchema=z.object({
 sourceId,
 verdict:z.enum(['off-brand','needs-refinement','on-brand','reference-only']),
 diagnosis:z.string().min(1).max(500),
 issues:z.array(z.object({area:z.enum(['identity','typography','layout','imagery','color','content']),problem:z.string().min(1).max(300),correction:z.string().min(1).max(300)}).strict()).max(8),
 keep:z.array(z.string().min(1).max(200)).max(8),
 remove:z.array(z.string().min(1).max(200)).max(8),
 retainedVisuals:z.array(z.object({elementId:sourceId,sourceId,kind:z.enum(['photo','illustration','partner-logo']),reason:z.string().min(1).max(300)}).strict()).max(8),
 uncertainties:z.array(z.string().min(1).max(250)).max(6),
}).strict();
export const imageCropSchema=z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1),width:z.number().positive().max(1),height:z.number().positive().max(1)}).strict();
const reject=message=>{throw new CommunityDesignRuleError(message);};

export function validateCommunityReview(plan,request){
 const sources=new Map(request.sources.filter(source=>source.kind==='image').map(source=>[source.id,source]));
 if(request.preview)sources.set('current-canvas',{id:'current-canvas'});
 const elements=[...plan.designs.flatMap(design=>design.elements),...plan.edits];
 if(new Set(plan.reviews.map(review=>review.sourceId)).size!==plan.reviews.length)reject('Review each source once.');
 if(plan.designs.length&&request.sources.some(source=>source.kind==='image'&&!plan.reviews.some(review=>review.sourceId===source.id)))reject('Inspect each attached image before designing: state what to keep, what to correct, and why.');
 for(const review of plan.reviews){
  if(!sources.has(review.sourceId))reject('Review an actual attached image or the supplied current-canvas preview.');
  if(['off-brand','needs-refinement'].includes(review.verdict)&&!review.issues.length)reject('Explain the specific brand problems and their corrections.');
  for(const retained of review.retainedVisuals){
   const matching=elements.filter(element=>element.id===retained.elementId&&element.kind==='image'&&element.sourceId===retained.sourceId);
   if(!matching.length)reject('A retained visual must appear as an editable image layer in the proposal.');
  }
 }
 for(const element of elements.filter(element=>element.kind==='image')){
  const crop=element.crop;
  if(crop&&(crop.x+crop.width>1.00001||crop.y+crop.height>1.00001))reject('Keep the retained image crop inside the source, using normalized 0–1 coordinates.');
  const review=plan.reviews.find(review=>review.sourceId===element.sourceId||review.sourceId==='current-canvas'&&request.blocks.some(block=>block.id===element.sourceId));
  if(review){
   if(!review.retainedVisuals.some(visual=>visual.elementId===element.id&&visual.sourceId===element.sourceId))reject('Explain why each retained image is useful; do not reinsert an unreviewed poster.');
   if(['off-brand','needs-refinement'].includes(review.verdict)&&(!crop||crop.width*crop.height>.8))reject('Do not reuse the whole off-brand artwork as a background. Isolate a clean visual with a crop, or omit it and rebuild with native layers.');
  }
 }
 for(const design of plan.designs){
  const images=design.elements.filter(element=>element.kind==='image');
  if(design.visualTreatment==='retained-visual'&&!images.some(image=>plan.reviews.some(review=>review.retainedVisuals.some(visual=>visual.elementId===image.id&&visual.sourceId===image.sourceId&&visual.kind!=='partner-logo'))))reject('A retained-visual composition needs a reviewed photograph or illustration. A partner logo is not the main illustration.');
  if(!design.elements.some(element=>element.kind==='text'&&element.text.trim().length>2&&!/^lovable(?:\s+community)?[.!]?$/i.test(element.text.trim())))reject('Build a complete communication asset with meaningful content, not an isolated logo.');
  if(design.elements.some(element=>element.kind==='text'&&/^lovable(?:\s+community)?[.!]?$/i.test(element.text.trim())))reject('Use the original full Lovable Community lockup; never retype or substitute a standalone Lovable wordmark.');
  if(plan.reviews.length){
   if(design.elements.some(element=>element.kind==='reuse'))reject('For a reviewed redesign, rebuild text and identity as native layers and reference retained images explicitly.');
   const foreground=design.elements.filter(element=>['text','qr'].includes(element.kind));
   for(let i=0;i<foreground.length;i++)for(const other of foreground.slice(i+1)){
    const a=foreground[i].frame,b=other.frame;
    if(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>1)reject(`Separate the foreground elements ${foreground[i].id} and ${other.id}; their frames overlap.`);
   }
  }
 }
 return plan;
}

/** Keep the diagnosis in the existing chat, next to the actual editable proposal. */
export function communityPlanReplies(plan,request){
 if(!plan.reviews.length)return [plan.summary];
 const french=/\b(?:analyse|corrige|refais|garde|charte|notre|cette|ces|visuel|affiche|conforme|français|francais)\b/i.test(request.prompt);
 const labels=french?{keep:'À conserver',remove:'À retirer',uncertain:'À confirmer'}:{keep:'Keep',remove:'Remove',uncertain:'Confirm'};
 const sentence=items=>{const text=items.join('; ');return /[.!?…]$/.test(text)?text:`${text}.`;};
 const verdicts=french?{'off-brand':'Hors charte','needs-refinement':'À ajuster','on-brand':'Conforme','reference-only':'Visuel de référence'}:{'off-brand':'Off brand','needs-refinement':'Needs refinement','on-brand':'On brand','reference-only':'Reference visual'};
 const reviews=plan.reviews.map(review=>[
  `${request.sources.find(source=>source.id===review.sourceId)?.name??(french?'Canvas actuel':'Current canvas')} — ${verdicts[review.verdict]}. ${review.diagnosis}`,
  ...review.issues.map(issue=>`• ${issue.problem} → ${issue.correction}`),
  ...(review.keep.length?[`${labels.keep} : ${sentence(review.keep)}`]:[]),
  ...(review.remove.length?[`${labels.remove} : ${sentence(review.remove)}`]:[]),
  ...(review.uncertainties.length?[`${labels.uncertain} : ${sentence(review.uncertainties)}`]:[]),
 ].join('\n'));
 // Saved chat messages have a 4000-character limit; preserve every finding across messages.
 return [...reviews,plan.summary].flatMap(text=>{const chunks=[];let chunk='';for(const line of text.split('\n')){if(chunk.length+line.length+1>4000){chunks.push(chunk);chunk='';}chunk+=(chunk?'\n':'')+line;}if(chunk)chunks.push(chunk);return chunks;});
}
