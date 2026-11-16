import {ambassadorFormats} from '../src/ambassadors/catalog.js';

// Measured from the six gallery masters, not a second, invented visual system.
// tests/community-chat.test.mjs compares these values with the kit renderer.
export const communityCompositionRules={
 social:{inset:48,logoWidth:361.8,headlineSize:96,headlineLeading:88,headlineX:48,headlineY:166,headlineWidth:710,citySize:32.6,globeWidth:1250,globeX:550,globeY:0,gradientWidth:2600,motifOrder:['gradient','globe']},
 speakers:{inset:48,logoWidth:361.8,headlineSize:70,headlineLeading:66,headlineX:48,headlineY:126,headlineWidth:740,citySize:32.6,globeWidth:1180,globeX:550,globeY:-100,gradientWidth:2700,motifOrder:['globe','gradient']},
 poster:{inset:64,logoWidth:432,headlineSize:110,headlineLeading:99,headlineX:54,headlineY:178,headlineWidth:705,citySize:39,globeWidth:1380,globeX:550,globeY:-60,gradientWidth:3000,motifOrder:['globe','gradient']},
 banner:{inset:40*850/595,logoWidth:270*850/595,headlineSize:82*850/595,headlineLeading:75*850/595,headlineX:35*850/595,headlineY:148*850/595,headlineWidth:525*850/595,citySize:29*850/595,globeWidth:1280*850/595,globeX:-267.5*850/595,globeY:590*850/595,gradientWidth:2250*850/595,motifOrder:['globe','gradient']},
 spotlight:{inset:64,logoWidth:470.029,headlineSize:96,headlineLeading:100.8,headlineX:64,headlineY:800,headlineWidth:952,citySize:60,globeWidth:1404,globeX:258,globeY:-62,gradientWidth:3698.9,motifOrder:['globe','gradient']},
 badge:{inset:54,logoWidth:297,headlineSize:104,headlineLeading:112,headlineX:60,headlineY:238,headlineWidth:780,citySize:27,motifOrder:[]},
};
export const communityReferenceIds=ambassadorFormats.map(f=>f.id);
export const communityWorkingCanvasLimit=2560;
export function communityWorkingDimensions(reference){
 const source=ambassadorFormats.find(format=>format.id===reference);
 if(!source)throw Error('Choose an existing Community gallery reference.');
 const scale=['banner','poster'].includes(reference)?1000/Math.max(source.width,source.height):1;
 const fit=Math.min(scale,communityWorkingCanvasLimit/Math.max(source.width,source.height));
 return {width:Math.round(source.width*fit),height:Math.round(source.height*fit)};
}
export const communityLogo={width:470.029,height:46.1959,heartHeight:35.6303};
export function communityDesignMetrics(reference,width,height){
 const source=ambassadorFormats.find(f=>f.id===reference),rule=communityCompositionRules[reference];
 if(!source||!rule)throw Error('Choose an existing Community gallery reference.');
 const scale=width/source.width;
 // A square/portrait invitation needs the presence of the square gallery specimens,
 // not a landscape composition pushed down by all of the extra canvas height.
 const invitationGrowth=reference==='social'?Math.min(1,Math.max(0,(height/width-source.height/source.width)/(1-source.height/source.width))):0;
 const titleScale=1+invitationGrowth*(25/18-1);
 return {reference,width,height,sourceWidth:source.width,sourceHeight:source.height,scale,
  inset:rule.inset*scale,logoWidth:rule.logoWidth*scale,logoHeight:rule.logoWidth*scale*communityLogo.height/communityLogo.width,
  headlineSize:rule.headlineSize*scale*titleScale,headlineLeading:rule.headlineLeading*scale*titleScale,headlineX:rule.headlineX*scale,headlineY:rule.headlineY*scale,headlineWidth:(rule.headlineWidth+invitationGrowth*290)*scale,
  footerSize:24*scale*(1+invitationGrowth*.5),footerLeading:32*scale*(1+invitationGrowth*.5),
  citySize:rule.citySize*scale,globeWidth:rule.globeWidth*scale,globeX:rule.globeX*scale,globeY:(rule.globeY??0)*scale,gradientWidth:rule.gradientWidth*scale,motifOrder:rule.motifOrder,
 };
}
const isBrand=(e,asset)=>e.kind==='brand'&&e.asset===asset;
const near=(a,b)=>Math.abs(a-b)<=Math.max(1.5,Math.abs(b)*.01);
const frameOf=block=>{const f=block.frame??{};return {x:f.x??0,y:f.y??0,width:f.width??f.widthPx??0,height:f.height??0,rotation:f.rotation??0,opacity:f.opacity??1};};
const boxOverlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
export class CommunityDesignRuleError extends Error {constructor(message){super(message);this.name='CommunityDesignRuleError';}}
const reject=message=>{throw new CommunityDesignRuleError(message);};

