export const shareOrigin='https://lovable-brands.vercel.app';
export const workspaceShares={
 lovable:{path:'/brand',hash:'#brand/gallery',title:'Lovable',description:'Explore the Lovable brand, gallery, guidelines and design studio.',image:'/share/lovable.jpg',alt:'The original white Lovable logo over an animated color field',video:'/brand/motion/og-960.mp4'},
 partners:{path:'/partners',hash:'#gallery',title:'Lovable Partners',description:'Lovable partner badges, guidelines and design studio.',image:'/share/partners.jpg',alt:'Partners — artwork from the Lovable Partners gallery'},
 ambassadors:{path:'/community',hash:'#ambassadors/gallery',title:'Lovable Community',description:'Lovable Community assets, guidelines and design studio.',image:'/share/community.jpg',alt:'Community — posters and photography from the Lovable Community gallery'},
 'tech-blog':{path:'/tech-blog',hash:'#tech-blog/gallery',title:'Lovable Tech blog',description:'Lovable Tech blog covers, guidelines and design studio.',image:'/share/tech-blog.jpg',alt:'Tech blog — covers from the Lovable Tech blog gallery'},
};
export function workspaceFromPath(path){const normalized=path.replace(/\/$/,'');if(!normalized||normalized==='/index.html')return 'lovable';return Object.keys(workspaceShares).find(key=>workspaceShares[key].path===normalized)??'partners';}
const escape=value=>String(value).replace(/[&"<>]/g,c=>({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'}[c]));
export function shareHead(workspace){
 const s=workspaceShares[workspace]??workspaceShares.partners,url=shareOrigin+s.path,image=shareOrigin+s.image+'?v=1';
 const tags=[['name','description',s.description],['property','og:type','website'],['property','og:site_name','Lovable brand hub'],['property','og:title',s.title],['property','og:description',s.description],['property','og:url',url],['property','og:image',image],['property','og:image:type','image/jpeg'],['property','og:image:width','1200'],['property','og:image:height','630'],['property','og:image:alt',s.alt],['name','twitter:card','summary_large_image'],['name','twitter:title',s.title],['name','twitter:description',s.description],['name','twitter:image',image],['name','twitter:image:alt',s.alt]];
 if(s.video)tags.push(['property','og:video',shareOrigin+s.video],['property','og:video:secure_url',shareOrigin+s.video],['property','og:video:type','video/mp4'],['property','og:video:width','960'],['property','og:video:height','504']);
 return `<title>${escape(s.title)}</title>\n<link rel="canonical" href="${url}"/>\n`+tags.map(([kind,key,value])=>`<meta ${kind}="${key}" content="${escape(value)}"/>`).join('\n');
}
export function withShareHead(html,workspace){return html.replace(/<!-- share:start -->[\s\S]*?<!-- share:end -->/,`<!-- share:start -->\n${shareHead(workspace)}\n<!-- share:end -->`);}
