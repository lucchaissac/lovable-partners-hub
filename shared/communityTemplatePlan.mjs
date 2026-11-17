import {z} from 'zod';
import {chatPlanSchema,chatElementSchema,validateChatPlanContent} from './communityChat.mjs';
import {reviewSchema,imageCropSchema} from './communityReview.mjs';
import {mediaRequestSchema,validateMediaPlan} from './communityMediaPlan.mjs';
import {communityTemplateGeometry,cameraBoldAdvances} from './communityTemplateGeometry.mjs';
import {communityMediaById,communityMediaLayouts} from './communityMediaLibrary.mjs';

const id=z.string().min(1).max(80).regex(/^[a-zA-Z0-9-]+$/);
const picture=z.object({sourceId:id,crop:imageCropSchema.nullable()}).strict();
export const communityTemplateIds=Object.keys(communityTemplateGeometry);
export const templatePlanSchema=z.object({
 summary:z.string().min(1).max(1200),replaceCurrent:z.boolean(),reviews:z.array(reviewSchema).max(7),badgeBatch:chatPlanSchema.shape.badgeBatch,
 designs:z.array(z.object({title:z.string().min(1).max(100),template:z.enum(communityTemplateIds),width:z.number().int().min(200).max(2560).nullable(),height:z.number().int().min(200).max(2560).nullable(),background:z.enum(['ink','white','beige']),
  fields:z.array(z.object({slot:z.string().min(1).max(40),text:z.string().max(500)}).strict()).max(20),
  image:picture.nullable(),partners:z.array(picture).max(2),headlineFont:z.enum(['Camera Plain','Bodoni Moda','Pixelify Sans','Anton']).nullable(),
 }).strict()).max(6),
 changes:z.array(z.object({id,text:z.string().max(3000).nullable(),sourceId:id.nullable(),fontSize:z.number().min(6).max(600).nullable(),color:z.enum(['#1b1b1b','#f7f4ed','#ffffff']).nullable(),dx:z.number().min(-2560).max(2560).nullable(),dy:z.number().min(-2560).max(2560).nullable(),rotation:z.number().min(-360).max(360).nullable()}).strict()).max(30),
 additions:z.array(chatElementSchema).max(20),removeIds:z.array(id).max(30),mediaRequests:z.array(mediaRequestSchema).max(2),
}).strict();
export const templateCatalog=Object.entries(communityTemplateGeometry).map(([id,t])=>({id,width:t.width,height:t.height,slots:t.layers.filter(l=>l.kind==='text').map(l=>l.key)}));
const sentence=text=>/[a-zà-ÿ]/.test(text)||!/[A-Z]/.test(text)?text:text.charAt(0)+text.slice(1).toLowerCase();
const frame=(l,scale=1)=>({x:l.x*scale,y:l.y*scale,width:l.w*scale,height:Math.max(1,l.h*scale),rotation:l.rotation??0,opacity:1});
function wrap(text,width,size){
 const measure=t=>Array.from(t).reduce((n,c)=>n+(cameraBoldAdvances[c]??.52)*size,0);
 return text.split('\n').flatMap(p=>{const lines=[];let line='';for(const word of p.split(/\s+/)){const next=line?`${line} ${word}`:word;if(line&&measure(next)>width){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}).join('\n');
}
function scaledLayers(template,width,height){
 const t=communityTemplateGeometry[template],s=width/t.width,delta=height-t.height*s;
 return t.layers.map(source=>{const l={...source,x:source.x*s,y:source.y*s,w:source.w*s,h:source.h*s,size:source.size*s,leading:source.leading*s};
  // Resize the working frame, never stretch identities, photos or the sphere.
  if(delta&&/^(footer|eventFooter|access|partner-)/.test(l.key))l.y+=delta;
  return l;
 });
}
function imageElement(id,pic,l,photo=false){return {id,kind:'image',frame:frame(l),sourceId:pic.sourceId,fit:photo?'cover':'contain',radius:l.kind==='portrait'?l.w/2:0,crop:pic.crop,placement:photo?'background':'inset',alt:communityMediaById.get(pic.sourceId)?.name??'Prepared Community visual'};}
function designFromTemplate(spec,index){
 const t=communityTemplateGeometry[spec.template],isPrint=['banner','poster'].includes(spec.template);
 const width=spec.width??(isPrint?Math.round(t.width*1000/Math.max(t.width,t.height)):t.width),height=spec.height??(isPrint?Math.round(t.height*1000/Math.max(t.width,t.height)):t.height);
 const scale=width/t.width,fields=Object.fromEntries(spec.fields.map(f=>[f.slot,sentence(f.text.trim())]));
 const dark=spec.background==='ink',ink=dark?'#f7f4ed':'#1b1b1b',elements=[];
 const image=spec.image,photo=image&&communityMediaById.get(image.sourceId)?.category==='Photos'||spec.template==='editorial-photo';
 let visualPlaced=false;
 const layers=scaledLayers(spec.template,width,height);
 for(const l of layers){
  const elementId=`d${index}-${l.key}`;
  if(l.key==='logo'){elements.push({id:elementId,kind:'brand',frame:frame(l),asset:'community-logo',color:dark?'light':'dark',city:fields.city??''});continue;}
  if(l.kind==='text'){
   let value=fields[l.key];
   if(value==null&&l.key==='headline')value=fields.title;
   if(value==null&&l.key==='event-details')value=[fields.date,fields.venue].filter(Boolean).join(' · ');
   if(value==null&&l.key==='intro')value=fields.details;
   if(value==null&&l.key==='eventFooter')value=fields.footer;
   if(!value)continue;
   const headline=['title','headline','name'].includes(l.key),family=headline?(spec.headlineFont??'Camera Plain'):'Camera Plain';
   elements.push({id:elementId,kind:'text',frame:frame(l),text:family==='Camera Plain'?wrap(value,l.w,l.size):value,fontFamily:family,fontSize:l.size,letterSpacing:(l.tracking??0)*l.size,weight:family==='Anton'?400:l.weight==='bold'?700:600,align:['left','center','right'].includes(l.align)?l.align:'left',color:ink,lineHeight:l.leading/l.size*100});continue;
  }
  if(l.kind==='qr'){if(fields.url)elements.push({id:elementId,kind:'qr',frame:frame(l),url:fields.url});continue;}
  if(l.key.startsWith('partner-')){const pic=spec.partners[Number(l.key.slice(8))];if(pic)elements.push(imageElement(elementId,pic,l));continue;}
  if(l.key==='visual'||l.kind==='portrait'){
   if(image&&!visualPlaced){elements.push(imageElement(`d${index}-visual`,image,l,!!photo));visualPlaced=true;}continue;
  }
  if(['globe','glow'].includes(l.kind)){
   if(image&&!layers.some(layer=>layer.kind==='portrait')){if(!visualPlaced){const area=photo?{x:0,y:0,w:width,h:height}:{x:width*.42,y:height*.45,w:width*.9,h:width*.9};elements.unshift(imageElement(`d${index}-visual`,image,area,!!photo));visualPlaced=true;}continue;}
   elements.push({id:elementId,kind:'brand',frame:frame(l),asset:l.kind==='glow'?'gradient':'globe',color:dark?'light':'dark',city:fields.city??'Paris'});
  }
 }
 if(image&&!visualPlaced)throw Error('Choose a composition with an image slot.');
 if(spec.template==='event-square'&&fields.details){elements.push({id:`d${index}-details`,kind:'text',frame:frame({x:43.2*scale,y:760*scale,w:650*scale,h:115*scale}),text:fields.details,fontFamily:'Camera Plain',fontSize:40*scale,weight:700,align:'left',color:ink,lineHeight:115});}
 // Secondary marks use the prepared, transparent artwork at the approved optical size.
 if(spec.partners.length&&!layers.some(l=>l.key.startsWith('partner-'))){
  spec.partners.forEach((pic,i)=>elements.push(imageElement(`d${index}-partner-${i}`,pic,{x:43.2*scale,y:height-(200-i*100)*scale,w:200*scale,h:80*scale})));
 }
 if(!elements.some(e=>e.kind==='text'&&e.text.trim()))throw Error('Supply a headline or the event information.');
 return {title:sentence(spec.title),reference:t.reference,width,height,background:spec.background,visualTreatment:elements.some(e=>e.kind==='image'&&!e.id.includes('partner-'))?'retained-visual':elements.some(e=>e.kind==='brand'&&e.asset==='globe')?'brand-scene':'typographic',elements};
}
function changedElement(change,request){
 const old=request.blocks.find(b=>b.id===change.id);if(!old)throw Error('The selected element no longer exists.');
 if(old.frame?.locked)throw Error('Unlock the selected element before editing it.');
 const f=old.frame??{},a=f.appearance??{},pos={x:(f.x??0)+(change.dx??0),y:(f.y??0)+(change.dy??0),width:f.widthPx??f.width??100,height:f.height??100,rotation:change.rotation??f.rotation??0,opacity:f.opacity??1};
 if(old.kind==='text'){const size=change.fontSize??a.fontSize??old.style?.size??32;return {id:old.id,kind:'text',frame:pos,text:sentence(change.text??old.text??''),fontFamily:a.fontFamily??'Camera Plain',fontSize:size,letterSpacing:a.letterSpacing??0,weight:a.fontFamily==='Anton'?400:Math.max(600,a.fontWeight??700),align:old.style?.align??'left',color:change.color??old.style?.color??'#f7f4ed',lineHeight:a.lineHeight??110};}
 if(change.sourceId){if(old.asset==='community-logo')throw Error('The Community signature stays intact.');return {id:old.id,kind:'image',frame:pos,sourceId:change.sourceId,fit:a.imageFit??'contain',radius:a.radius??0,crop:null,placement:'inset',alt:old.alt??'Prepared image'};}
 return {id:old.id,kind:'reuse',sourceId:old.id,frame:pos};
}
export function compileTemplatePlan(value,request){
 const intent=templatePlanSchema.parse(value);
 // A prepared image can be referenced by its existing canvas-layer ID. Resolve
 // that alias to the canonical library asset, so review and layout use the master.
 const preparedPicture=picture=>{
  if(!picture||communityMediaById.has(picture.sourceId))return picture;
  const block=request.blocks.find(block=>block.id===picture.sourceId&&block.kind==='image');
  const prepared=block&&Array.from(communityMediaById.values()).find(media=>media.name===block.alt);
  return prepared?{...picture,sourceId:prepared.id}:picture;
 };
 intent.designs=intent.designs.map(spec=>({...spec,image:preparedPicture(spec.image),partners:spec.partners.map(preparedPicture)}));
 // Prepared full-bleed photographs determine contrast, regardless of the UI theme.
 intent.designs=intent.designs.map(spec=>{
  const source=spec.image?.sourceId;
  if(source==='library-flash-dark')return {...spec,background:'ink'};
  if(['library-flash-light','library-malaga-makers'].includes(source))return {...spec,background:spec.background==='beige'?'beige':'white'};
  return spec;
 });
 // A full replacement already removes the old layers. Models sometimes repeat
 // that removal explicitly; absorb it instead of rejecting an otherwise valid layout.
 if(intent.designs.length&&intent.replaceCurrent&&intent.removeIds.every(id=>request.blocks.some(block=>block.id===id)))intent.removeIds=[];
 if(intent.designs.length&&(intent.changes.length||intent.additions.length||intent.removeIds.length))throw Error('Create a composition or edit the current one, not both.');
 // An image edit already names its source. Bind its result to that same native
 // layer in code instead of making the model repeat this linkage correctly.
 if(!intent.designs.length)for(const media of intent.mediaRequests){
  if(media.operation!=='edit'||!request.blocks.some(b=>b.id===media.sourceId))continue;
  const change=intent.changes.find(c=>c.id===media.sourceId);
  if(change)change.sourceId=media.id;
  else intent.changes.push({id:media.sourceId,text:null,sourceId:media.id,fontSize:null,color:null,dx:null,dy:null,rotation:null});
 }
 if(!/\b(?:template|mod[eè]le|composition)\s+(?:Event|event-square)\b/i.test(request.prompt))intent.designs=intent.designs.map(spec=>{
  const approved=spec.image&&communityMediaLayouts[spec.image.sourceId];
  if(!approved||spec.template!=='event-square'||spec.width&&spec.height&&spec.width!==spec.height)return spec;
  const fields=spec.fields.map(field=>['eventFooter','footer'].includes(field.slot)&&['editorial-photo','editorial-collage','editorial-nature'].includes(approved)?{...field,slot:'subtitle'}:field);
  return {...spec,template:approved,fields};
 });
 const designs=intent.designs.map(designFromTemplate),edits=[...intent.changes.map(c=>changedElement(c,request)),...intent.additions];
 const elements=[...designs.flatMap(d=>d.elements),...edits];
 const reviews=intent.reviews.filter(review=>request.sources.some(s=>s.kind==='image'&&s.id===review.sourceId)||review.sourceId==='current-canvas'&&request.preview).map(review=>({...review,retainedVisuals:elements.filter(e=>e.kind==='image'&&e.sourceId===review.sourceId).map(e=>({elementId:e.id,sourceId:e.sourceId,kind:e.id.includes('partner-')?'partner-logo':'illustration',reason:'Retained useful visual from the supplied source.'}))}));
 const draft={plan:{summary:intent.summary,replaceCurrent:intent.replaceCurrent,reviews,badgeBatch:intent.badgeBatch,designs,edits,removeIds:intent.removeIds},mediaRequests:intent.mediaRequests};
 // Only this compiler may preserve approved manual geometry; arbitrary model coordinates
 // still use validateChatPlan's original gallery checks. Ownership/review checks stay on.
 return {...validateMediaPlan(draft,request,(plan,input)=>validateChatPlanContent(plan,input,{approvedLayout:true})),templatePlan:intent};
}
