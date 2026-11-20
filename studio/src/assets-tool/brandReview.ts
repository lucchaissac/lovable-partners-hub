import {z} from 'zod';
import {brandReviewRequestSchema,brandReviewPlanSchema,brandPartnerLibrary,compileBrandReview,requestedBrandDimensions,validateBrandReviewPlan} from '../../../shared/brandReview.mjs';
import {assetSchema,assetDimensions,makeNode,type AssetDocument} from './model';
import {nativeDocument} from './nativeDocument';
import {importPartnerLogo} from './partnerBadge';
import {logoInkBand} from './logoPixels';
import type {StudioSource} from '../studio/sources';

type Plan=z.infer<typeof brandReviewPlanSchema>;
export async function brandChatStatus(signal?:AbortSignal):Promise<{enabled:boolean;reason?:string}>{
 try{const response=await fetch('/api/brand-review',{signal});if(response.ok)return await response.json();}catch{}
 return {enabled:false,reason:'Brand review is unavailable. Open the local studio and retry.'};
}
async function decode(src:string,signal:AbortSignal){const image=new Image();image.src=src;await image.decode();signal.throwIfAborted();return image;}
async function preparedSource(src:string,signal:AbortSignal){
 const image=await decode(src,signal),scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);
 let encoded=canvas.toDataURL('image/webp',.9);
 for(const quality of [.8,.65,.5]){if(encoded.length<=900000)break;encoded=canvas.toDataURL('image/webp',quality);}
 if(encoded.length>900000)throw Error('This image is too detailed. Attach a smaller preview and retry.');
 return {image:encoded,width:image.naturalWidth,height:image.naturalHeight};
}
export async function prepareBrandReview(asset:AssetDocument,prompt:string,sources:StudioSource[],signal:AbortSignal,renderCurrent:()=>Promise<string>,context?:string){
 const sections=nativeDocument(asset).pages.flatMap(page=>page.sections),blocks=sections.flatMap(section=>section.columns.flat());
 let selected:string[]=[];try{if(context?.startsWith('HTML_SELECTION '))selected=JSON.parse(context.slice(15)).blockIds??[];}catch{}
 if(selected.length&&!(blocks.length===1&&blocks[0].kind==='image'))throw Error('Clear the layer selection to rebuild the complete asset with chat. Your selected layers have been kept.');
 if(sections.some(section=>section.locked)||blocks.some(block=>block.editor?.locked))throw Error('Unlock the canvas layers before rebuilding the complete asset.');
 const attached=sources.filter((source):source is Extract<StudioSource,{kind:'image'}>=>source.kind==='image');
 const inputs=attached.length?attached:blocks.length===1&&blocks[0].kind==='image'?[{name:blocks[0].value.alt||'Current image',image:blocks[0].value.src}]:[{name:'Current canvas',image:await renderCurrent()}];
 const prepared=await Promise.all(inputs.map(async(source,index)=>({id:`source-${index}`,name:source.name,...await preparedSource(source.image,signal)})));
 const original=attached.length||blocks.length===1?prepared[0]:assetDimensions(asset),fit=Math.min(1,2560/Math.max(original.width,original.height));
 const dimensions=requestedBrandDimensions(prompt)??{width:Math.max(100,Math.round(original.width*fit)),height:Math.max(100,Math.round(original.height*fit))};
 return brandReviewRequestSchema.parse({prompt,...dimensions,sources:prepared.map(({width,height,...source})=>source),
  currentText:attached.length?[]:blocks.flatMap(block=>block.kind==='text'?[block.value.runs.map(run=>run.text).join('')]:[]),
  conversation:(asset.messages??[]).slice(-12).map(message=>({user:message.user,text:message.text.slice(0,2000)})),
 });
}
type Request=z.infer<typeof brandReviewRequestSchema>;
async function cropSource(source:string,crop:NonNullable<Plan['visual']>['crop'],signal:AbortSignal){
 const image=await decode(source,signal),canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(image.naturalWidth*crop.width));canvas.height=Math.max(1,Math.round(image.naturalHeight*crop.height));
 canvas.getContext('2d')!.drawImage(image,crop.x*image.naturalWidth,crop.y*image.naturalHeight,crop.width*image.naturalWidth,crop.height*image.naturalHeight,0,0,canvas.width,canvas.height);
 return canvas.toDataURL('image/png');
}
async function prepareLogo(partner:Plan['partners'][number],request:Request,darkInk:boolean,signal:AbortSignal){
 const master=partner.libraryId?brandPartnerLibrary[partner.libraryId]:undefined;
 let src:string,width:number,height:number,ink:{top:number;height:number};
 if(master){
  src=master.src;const image=await decode(src,signal);width=image.naturalWidth;height=image.naturalHeight;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);ink=logoInkBand(ctx.getImageData(0,0,width,height).data,width,height);
 }else{
  const source=request.sources.find(source=>source.id===partner.sourceId);if(!source||!partner.crop)throw Error(`Attach a clean ${partner.name} logo and retry.`);
  const crop=await cropSource(source.image,partner.crop,signal),blob=await(await fetch(crop,{signal})).blob();
  let result;try{result=await importPartnerLogo(new File([blob],`${partner.name}.png`,{type:'image/png'}));}catch{throw Error(`The ${partner.name} logo could not be isolated cleanly. Attach its logo and retry.`);}
  ({src,width,height,ink}=result);
 }
 if(darkInk){
  const image=await decode(src,signal),canvas=document.createElement('canvas'),scale=Math.max(1,800/width);canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='source-in';ctx.fillStyle='#1b1b1b';ctx.fillRect(0,0,canvas.width,canvas.height);src=canvas.toDataURL('image/png');
 }
 return {...master,name:partner.name,src,width,height,ink};
}
export async function rebuildBrandAsset(asset:AssetDocument,request:Request,signal:AbortSignal){
 const response=await fetch('/api/brand-review',{method:'POST',signal,headers:{'Content-Type':'application/json','X-Lovable-Local':'1'},body:JSON.stringify(request)});
 const result=await response.json().catch(()=>({error:'The brand review did not return a readable response.'}));signal.throwIfAborted();
 if(!response.ok||result.error)throw Error(result.error||'Could not rebuild this artwork.');
 const plan=validateBrandReviewPlan(result.plan,request);
 const partners=await Promise.all(plan.partners.map(partner=>prepareLogo(partner,request,plan.palette==='light',signal)));
 const visualSrc=plan.visual?await cropSource(request.sources.find(source=>source.id===plan.visual!.sourceId)!.image,plan.visual.crop,signal):'';
 await Promise.all([document.fonts.load('700 48px "Camera Plain"'),document.fonts.load('600 19px "Camera Plain"')]);signal.throwIfAborted();
 const ctx=document.createElement('canvas').getContext('2d')!;
 const composed=compileBrandReview(plan,request,{partners,visualSrc,measure:(text:string,size:number,weight:number)=>{ctx.font=`${weight} ${size}px "Camera Plain"`;return ctx.measureText(text).width;}});
 const source=request.sources.find(source=>source.id===plan.sourceId)!;const sourceImage=await decode(source.image,signal);
 const documentAsset=assetSchema.parse({...asset,...composed,nodes:[makeNode('image',{name:'Source reference',x:0,y:0,w:100,h:100})],reference:{name:source.name,src:source.image,width:sourceImage.naturalWidth,height:sourceImage.naturalHeight},updatedAt:Date.now()});
 const french=/\b(?:charte|refais|reconstruis|conforme|visuel|affiche|francais)\b/i.test(request.prompt);
 const completion=french?`Version éditable créée en ${request.width} × ${request.height}, avec Camera Plain et Lovable en premier.`:`Rebuilt at ${request.width} × ${request.height} with Camera Plain and Lovable first. Text, logos and artwork are editable.`;
 const summary=[plan.diagnosis,completion,...plan.uncertainties.map(item=>`${french?'À confirmer':'Please confirm'}: ${item}`)].join('\n\n');
 return {asset:documentAsset,summary,plan};
}
