export function logoPlayground(workspace='lovable'){
 const community=workspace==='community';
 return `<div class="logo-playground" data-logo-playground data-logo-workspace="${workspace}" style="--logo-background:#f7f4ed"><div class="logo-playground-art"><img data-logo-art src="${community?'/ambassadors/assets/lovable-community-dark.svg':'/brand/assets/full-black.svg'}" alt="${community?'Lovable Community logo':'Monochrome Lovable logo'}"/></div><div class="logo-playground-controls" data-logo-controls></div></div>`;
}
export function mountLogoPlayground(root){
 const stage=root.querySelector('[data-logo-playground]');if(!stage)return()=>{};
 let disposed=false,cleanup;
 import('./LogoControls.jsx').then(({mountLogoControls})=>{if(!disposed)cleanup=mountLogoControls(stage);});
 return()=>{disposed=true;cleanup?.();};
}