export function validateCommunityDesignRules(plan,request){
 // Never turn an old off-brand experiment or a Lucide heart into new brand artwork.
 for(const e of [...plan.designs.flatMap(d=>d.elements),...plan.edits]){
  const source=('sourceId' in e)?request.blocks.find(b=>b.id===e.sourceId):undefined;
  if(isBrand(e,'heart')||(e.kind==='icon'&&e.name==='heart')||(source&&[source.asset,source.alt].some(label=>/^(heart|lovable symbol)$/i.test(label??''))))reject('Use the Community lockup and the original globe/gradient composition. Standalone heart artwork is not a gallery composition.');
 }
 for(const design of plan.designs){
  if(design.width>communityWorkingCanvasLimit||design.height>communityWorkingCanvasLimit)reject('Use an editor-sized canvas, at most 2560px on either side. Physical print dimensions do not request print-DPI pixel dimensions. A standard roll-up is 425 × 1000px.');
  if(['banner','poster'].includes(design.reference)&&Math.max(design.width,design.height)>1000&&!/\bpx\b|pixels?/i.test(request.prompt))reject('Use a 1000px long edge for print previews unless the user explicitly supplies pixel dimensions. Preserve the requested proportions; the standard roll-up is 425 × 1000px.');
  const m=communityDesignMetrics(design.reference,design.width,design.height),elements=design.elements;
  const light=design.background==='white',logoColor=light?'dark':'light';
  const logos=elements.filter(e=>isBrand(e,'community-logo'));
  if(logos.length!==1)reject('Each design needs exactly one original Community lockup.');
  const logo=logos[0],f=logo.frame;
  const editorial=plan.reviews.length>0;
  const logoScale=f.width/m.logoWidth;
  const validLogoSize=editorial?logoScale>=.99&&logoScale<=1.35&&near(f.height,m.logoHeight*logoScale):near(f.width,m.logoWidth)&&near(f.height,m.logoHeight);
  if(logo.color!==logoColor||!near(f.x,m.inset)||!near(f.y,m.inset)||!validLogoSize||f.rotation!==0||f.opacity!==1)reject(`For ${design.reference} at ${design.width}px, use the intact ${logoColor} logo at x=y=${m.inset.toFixed(2)}, width=${m.logoWidth.toFixed(2)}, height=${m.logoHeight.toFixed(2)}, no rotation or opacity change. Reviewed editorial layouts may enlarge it proportionally by up to 1.35 for small-size legibility.`);
  const x=f.width*communityLogo.heartHeight/communityLogo.width,clear={x:f.x-x,y:f.y-x,width:f.width+2*x,height:f.height+2*x};
  for(const e of elements){
   if(e===logo||isBrand(e,'globe')||isBrand(e,'gradient'))continue;
   if(e.kind==='image'&&e.placement==='background'){
    if(elements.indexOf(e)>elements.indexOf(logo)||elements.slice(0,elements.indexOf(e)).some(element=>element.kind==='text'))reject('Keep a retained background behind the complete logo and all copy. Place text on a quiet, contrasting part of the photograph for legibility.');
    continue;
   }
   const source='sourceId'in e?request.blocks.find(b=>b.id===e.sourceId):undefined,frame=e.frame??(source?frameOf(source):null);
   if(frame&&boxOverlaps(frame,clear))reject('Keep one actual heart height of clear space around the full Community logo, including its y descender.');
   if(e.kind==='text'){
    if(e.weight!==600&&e.weight!==700)reject('Use Camera Plain Bold 700 for headlines and Semibold 600 for supporting copy.');
    if(!(light?['#1b1b1b']:['#f7f4ed','#ffffff']).includes(e.color.toLowerCase()))reject(light?'Use #1b1b1b copy on light Community artwork.':'Community copy stays light on the authored dark artwork.');
    const headlineMaximum=m.headlineSize*(editorial?1.6:1.05);
    if(e.fontSize>headlineMaximum)reject(`Keep type in the ${design.reference} hierarchy: headline maximum ${headlineMaximum.toFixed(2)}px at this width.`);
    if(e.fontSize>=m.headlineSize*.65&&(e.align!=='left'||e.weight!==700))reject('The gallery headline is left-aligned Camera Plain Bold 700.');
    if(frame.x<m.inset*.8||frame.x+frame.width>design.width-m.inset*.8+2||frame.y<0||frame.y+frame.height>design.height-m.inset*.7+2)reject('Keep text within the reference content grid and canvas bounds.');
   }
   if((e.kind==='shape'?[e.fill,e.stroke]:e.kind==='icon'?[e.color]:[]).some(c=>!['#1b1b1b','#f7f4ed','#ffffff','transparent'].includes(c.toLowerCase())))reject('Use the original monochrome palette for native shapes and icons. Color belongs to the original globe and gradient.');
  }
  if(design.reference==='social'){
   const texts=elements.filter(e=>e.kind==='text');
   const headline=texts.reduce((largest,text)=>!largest||text.fontSize>largest.fontSize?text:largest,null);
   if(headline&&headline.fontSize<m.headlineSize*.9)reject(`Make the headline prominent: ${m.headlineSize.toFixed(1)}px with ${m.headlineLeading.toFixed(1)}px leading. Widen/reflow its text box before reducing type; maximum headline width ${m.headlineWidth.toFixed(1)}px.`);
   for(const footer of texts.filter(e=>/footer|caption/i.test(e.id))){
    if(footer.fontSize<m.footerSize*.9||!near(footer.frame.x,m.inset)||!near(design.height-footer.frame.y-footer.frame.height,m.inset))reject(`Use footer type ${m.footerSize.toFixed(1)}px or larger, left inset ${m.inset.toFixed(1)}px and the same bottom inset. The renderer will align the visible glyphs optically.`);
   }
  }
  const globe=elements.findIndex(e=>isBrand(e,'globe')),gradient=elements.findIndex(e=>isBrand(e,'gradient'));
  if(design.visualTreatment!=='brand-scene'&&(globe>=0||gradient>=0))reject('Choose one coherent visual treatment: the original globe scene, a retained illustration/photo, or a typographic composition.');
  if(design.visualTreatment==='brand-scene'&&m.motifOrder.length){
   if(globe<0||gradient<0)reject('Use the original globe and gradient together, as in the chosen gallery reference.');
   if((m.motifOrder[0]==='gradient')!==(gradient<globe))reject(`Keep the ${design.reference} layer order: ${m.motifOrder.join(' then ')} behind the content.`);
   for(const i of [globe,gradient])if(i>elements.indexOf(logo)||elements.slice(0,i).some(e=>e.kind==='text'))reject('The globe and gradient stay behind the logo and all copy.');
   const g=elements[globe];if(!near(g.frame.width,g.frame.height)||g.frame.rotation!==0||g.frame.opacity!==1)reject('Preserve the original globe shape, light and texture: square, unrotated, full opacity.');
   const editorialCrop=editorial&&g.frame.width>=m.globeWidth*.85&&g.frame.width<=m.globeWidth*2.5&&g.frame.x>=-design.width&&g.frame.x<=design.width*.8;
   if(editorial?!editorialCrop:Math.abs(g.frame.width-m.globeWidth)>m.globeWidth*.15||Math.abs(g.frame.x-m.globeX)>design.width*.12)reject(`Keep the reference globe scale and edge crop: approximately ${m.globeWidth.toFixed(1)}px wide at x=${m.globeX.toFixed(1)}. A reviewed editorial close crop can enlarge the original sphere up to 2.5 times that size, without enlarging the canvas.`);
   if(editorial?(g.frame.y<-design.height*.5||g.frame.y>design.height*.55):Math.abs(g.frame.y-m.globeY)>design.width*.06)reject(`Keep the globe high, near y=${m.globeY.toFixed(1)}px (within 6% of canvas width). Do not add the extra canvas height to its y position.`);
   const glow=elements[gradient].frame;
   if(Math.abs(glow.width-m.gradientWidth)>m.gradientWidth*.15||Math.abs(glow.height/glow.width-1.00808)>.01||Math.abs(glow.rotation+9.91)>.2)reject('Preserve the original gradient scale, 1:1.00808 proportions and -9.91 degree rotation.');
  }
 }
 return plan;
}
