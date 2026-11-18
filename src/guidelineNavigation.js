// Keep deep links, sidebar selection and late-loading guideline layouts aligned.
export function mountGuidelineNavigation(root,onSection){
 const sections=[...root.querySelectorAll('.guide-section')];
 const sidebar=root.querySelector('.guideline-sidebar');
 const links=[...root.querySelectorAll('[data-section]')];
 const header=document.querySelector('.hub-header');
 let destination,selected,lastTarget,frame,disposed=false;
 const inset=()=>{
  const headerBottom=header?.getBoundingClientRect().bottom||0;
  const sidebarHeight=sidebar&&getComputedStyle(sidebar).position==='sticky'?sidebar.getBoundingClientRect().height:0;
  return headerBottom+sidebarHeight+24;
 };
 const contentTop=section=>section.getBoundingClientRect().top+(parseFloat(getComputedStyle(section).paddingTop)||0);
 const mark=id=>{
  if(selected===id)return;
  selected=id;
  for(const link of links){
   if(link.dataset.section===id){
    link.setAttribute('aria-current','location');
    // Reveal the active tablet submenu item without scrolling the document.
    if(sidebar&&sidebar.scrollWidth>sidebar.clientWidth){
     const item=link.getBoundingClientRect(),nav=sidebar.getBoundingClientRect();
     if(item.left<nav.left+24)sidebar.scrollLeft+=item.left-nav.left-24;
     else if(item.right>nav.right-24)sidebar.scrollLeft+=item.right-nav.right+24;
    }
   }else link.removeAttribute('aria-current');
  }
  onSection(id);
 };
 const align=(behavior='instant')=>{
  if(!destination)return;
  const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);
  const top=Math.min(max,Math.max(0,scrollY+contentTop(destination)-inset()));
  // A ResizeObserver notification must not restart an unchanged smooth scroll.
  if(lastTarget===undefined||Math.abs(top-lastTarget)>.5){lastTarget=top;window.scrollTo({top,behavior});}
 };
 const sync=()=>{
  if(destination){mark(destination.id);return;}
  const atEnd=scrollY>0&&scrollY+innerHeight>=document.documentElement.scrollHeight-2;
  const current=atEnd?sections.at(-1):sections.filter(section=>contentTop(section)<=inset()+2).at(-1)||sections[0];
  if(current)mark(current.id);
 };
 const layout=()=>{if(disposed)return;align();sync();};
 const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=undefined;layout();});};
 const release=()=>{destination=undefined;lastTarget=undefined;schedule();};
 const keydown=event=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)&&!event.target.closest('input,select,textarea,[contenteditable],button,[role="menu"]'))release();};
 const pointerdown=event=>{if(event.clientX>=document.documentElement.clientWidth)release();};
 const resize=new ResizeObserver(schedule);
 for(const element of [...sections,header,sidebar].filter(Boolean))resize.observe(element);
 const events=[['scroll',schedule],['resize',schedule],['wheel',release],['touchmove',release],['keydown',keydown],['pointerdown',pointerdown]];
 for(const [name,handler]of events)window.addEventListener(name,handler,{passive:true});
 document.fonts.ready.then(()=>{if(!disposed)schedule();});
 schedule();
 return {
  go(id,behavior='smooth'){
   const section=sections.find(section=>section.id===id);if(!section)return;
   destination=section;lastTarget=undefined;mark(id);
   align(matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':behavior);
  },
  release,
  destroy(){disposed=true;resize.disconnect();cancelAnimationFrame(frame);for(const [name,handler]of events)window.removeEventListener(name,handler);},
 };
}
