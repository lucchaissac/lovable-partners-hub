// The automatic attachment message and freely typed on-brand requests use the
// same product behavior. Explicit counts, reviews and selected edits win.
export const attachmentRefinementPrompt='Refine the current asset using the attached reference. Preserve its essential content.';
export function communityProposalPolicy(request){
 if(!request.sources?.some(source=>source.kind==='image'))return null;
 try{if(request.context?.startsWith('HTML_SELECTION ')&&JSON.parse(request.context.slice(15)).blockIds?.length)return null;}catch{}
 const prompt=(request.prompt??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[‐‑–—]/g,'-');
 if(/\b(?:review|critique|diagnosis|analyse|analyse[r]?|avis)\s+(?:only|seulement|uniquement)\b|\b(?:only|just|juste|seulement)\s+(?:review|critique|analyse)\b/.test(prompt))return null;
 if(/\b(?:only|just|uniquement|seulement)\s+(?:change|edit|replace|fix|adjust|crop|le titre|la date|la couleur|le recadrage)\b/.test(prompt))return null;
 const automatic=request.prompt===attachmentRefinementPrompt;
 const onBrand=/\bon[\s-]*brand\b|\b(?:make|rends?|rendre|mets?|mettre|adapte[r]?|corrige[r]?|refai[st]|rebuild)\b[^.!?\n]{0,100}\b(?:brand|marque|charte)\b|\b(?:aux couleurs|dans la charte|respecte la charte)\b|\b(?:refine|rebuild|fix|correct|corrige[r]?|refai[st])\b[^.!?\n]{0,60}\b(?:poster|flyer|affiche)\b/.test(prompt);
 if(!automatic&&!onBrand)return null;
 const numbers={one:1,single:1,une:1,un:1,two:2,deux:2,three:3,trois:3,four:4,quatre:4,five:5,cinq:5,six:6};
 const explicit=prompt.match(/\b([1-6]|one|single|une?|two|deux|three|trois|four|quatre|five|cinq|six)\s+(?:(?:single|seule?|distinctes?|different(?:e)?s?|editable|new|nouvelle?s?)\s+)*(?:proposals?|propositions?|versions?|designs?|affiches?|posters?|options?|rend(?:u|er)s?|variantes?)\b/);
 const noAlternatives=/\b(?:no|without|sans|pas de)\s+(?:alternatives?|variations?|variantes?|versions? supplementaires)\b/.test(prompt);
 const requested=noAlternatives?1:explicit?(numbers[explicit[1]]??Number(explicit[1])):4;
 const count=Math.min(requested,(request.availablePageSlots??64)+1);
 return {count,sourceObject:count>=4,defaultCount:!explicit};
}
