/** Original Figma geometry, shared by the guidelines specimen and editable canvas. */
export const appStudioTemplate = {
 id:'app-studio', name:'App Studio', width:1920, height:1080, background:'#1b1b1b',
 heart:{src:'/brand/assets/app-studio-heart.svg',x:-1732.421875,y:-1340.700002,width:5237.42,height:5279.75},
 logo:{src:'/brand/assets/app-studio-logo.svg',x:827,y:323.90827,width:266.227,height:48.1326},
 wordmark:{src:'/brand/assets/app-studio-wordmark.svg',x:508,y:445,width:904,height:245},
 grid:{horizontal:[204,447,690,933],vertical:[233,475,717,960,1203,1446,1689],opacity:.2},
 details:{text:'Atlanta — December 2nd, 2026',x:510,y:765.98828125,width:900,height:88,size:67.46,letterSpacing:-2.6984,color:'#f7f4ed'},
};

/** Template selection only; unrelated chat instructions must never reset the canvas. */
export function requestsAppStudioTemplate(prompt){
 const text=prompt.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 return /\bapp[\s-]*studio\b/.test(text)
  && /\b(banner|banniere|cover|affiche|template|modele)\b/.test(text)
  && /\b(make|create|build|open|use|cree|creer|fais|faire|ouvre|utilise)\b/.test(text)
  && !/\b(don[’']t|do not|ne|pas|sans|delete|remove|supprime|retire)\b/.test(text);
}
