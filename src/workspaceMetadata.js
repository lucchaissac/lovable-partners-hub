import {workspaceShares as workspaces,shareOrigin} from '../shared/shareMetadata.mjs';
export function updateWorkspaceMetadata(workspace) {
  const share=workspaces[workspace] || workspaces.partners;
  const {title, description} = share;
  if(location.pathname.replace(/\/$/,'')!==share.path)history.replaceState(history.state,'',share.path+location.search+location.hash);
  document.title = title;
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  for(const [property,value] of Object.entries({'og:description':description,'og:url':shareOrigin+share.path,'og:image':shareOrigin+share.image+'?v=1','og:image:alt':share.alt}))document.querySelector(`meta[property="${property}"]`)?.setAttribute('content',value);
  for(const [name,value] of Object.entries({'twitter:title':title,'twitter:description':description,'twitter:image':shareOrigin+share.image+'?v=1','twitter:image:alt':share.alt}))document.querySelector(`meta[name="${name}"]`)?.setAttribute('content',value);
  document.querySelector('link[rel="canonical"]')?.setAttribute('href',shareOrigin+share.path);
  document.querySelectorAll('meta[property^="og:video"]').forEach(node=>node.remove());
  if(share.video)for(const [property,value] of Object.entries({'og:video':shareOrigin+share.video,'og:video:type':'video/mp4','og:video:width':'960','og:video:height':'504'})){const meta=document.createElement('meta');meta.setAttribute('property',property);meta.content=value;document.head.append(meta);}
  const icon = document.querySelector('#workspace-favicon');
  if (icon) icon.setAttribute('href', `/brand/favicon-${workspace in workspaces ? workspace : 'partners'}.svg?v=4`);
}
