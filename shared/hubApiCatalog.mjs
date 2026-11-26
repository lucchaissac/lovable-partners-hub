import {agentGuides,agentPrompt} from './hubAgentGuides.mjs';
import {partnershipTemplate,appStudioTemplate} from './brandTemplates.mjs';
import {communityMediaLibrary} from './communityMediaLibrary.mjs';
import {communityTemplateGeometry} from './communityTemplateGeometry.mjs';
import {ambassadorFormats,ambassadorDefaultTemplate} from '../src/ambassadors/catalog.js';
import {FORMATS} from '../src/badges.js';

export const hubWorkspaces=Object.keys(agentGuides);
export const hubScopes=['guidelines:read','assets:read','templates:read','designs:read','designs:write'];
export const hubOrigin='https://lovable-brands.vercel.app';
const asset=(id,name,src)=>({id,name,src});
const assets={
  lovable:[asset('lovable-dark','Lovable · Dark','/brand/assets/lockup-black.svg'),asset('lovable-light','Lovable · Light','/brand/assets/lockup-white.svg'),asset('lovable-mono','Lovable · Monochrome','/brand/assets/full-white-pure.svg'),asset('lovable-heart','Lovable heart','/brand/assets/logomark-color.svg'),asset('app-studio','App Studio wordmark','/brand/assets/app-studio-wordmark.svg')],
  partners:[asset('partner-heart','Partner heart','/brand/outlined/1-523-imgGroup1.svg'),asset('partner-wordmark','Partner wordmark','/brand/outlined/1-177-imgGroup1.svg')],
  ambassadors:[asset('community-logo','Lovable Community','/ambassadors/assets/lovable-community.svg'),asset('community-globe','Paris globe','/ambassadors/assets/paris-globe-1080.webp'),asset('community-gradient','Original gradient','/ambassadors/assets/heart-overlay.png'),...communityMediaLibrary],
  'tech-blog':[asset('tech-logo','Tech blog','/tech-blog/tech-logo.svg'),asset('tech-logo-color','Tech blog · Color field','/tech-blog/tech-logo-color.svg'),asset('tech-grid','Cover grid','/tech-blog/cover-grid.svg'),asset('tech-curves','Construction curves','/tech-blog/cover-curves.svg'),asset('tech-color','Color field','/tech-blog/color-field.svg')],
};
export function workspaceInfo(id,origin=hubOrigin){
  const guide=agentGuides[id],prefix=guide.route?guide.route+'/':'';
  return {id,name:guide.name,guidelinesUrl:`${origin}/#${prefix}guidelines`,galleryUrl:`${origin}/#${prefix}gallery`,makeUrl:`${origin}/#${prefix}create`};
}
export function catalog(resource,workspace,origin=hubOrigin){
  if(resource==='guidelines')return {workspace,...workspaceInfo(workspace,origin),prompt:agentPrompt(workspace).replaceAll(hubOrigin,origin)};
  if(resource==='assets')return assets[workspace].map(item=>({...item,url:origin+item.src,...(item.thumbnail?{thumbnail:origin+item.thumbnail}:{})}));
  const templates=workspace==='lovable'?[partnershipTemplate,appStudioTemplate]:workspace==='ambassadors'?[ambassadorDefaultTemplate,...ambassadorFormats]:workspace==='partners'?FORMATS:[{id:'cover',name:'Tech blog cover',width:674,height:337}];
  return templates.map(item=>({id:item.id,name:item.name,...(item.width?{width:item.width,height:item.height}:{}),makeUrl:workspaceInfo(workspace,origin).makeUrl+'/'+item.id,...(workspace==='lovable'?{geometry:item}:workspace==='ambassadors'&&communityTemplateGeometry[item.id]?{geometry:communityTemplateGeometry[item.id]}:{})}));
}
