import {requestsAppStudioTemplate} from './brandTemplates.mjs';

/** A deterministic edit intent: no model or paid logo service is needed. */
export function partnerLogoRequest(prompt, sources=[]) {
 const text=prompt.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(requestsAppStudioTemplate(prompt)||!/\b(logo|logotype|wordmark)\b/.test(text)||/\b(don['’]t|do not|ne|pas|remove|delete|supprime|retire)\b/.test(text))return null;
 if(!/\b(replace|swap|remplace|remplacer)\b/.test(text)&&/\b(animat\w*|anim\w*|rotate|fade|spin|bounce)\b/.test(text))return null;
 const images=sources.filter(source=>source.kind==='image');
 const urls=[...prompt.matchAll(/(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<>"']*)?/gi)].map(match=>match[0].replace(/[.,!?;:)\]]+$/,''));
 const links=sources.filter(source=>source.kind==='link').map(source=>source.originalUrl||source.url);
 const targets=[...new Set((urls.length?urls:links).map(value=>{try{return new URL(/^https?:\/\//i.test(value)?value:`https://${value}`).href;}catch{return '';}}).filter(Boolean))];
 if(images.length>1||targets.length>1)return {kind:'ambiguous'};
 if(images.length)return {kind:'image',source:images[0]};
 if(targets.length)return {kind:'website',url:targets[0]};
 return {kind:'missing'};
}
