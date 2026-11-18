import './city-signature.css';

// Original vector coordinates and Camera Plain Bold metrics, not a retyped logo.
const logo={width:470.029,height:46.1959,heart:35.6303,lowercaseTop:21.7958-10.6695,baseline:48.0092-10.6695};
const city={fontSize:(48.0092-21.7958)*2048/1434,width:242.446530125523,leftBearing:1.3344338912133893};
const divider=logo.width+logo.heart,cityLeft=divider+logo.heart,width=cityLeft+city.width;
const n=value=>Number(value.toFixed(4));

function lockup(x=0,y=0){
 return `<g transform="translate(${n(x)} ${n(y)})">
  <image class="community-city-logo-light" href="/ambassadors/assets/lovable-community-white.svg" width="${logo.width}" height="${logo.height}"/>
  <image class="community-city-logo-dark" href="/ambassadors/assets/lovable-community-dark.svg" width="${logo.width}" height="${logo.height}"/>
  <path class="community-city-divider" d="M${n(divider)} ${n(12.3906-10.6695)}v${logo.heart}"/>
  <text class="community-city-name" x="${n(cityLeft-city.leftBearing)}" y="${n(logo.baseline)}" style="font-size:${n(city.fontSize)}px">San Francisco</text>
 </g>`;
}

export function communityCitySignature(){
 const inset=logo.heart,w=width+inset*2,h=logo.height+inset*2;
 const top=80,constructionHeight=220;
 const gapLabel=position=>`<span class="community-city-gap" style="left:${n((inset+position)/w*100)}%;top:${n((top+logo.height+38)/constructionHeight*100)}%" aria-hidden="true">x</span>`;
 const measure=(left,right)=>`<path class="community-city-measure" d="M${n(inset+left)} ${n(top+logo.height+25)}v10m0 -5H${n(inset+right)}m0 -5v10"/>`;
 return `<div class="diagram-stage community-city-preview"><svg class="community-city-art" viewBox="0 0 ${n(w)} ${n(h)}" role="img" aria-label="Lovable Community, divider and San Francisco">${lockup(inset,inset)}</svg></div>
 <div class="community-city-studies">
  <figure><div class="diagram-stage community-city-study"><div class="community-city-construction" style="aspect-ratio:${n(w)}/${constructionHeight}">
   <svg class="community-city-art" viewBox="0 0 ${n(w)} ${constructionHeight}" role="img" aria-label="The city’s capital height matches the logo’s lowercase height, on the same baseline, with equal heart-height gaps around the divider">
    <rect class="community-city-band" x="${inset}" y="${n(top+logo.lowercaseTop)}" width="${n(width)}" height="${n(logo.baseline-logo.lowercaseTop)}"/>
    ${lockup(inset,top)}
    <path class="community-city-guide" d="M${inset} ${n(top+logo.lowercaseTop)}H${n(inset+width)}M${inset} ${n(top+logo.baseline)}H${n(inset+width)}M${n(inset+logo.width)} ${top-16}V${n(top+logo.height+35)}M${n(inset+cityLeft)} ${top-16}V${n(top+logo.height+35)}"/>
    ${measure(logo.width,divider)}${measure(divider,cityLeft)}
   </svg>${gapLabel(logo.width+inset/2)}${gapLabel(divider+inset/2)}
  </div></div><figcaption>Alignment · lowercase height and shared baseline</figcaption></figure>
  <figure><div class="diagram-stage community-city-study"><div class="community-clear-space" role="img" aria-label="One heart height of clear space on all four sides of the complete city signature" style="aspect-ratio:${n(w)}/${n(h)};--space-label-x:${n(inset/w*50)}%;--space-label-y:${n(inset/h*50)}%">
   <svg class="community-city-art" viewBox="0 0 ${n(w)} ${n(h)}" aria-hidden="true"><g class="community-space-guides"><rect x=".5" y=".5" width="${n(w-1)}" height="${n(h-1)}"/><path d="M${inset} 0V${n(h)}M${n(inset+width)} 0V${n(h)}M0 ${inset}H${n(w)}M0 ${n(inset+logo.height)}H${n(w)}"/></g>${lockup(inset,inset)}</svg>
   <span class="community-space-label space-top" aria-hidden="true">x</span><span class="community-space-label space-right" aria-hidden="true">x</span><span class="community-space-label space-bottom" aria-hidden="true">x</span><span class="community-space-label space-left" aria-hidden="true">x</span>
  </div></div><figcaption>Clear space · measure around the complete signature</figcaption></figure>
 </div><div class="scale-notes"><p>City names use Camera Plain Bold. Keep the original logo and scale the signature proportionally.</p><p>x is the heart’s height. Keep x around the signature and on both sides of the divider.</p></div>`;
}
