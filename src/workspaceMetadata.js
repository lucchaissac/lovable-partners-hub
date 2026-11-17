const workspaces = {
 'tech-blog':{title:'Lovable Tech blog',description:'Lovable Tech blog artwork, guidelines and design studio.'},
  lovable: {title: 'Lovable', description: 'Explore the Lovable brand hub.'},
  partners: {title: 'Lovable Partners', description: 'Lovable partner badges, guidelines and design studio.'},
  ambassadors: {title: 'Lovable Community', description: 'Lovable Community assets, guidelines and design studio.'},
};
export function updateWorkspaceMetadata(workspace) {
  const {title, description} = workspaces[workspace] || workspaces.partners;
  document.title = title;
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  const icon = document.querySelector('#workspace-favicon');
  if (icon) icon.setAttribute('href', `/brand/favicon-${workspace in workspaces ? workspace : 'partners'}.svg?v=3`);
}
