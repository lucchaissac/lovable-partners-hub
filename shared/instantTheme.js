import './instantTheme.css';

let cleanupFrame;
export function setThemeInstantly(theme) {
 const root=document.documentElement;
 const next=theme==='light'?'light':'dark';
 if(root.dataset.theme===next)return;
 cancelAnimationFrame(cleanupFrame);
 root.dataset.themeSwitching='';
 root.dataset.theme=next;
 // Commit the new colors without transitions, including controls and pseudo-elements.
 void getComputedStyle(root).color;
 cleanupFrame=requestAnimationFrame(()=>{
  cleanupFrame=requestAnimationFrame(()=>delete root.dataset.themeSwitching);
 });
}
