import {requestsAppStudioTemplate} from './brandTemplates.mjs';

const websitePattern=/(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<>"']*)?/gi;
const followUpWords=new Set('with avec and et or ou now maintenant then ensuite instead plutot rather actually finalement non no yes oui try essaie essayer use utilise utiliser using replace remplace remplacer switch change update to by par pour for this that one celui ci celle ce cette le la les de du des un une it please stp svp merci ok okay mais but same meme'.split(' '));
function logoRequest(prompt,sources,following){
 const text=prompt.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const explicit=/\b(logo|logotype|wordmark)\b/.test(text);
 if(requestsAppStudioTemplate(prompt)||/\b(don['’]t|do not|ne|pas|remove|delete|supprime|retire)\b/.test(text))return null;
 if(!/\b(replace|swap|remplace|remplacer)\b/.test(text)&&/\b(animat\w*|anim\w*|rotate|fade|spin|bounce)\b/.test(text))return null;
 const images=sources.filter(source=>source.kind==='image');
 const urls=[...prompt.matchAll(websitePattern)].map(match=>match[0].replace(/[.,!?;:)\]]+$/,''));
 const links=sources.filter(source=>source.kind==='link').map(source=>source.originalUrl||source.url);
 if(!explicit){
  const words=text.replace(websitePattern,' ').match(/[a-z]+/g)??[];
  if(!following||!images.length&&!urls.length&&!links.length||words.some(word=>!followUpWords.has(word)))return null;
 }
 const targets=[...new Set((urls.length?urls:links).map(value=>{try{return new URL(/^https?:\/\//i.test(value)?value:`https://${value}`).href;}catch{return '';}}).filter(Boolean))];
 if(images.length>1||targets.length>1)return {kind:'ambiguous'};
 if(images.length)return {kind:'image',source:images[0]};
 if(targets.length)return {kind:'website',url:targets[0]};
 return {kind:'missing'};
}

/** Follow the active conversation, including legacy saved chats and failed short replies. */
export function partnerLogoRequest(prompt,sources=[],messages=[],chatId='workspace'){
 let following=false,targetId;
 for(const message of messages){
  if((message.workspaceChatId||'workspace')!==chatId)continue;
  if(message.user){
   if(/^(?:ok(?:ay)?|thanks|thank you|merci)[.!\s]*$/i.test(message.text))continue;
   following=!!logoRequest(message.text,message.sources??[],following);
   if(!following)targetId=undefined;
  }else if(following&&message.partnerLogoEdit)targetId=message.partnerLogoEdit.targetId;
 }
 const request=logoRequest(prompt,sources,following);
 return request?{...request,...(targetId?{targetId}:{})}:null;
}
