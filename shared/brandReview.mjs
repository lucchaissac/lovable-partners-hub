import {z} from 'zod';
import {appStudioTemplate} from './brandTemplates.mjs';

const image=z.string().max(900000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/);
const id=z.string().regex(/^[a-zA-Z0-9-]{1,80}$/);
export const brandCropSchema=z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1),width:z.number().positive().max(1),height:z.number().positive().max(1)}).strict();
export const brandReviewRequestSchema=z.object({
 prompt:z.string().trim().min(1).max(4000),width:z.number().int().min(100).max(2560),height:z.number().int().min(100).max(2560),
 sources:z.array(z.object({id,name:z.string().max(160),image}).strict()).min(1).max(6),
 conversation:z.array(z.object({user:z.boolean(),text:z.string().max(2000)}).strict()).max(12),
 currentText:z.array(z.string().max(4000)).max(40),
}).strict();
export const brandReviewPlanSchema=z.object({
 template:z.enum(['event','partnership','app-studio']),sourceId:id,
 title:z.string().trim().min(1).max(100),headline:z.string().max(240),details:z.array(z.string().max(200)).max(3),
 palette:z.enum(['dark','light']),diagnosis:z.string().trim().min(1).max(650),uncertainties:z.array(z.string().max(200)).max(5),
 partners:z.array(z.object({name:z.string().trim().min(1).max(80),libraryId:z.enum(['aikido','incident','cerebras']).nullable(),sourceId:id.nullable(),crop:brandCropSchema.nullable()}).strict()).max(5),
 visual:z.object({sourceId:id,crop:brandCropSchema,description:z.string().min(1).max(150)}).strict().nullable(),
}).strict();
export const brandPartnerLibrary={
 aikido:{name:'Aikido',src:'/brand/assets/aikido-logo-white.svg',width:203,height:46,eventWidth:94,eventY:73},
 incident:{name:'incident.io',src:'/brand/assets/incident-logo-white.svg',width:1000,height:245,eventWidth:112,eventY:63},
 cerebras:{name:'Cerebras',src:'/brand/assets/cerebras-logo-white.svg',width:180,height:80},
};
export function isBrandReviewRequest(prompt,sources=[],hasLogoRequest=false){
 const text=prompt.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/\b(?:do not|don't|ne .* pas|cancel|annule)\b/.test(text))return false;
 if(/\b(?:on[ -]?brand|charte|rebrand|conforme)\b/.test(text))return true;
 if(hasLogoRequest||/\b(?:logo|animat\w*|animate?|rotation|fade)\b/.test(text))return false;
 return /\b(?:rebuild|redesign|remake|refais|reconstruis|recree)\b/.test(text)||sources.some(source=>source.kind==='image');
}
export function requestedBrandDimensions(prompt){
 const match=prompt.match(/\b(\d{2,5})\s*(?:px\s*)?[x×*]\s*(\d{2,5})(?:\s*px)?\b/i);
 if(!match)return null;
 const width=Number(match[1]),height=Number(match[2]);
 if(width<100||height<100||width>2560||height>2560)throw Error('Choose working dimensions between 100 and 2560 pixels per side.');
 return {width,height};
}
export function validateBrandReviewPlan(value,request){
 const plan=brandReviewPlanSchema.parse(value),ids=new Set(request.sources.map(source=>source.id));
 const crop=(sourceId,box,maximum)=>{
  if(!ids.has(sourceId))throw Error('Use an actual supplied source image.');
  if(!box||box.x+box.width>1.00001||box.y+box.height>1.00001||box.width*box.height>maximum)throw Error('Isolate a clean source region; never reuse a whole poster or unrelated lettering.');
 };
 if(!ids.has(plan.sourceId))throw Error('Choose the actual poster source.');
 if(plan.template!=='partnership'&&!plan.headline.trim())throw Error('Keep the source headline as editable text.');
 if(plan.template==='partnership'&&(plan.headline.trim()||plan.details.length))throw Error('Use the event composition when the source contains a headline or practical details.');
 if(plan.template==='app-studio'&&!/^app\s+studio$/i.test(plan.headline.trim()))throw Error('The App Studio wordmark is only for an actual App Studio event.');
 if(plan.template==='app-studio'&&(plan.partners.length||plan.visual))throw Error('Use the event composition for an App Studio event with partner logos or retained imagery.');
 if(plan.template==='app-studio'&&plan.palette==='light')throw Error('Use the event composition for a light counterpart; the original App Studio composition is dark.');
 const names=new Set();
 for(const partner of plan.partners){
  if(/lovable/i.test(partner.name))throw Error('Lovable is supplied by the compiler and must not be listed as a partner.');
  const name=partner.name.toLowerCase();if(names.has(name))throw Error('Each partner appears only once.');names.add(name);
  if(partner.libraryId){
   const expected={aikido:/aikido/i,incident:/incident(?:\.io)?/i,cerebras:/cerebras/i}[partner.libraryId];
   if(!expected.test(partner.name))throw Error('The original logo must match the identified partner.');
  }else crop(partner.sourceId,partner.crop,.22);
 }
 if(plan.visual)crop(plan.visual.sourceId,plan.visual.crop,.72);
 if(plan.template==='partnership'&&!plan.partners.length)throw Error('A partnership composition needs its actual partner identity.');
 return plan;
}
const sentenceCase=text=>/[a-zà-ÿ]/.test(text)||!/[A-Z]/.test(text)?text:text.charAt(0)+text.slice(1).toLowerCase();
const imageBlock=(id,src,alt,x,y,width,height,groupId)=>({id,kind:'image',value:{src,alt,caption:'',alignment:'center',width:100},editor:{position:'absolute',x,y,widthPx:width,height,...(groupId?{groupId}:{}),appearance:{imageFit:'contain',radius:0}}});
const lineBlock=(id,x,y,length,stroke,color)=>({id,kind:'shape',shape:'line',editor:{groupId:'brand-signature',position:'absolute',x:x-length/2,y:y-stroke/2,widthPx:length,height:stroke,rotation:90,appearance:{fill:color,lineWidth:stroke,lineStyle:'solid',lineCap:'butt'}}});

// Content goes into measured, approved frames. The model supplies no code,
// arbitrary coordinates, fonts, colors or remotely executable artwork.
export function fitBrandText(raw,size,width,height,leading,measure){
 const text=sentenceCase(raw.trim()),paragraphs=text.split('\n');
 const wrap=fontSize=>{
  const result=[];
  for(const paragraph of paragraphs){
   const words=paragraph.trim().split(/\s+/);
   if(measure(paragraph,fontSize)<=width){result.push(paragraph);continue;}
   let best;
   for(let i=1;i<words.length;i++){
    const a=words.slice(0,i).join(' '),b=words.slice(i).join(' '),aw=measure(a,fontSize),bw=measure(b,fontSize);
    if(aw<=width&&bw<=width&&(!best||Math.abs(aw-bw)<best.score))best={lines:[a,b],score:Math.abs(aw-bw)};
   }
   if(best){result.push(...best.lines);continue;}
   let line='';for(const word of words){const next=line?`${line} ${word}`:word;if(line&&measure(next,fontSize)>width){result.push(line);line=word;}else line=next;}result.push(line);
  }
  return result;
 };
 let fontSize=size,lines=wrap(size);
 while(fontSize>Math.max(10,size*.46)&&(lines.length*fontSize*leading>height+.1||lines.some(line=>measure(line,fontSize)>width))){fontSize-=.5;lines=wrap(fontSize);}
 if(lines.length*fontSize*leading>height+.5||lines.some(line=>measure(line,fontSize)>width+.5))throw Error('The supplied copy is too long for this format. Shorten the headline or use a larger canvas.');
 return {text:lines.join('\n'),fontSize};
}

/** Rebuild one complete asset; callers retain the document ID, undo and siblings. */
export function compileBrandReview(plan,request,{partners,measure,visualSrc=''}){
 validateBrandReviewPlan(plan,request);
 if(partners.length!==plan.partners.length)throw Error('Every partner needs readable original artwork.');
 const {width:w,height:h}=request,s=Math.min(w/600,h/400),color=plan.palette==='light'?'#1b1b1b':'#ffffff',background=plan.palette==='light'?'#f7f4ed':'#1b1b1b',blocks=[];
 const text=(id,copy,x,y,width,height,size,leading,weight=700)=>{
  if(!copy.trim())return;
  const fitted=fitBrandText(copy,size,width,height,leading,(value,fontSize)=>measure(value,fontSize,weight));
  blocks.push({id,kind:'text',value:{runs:[{text:fitted.text}],style:'Text',size:fitted.fontSize,align:'center',color},editor:{position:'absolute',x,y,widthPx:width,height,appearance:{fontFamily:'Camera Plain',fontWeight:weight,fontSize:fitted.fontSize,lineHeight:leading*100,letterSpacing:0}}});
 };
 if(plan.template==='app-studio'){
  const t=appStudioTemplate,scale=Math.min(w/t.width,h/t.height),ox=(w-t.width*scale)/2,oy=(h-t.height*scale)/2;
  const heart=imageBlock('app-studio-gradient',t.heart.src,'Original Lovable gradient',ox,oy,t.width*scale,t.height*scale);
  heart.value.crop={x:-t.heart.x,y:-t.heart.y,width:t.width,height:t.height,sourceWidth:t.heart.width,sourceHeight:t.heart.height};
  blocks.push(heart);
  for(const [index,y] of t.grid.horizontal.entries())blocks.push({id:`app-studio-grid-h-${index}`,kind:'shape',shape:'rectangle',editor:{position:'absolute',x:0,y:oy+y*scale,widthPx:w,height:1,opacity:.2,appearance:{fill:color}}});
  for(const [index,x] of t.grid.vertical.entries())blocks.push({id:`app-studio-grid-v-${index}`,kind:'shape',shape:'rectangle',editor:{position:'absolute',x:ox+x*scale,y:0,widthPx:1,height:h,opacity:.2,appearance:{fill:color}}});
  blocks.push(imageBlock('brand-identity',plan.palette==='light'?'/brand/assets/full-black.svg':t.logo.src,'Lovable',ox+t.logo.x*scale,oy+t.logo.y*scale,t.logo.width*scale,t.logo.height*scale));
  blocks.push(imageBlock('app-studio-wordmark',t.wordmark.src,'App Studio',ox+t.wordmark.x*scale,oy+t.wordmark.y*scale,t.wordmark.width*scale,t.wordmark.height*scale));
  text('brand-details',plan.details.join('\n'),ox+t.details.x*scale,oy+t.details.y*scale,t.details.width*scale,Math.max(t.details.height*scale,h*.18),t.details.size*scale,1.3);
 }else{
  const gradientSize=Math.min(4000,Math.max(w*5/3,h*2.1));
  if(!visualSrc)blocks.push(imageBlock('brand-glow','/ambassadors/assets/heart-overlay.webp','Original Lovable gradient',(w-gradientSize)/2,h*.54-gradientSize*.226,gradientSize,gradientSize));
  else{
   blocks.push(imageBlock('brand-visual',visualSrc,plan.visual.description,0,h*.58,w,h*.42));
   blocks.at(-1).editor.appearance.imageFit='cover';
  }
  const collaboration=plan.template==='partnership',identityWidth=(collaboration?179:112)*s;
  const items=[{name:'Lovable',src:plan.palette==='light'?'/brand/assets/full-black.svg':'/brand/assets/full-white-pure.svg',width:950,height:173,displayWidth:identityWidth,yOffset:0},...partners.map(logo=>({
   ...logo,displayWidth:(logo.eventWidth??112)*s,yOffset:logo.eventY===undefined?null:(logo.eventY-70)*s,
  }))];
  // Known vectors use the approved optical sizes; other marks match the
  // Lovable lettering band rather than being squeezed into the previous box.
  for(let i=1;i<items.length;i++)if(collaboration||!items[i].eventWidth){const item=items[i];item.displayWidth=identityWidth*173/950*.74/item.ink.height*item.width/item.height;}
  let gap=20*s,stroke=Math.max(1,s),total=items.reduce((sum,item)=>sum+item.displayWidth,0)+(items.length-1)*(2*gap+stroke);
  const shrink=Math.min(1,(w-72*s)/total);gap*=shrink;stroke=Math.max(1,stroke*shrink);total=items.reduce((sum,item)=>sum+item.displayWidth*shrink,0)+(items.length-1)*(2*gap+stroke);
  let x=(w-total)/2;const logoTop=collaboration?h/2-identityWidth*173/950/2:h*.175,baseline=logoTop+identityWidth*173/950*shrink;
  items.forEach((item,index)=>{
   const dw=item.displayWidth*shrink,dh=dw*item.height/item.width;
   const y=index===0?baseline-dh:item.yOffset!==null&&!collaboration?logoTop+item.yOffset*shrink:baseline-dh*(item.ink.top+item.ink.height);
   const layer=imageBlock(index===0?'brand-identity':`brand-partner-${index}`,item.src,item.name,x,y,dw,dh,'brand-signature');layer.brandRole=index===0?'identity':'partner';blocks.push(layer);x+=dw;
   if(index<items.length-1){const center=x+gap+stroke/2,dividerHeight=collaboration?identityWidth*173/950*shrink:22*s;blocks.push(lineBlock(`brand-divider-${index}`,center,collaboration?logoTop+dividerHeight/2:logoTop+10.5*s,dividerHeight,stroke,color));x+=2*gap+stroke;}
  });
  if(!collaboration){
   const hasVisual=!!visualSrc,headlineY=h*(hasVisual?.27:.3775),headlineH=h*(hasVisual?.19:.25);
   text('brand-headline',plan.headline,36*s,headlineY,w-72*s,headlineH,48*s,50/48);
   text('brand-details',plan.details.join('\n'),36*s,h*(hasVisual?.49:.695),w-72*s,h*(hasVisual?.08:.18),19*s,25/19,600);
  }
 }
 return {title:sentenceCase(plan.title),format:w===h?'square':w>h?'landscape':'portrait',dimensions:{width:w,height:h},background,grid:false,layouts:undefined,community:undefined,
  editor:{version:1,pages:[{id:'asset-page',name:plan.title,sections:[{id:'asset-board',name:'Canvas',background:'transparent',padding:0,gap:0,blockGap:0,minHeight:h,columns:[blocks]}]}]}};
}
