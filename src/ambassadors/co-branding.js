import {diagramBox as box,hMeasure,vMeasure,diagramFigure as figure} from '../lovable/diagrams.js';

const artwork=(family,x,y,width,height)=>{
 const community=family==='community';
 const light=community?'/ambassadors/assets/lovable-community-white.svg':'/brand/assets/cerebras-logo-white.svg';
 const dark=community?'/ambassadors/assets/lovable-community-dark.svg':'/brand/assets/cerebras-logo-black.svg';
 return `<image class="lovable-ink-light" href="${light}" x="${x}" y="${y}" width="${width}" height="${height}"/><image class="lovable-ink-dark" href="${dark}" x="${x}" y="${y}" width="${width}" height="${height}"/>`;
};

export function communityCoBranding(){
 // Fit the supplied masters proportionally, balancing lettering optically.
 // The partner master includes its original circular mark and outer whitespace.
 const communityRatio=46.1959/470.029,heartRatio=35.6303/470.029;
 const gap=300*heartRatio,left=(600-300-2*gap-140)/2,split=left+300+gap,right=split+gap;
 const logoTop=300-300*communityRatio/2,partnerTop=300-140*48/108/2;
 const horizontal=artwork('community',left,logoTop,300,300*communityRatio)
  +`<path class="divider" d="M${split} 270v60"/>`
  +artwork('partner',right,partnerTop,140,140*48/108)
  +box(left,logoTop,300,300*communityRatio)+box(right,partnerTop,140,140*48/108)
  +hMeasure(left+300,split,383)+hMeasure(split,right,383)
  +`<path class="guide" d="M${left} ${logoTop}H${right+140}M${left} ${logoTop+300*communityRatio}H${right+140}M${left+300} 260V393M${right} 260V393"/>`;
 const logoHeight=400*communityRatio,partnerHeight=190*48/108,stackGap=400*heartRatio;
 const top=(600-logoHeight-2*stackGap-partnerHeight)/2,divider=top+logoHeight+stackGap;
 const stacked=artwork('community',100,top,400,logoHeight)
  +`<path class="divider" d="M100 ${divider}H500"/>`
  +artwork('partner',205,divider+stackGap,190,partnerHeight)
  +box(100,top,400,logoHeight)+box(205,divider+stackGap,190,partnerHeight)
  +vMeasure(550,top+logoHeight,divider)+vMeasure(550,divider,divider+stackGap)
  +`<path class="guide" d="M100 ${top-20}V${divider+stackGap+partnerHeight+20}M500 ${top-20}V${divider+stackGap+partnerHeight+20}"/>`;
 return `<div class="lovable-study-grid">${figure('Complete logos · horizontal',horizontal)}${figure('Complete logos · stacked',stacked)}</div>`;
}
