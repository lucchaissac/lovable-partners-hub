const artwork=(family,x,y,width,height)=>{
 const community=family==='community';
 const light=community?'/ambassadors/assets/lovable-community-white.svg':'/brand/assets/cerebras-logo-white.svg';
 const dark=community?'/ambassadors/assets/lovable-community-dark.svg':'/brand/assets/cerebras-logo-black.svg';
 return `<image class="lovable-ink-light" href="${light}" x="${x}" y="${y}" width="${width}" height="${height}"/><image class="lovable-ink-dark" href="${dark}" x="${x}" y="${y}" width="${width}" height="${height}"/>`;
};
const figure=(label,body)=>`<figure><div class="lovable-study"><svg class="lovable-diagram" viewBox="0 0 600 600" role="img" aria-label="Lovable Community and Cerebras · ${label.toLowerCase()}">${body}</svg></div><figcaption>${label}</figcaption></figure>`;

export function communityCoBranding(){
 // Fit the supplied masters proportionally, balancing lettering optically.
 // The partner master includes its original circular mark and outer whitespace.
 const communityRatio=46.1959/470.029;
 const horizontal=artwork('community',48,300-300*communityRatio/2,300,300*communityRatio)
  +'<path class="divider" d="M380 270v60"/>'
  +artwork('partner',412,300-140*48/108/2,140,140*48/108);
 const logoHeight=400*communityRatio,partnerHeight=190*48/108;
 const top=(600-logoHeight-80-partnerHeight)/2,divider=top+logoHeight+40;
 const stacked=artwork('community',100,top,400,logoHeight)
  +`<path class="divider" d="M100 ${divider}H500"/>`
  +artwork('partner',205,divider+40,190,partnerHeight);
 return `<div class="lovable-study-grid">${figure('Horizontal',horizontal)}${figure('Stacked',stacked)}</div>`;
}
