export function logoPlayground(){
 return `<div class="logo-playground" data-logo-playground style="--logo-background:#f7f4ed"><div class="logo-playground-art"><img data-logo-art src="/brand/assets/full-black.svg" alt="Monochrome Lovable logo"/></div><div class="logo-playground-controls" data-logo-controls></div></div>`;
}
export function mountLogoPlayground(root){
 const stage=root.querySelector('[data-logo-playground]');if(!stage)return()=>{};
 let disposed=false,cleanup;
 import('./LogoControls.jsx').then(({mountLogoControls})=>{if(!disposed)cleanup=mountLogoControls(stage);});
 return()=>{disposed=true;cleanup?.();};
}
