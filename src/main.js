import {techGallery,techGuidelines,techSections,mountTech} from './tech-blog/index.js';
import {mountAgentGuide} from './agentGuide.js';
import {brandGallery,brandGuidelines,brandSections,mountBrandHub} from './brand.js';
import {updateWorkspaceMetadata} from './workspaceMetadata.js';
import {warmGallery} from './galleryLoading.js';
import {setThemeInstantly} from '../shared/instantTheme.js';
import '../shared/tooltip.css';
import './navigation.js';
import {mountGuidelineNavigation} from './guidelineNavigation.js';
import { showWorkspaceTransition } from './brand-transition.js';
import {ambassadorDefaultFormat,ambassadorFormats,ambassadorSections} from './ambassadors/catalog.js';
import {ambassadorGallery,ambassadorGuidelines,mountAmbassadorPreviews} from './ambassadors/views.js';
import { createElement, RectangleHorizontal, Globe, Grid3X3, Moon, Sun, Search, X, ArrowUpRight, ArrowRight, ChevronDown, Download, Check, Copy, Upload, RotateCcw, Pause, Play } from 'lucide';
import { FORMATS, TIERS, FIGMA_FILE, badgeSvg, badgeGeometry, prepareTypography } from './badges.js';
import { exportBadge } from './export.js';
import { guidelines } from './guidelines.js';
import { studio } from './studio.js';
import { gallery, mountGallery } from './gallery.js';
import {getPreviewRole} from './local-access.js';
import {previewRoute} from '../shared/previewAccess.mjs';

const makeHomePreview = import.meta.env.DEV ? await import('./make-home.js') : null;

const icons={rectangle:RectangleHorizontal,globe:Globe,grid:Grid3X3,moon:Moon,sun:Sun,search:Search,x:X,arrow:ArrowUpRight,next:ArrowRight,chevron:ChevronDown,download:Download,check:Check,copy:Copy,upload:Upload,replay:RotateCcw,pause:Pause,play:Play};
export const icon=name=>`<i data-icon="${name}" aria-hidden="true"></i>`;
export const sections=[['overview','Overview'],['construction','Construction'],['connections','Connections'],['clear-space','Clear space'],['scale','Scale'],['motion','Motion'],['formats','Formats'],['color','Color'],['typography','Typography'],['incorrect-usage','Incorrect usage'],['for-your-agent','For your agent'],['usage','In use']];
const app=document.querySelector('#app');
const state={workspace:'partners',view:'guidelines',filter:'all',tier:'Select',format:'solution-compact',year:'2026',partnerName:'',partnerImage:'',symbolSize:'large',guides:false,background:'dark',scale:2};
let guidelineNavigation,assemblyObserver,toastTimer,cleanupGallery,cleanupAmbassadors,cleanupBrand,cleanupAgentGuide,cleanupTech,cleanupMakeHome;
const currentSections=()=>state.workspace==='tech-blog'?techSections:state.workspace==='lovable'?brandSections:state.workspace==='ambassadors'?ambassadorSections:sections;
const currentFormats=()=>state.workspace==='tech-blog'?[]:state.workspace==='lovable'?[]:state.workspace==='ambassadors'?ambassadorFormats:FORMATS;
const route=(view,section)=>`#${state.workspace==='tech-blog'?'tech-blog/':state.workspace==='lovable'?'brand/':state.workspace==='ambassadors'?'ambassadors/':''}${view}${section?`/${section}`:''}`;
function parseRoute(){const parts=location.hash.slice(1).split('/');const workspace=parts[0]==='tech-blog'?'tech-blog':parts[0]==='brand'?'lovable':parts[0]==='ambassadors'?'ambassadors':'partners';if(workspace!=='partners')parts.shift();return {workspace,view:parts[0]||'gallery',section:parts[1]};}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hydrateIcons(root=document){root.querySelectorAll('select').forEach(select=>{if(select.parentElement.classList.contains('select-control'))return;const wrapper=document.createElement('span');wrapper.className='select-control';select.replaceWith(wrapper);wrapper.append(select,createElement(ChevronDown,{class:'select-chevron',width:14,height:14,'stroke-width':1.75,'aria-hidden':'true',focusable:'false'}));});root.querySelectorAll('[data-icon]').forEach(el=>el.replaceWith(createElement(icons[el.dataset.icon]||icons.grid,{class:'icon','stroke-width':1.8,'aria-hidden':'true',focusable:'false'})));}
export function formatCard(f,compact=false){return `<article class="format-card"><button class="format-preview ${f.layout}" style="--badge-row-scale:${160/badgeGeometry('solution-horizontal',state.tier).width};--badge-height-scale:${badgeGeometry(f.id,state.tier).height/badgeGeometry(f.id,state.tier).moduleHeight}" data-customize="${f.id}" aria-label="Customize ${f.name}">${badgeSvg(f.id,{tier:state.tier})}</button><div class="format-caption"><div><h3>${f.name}</h3>${compact?'':`<p>${f.description}</p>`}</div><button class="subtle-button" data-download="${f.id}" aria-label="Download ${f.name} as .svg" data-hub-tooltip="Download .svg">${icon('download')}</button></div></article>`;}
function library(){return `<div class="wide-content"><div class="page-intro"><div class="eyebrow">Your partner toolkit</div><h1>The badge library.</h1><p>Eight formats. One shared identity.<br />Choose a starting point, then make it yours.</p></div><div class="library-toolbar"><div class="filter-group" role="group" aria-label="Filter badge family">${[['all','All formats'],['solution','Solution Partner'],['expert','Expert']].map(([id,label])=>`<button data-filter="${id}" class="filter-button ${state.filter===id?'is-active':''}" aria-pressed="${state.filter===id}">${label}</button>`).join('')}</div><label class="inline-select">Partner tier <select id="library-tier">${TIERS.map(t=>`<option ${state.tier===t?'selected':''}>${t}</option>`).join('')}</select></label></div><div class="format-grid library-grid">${FORMATS.filter(f=>state.filter==='all'||f.family===state.filter).map(f=>formatCard(f)).join('')}</div><p class="quiet-note library-note">All badges use transparent modules with white outlines. Download a master .svg, or open a format to customize its tier, year and partner logo.</p></div>`;}
function creator(){
 const f=FORMATS.find(f=>f.id===state.format),stacked=['stacked','symbol'].includes(f.layout);
 return `<div class="wide-content creator-content"><div class="page-intro compact-intro"><div class="eyebrow">Made for your partnership</div><h1>Create your badge.</h1><p>Choose the details. The proportions are taken care of.</p></div><div class="creator-layout"><form class="creator-controls" id="badge-form">
 <label class="field">Format<select name="format">${FORMATS.map(f=>`<option value="${f.id}" ${f.id===state.format?'selected':''}>${f.name}</option>`).join('')}</select></label>
 <div class="field-row"><label class="field">Tier<select name="tier" ${f.family==='expert'?'disabled':''}>${TIERS.map(t=>`<option ${t===state.tier?'selected':''}>${t}</option>`).join('')}</select></label><label class="field">Year<input name="year" type="number" min="2020" max="2099" value="${escape(state.year)}" required /></label></div>
 ${f.layout==='symbol'?`<label class="field">Symbol size<select name="symbolSize"><option value="large" ${state.symbolSize==='large'?'selected':''}>Large</option><option value="small" ${state.symbolSize==='small'?'selected':''}>Small</option></select></label>`:''}
 ${stacked?`<div class="control-divider"></div><label class="field">Partner name<input name="partnerName" placeholder="Your company" maxlength="24" value="${escape(state.partnerName)}" ${state.partnerImage?'disabled':''}/></label><label class="upload-button">${icon('upload')}<span>${state.partnerImage?'Replace partner logo':'Upload partner logo'}</span><input id="logo-upload" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" /></label><p class="field-help">Use a white logo on a transparent background. .svg, .png, .webp or .jpg, up to 5 MB.</p>${state.partnerImage?'<button class="text-link remove-logo" type="button" id="remove-logo">Remove logo</button>':''}`:''}
 <div class="control-divider"></div><span class="field-label">Preview background</span><div class="background-choices" role="group" aria-label="Preview background">${[['dark','Dark'],['transparent','Transparent']].map(([id,label])=>`<button type="button" data-background="${id}" class="background-choice ${state.background===id?'is-active':''}" aria-pressed="${state.background===id}" data-hub-tooltip="${label}"><span class="background-swatch ${id==='transparent'?'checkerboard':''}"></span><span>${label}</span></button>`).join('')}</div>
 <label class="checkbox-field"><input type="checkbox" name="guides" ${state.guides?'checked':''}/><span>Show clear space</span></label>
 <div class="control-divider"></div><label class="field">Image resolution<select name="scale">${[1,2,4].map(n=>`<option value="${n}" ${state.scale===n?'selected':''}>${n}× · ${n===1?'Original size':n===2?'High resolution':'Extra large'}</option>`).join('')}</select></label>
 <button type="button" class="primary-button export-button" data-export="svg">${icon('download')} Download .svg</button><button type="button" class="secondary-button export-button" data-export="png">${icon('download')} Download .png</button><button type="button" class="text-link copy-button" data-export="copy">${icon('copy')} Copy .svg</button>
 </form><div class="creator-preview-column"><div class="creator-preview ${state.background==='transparent'?'checkerboard':''}" id="creator-preview"><div id="live-badge"></div><span class="preview-caption">Live preview</span></div><div class="preview-meta"><span id="badge-dimensions"></span><a href="https://www.figma.com/design/${FIGMA_FILE}/lovable?node-id=${f.node.replace(':','-')}" target="_blank" rel="noreferrer">View original design ${icon('arrow')}</a></div><p class="quiet-note">Downloads have a transparent background. Preview guides are not included.</p><div class="creator-tip">${icon('check')}<p>White outlines, connected modules and balanced spacing are built in.</p></div></div></div></div>`;
}
function options(){return {tier:state.tier,year:/^20\d{2}$/.test(state.year)?state.year:'2026',partnerName:state.partnerName||'Logo',partnerImage:state.partnerImage,symbolSize:state.symbolSize};}
function updatePreview(){const target=document.querySelector('#live-badge');if(!target)return;target.innerHTML=badgeSvg(state.format,{...options(),guides:state.guides,clearSpace:state.guides});const geo=badgeGeometry(state.format,state.tier,options());target.className=geo.format.layout;document.querySelector('#badge-dimensions').textContent=`${Math.ceil(geo.width)} × ${Math.ceil(geo.height)} · Vector master`;}
function syncPreviewNavigation(){
 if(!makeHomePreview)return;
 const external=getPreviewRole()==='external';
 document.documentElement.dataset.previewRole=getPreviewRole();
 document.documentElement.dataset.previewWorkspace=state.workspace;
 document.querySelectorAll('[data-workspace]').forEach(button=>{button.hidden=external&&!['lovable','partners'].includes(button.dataset.workspace);});
 document.querySelectorAll('.section-switcher [data-view]').forEach(button=>{button.hidden=external&&state.workspace==='lovable'&&button.dataset.view!=='guidelines';});
}
function render(view=state.view,{reset=true}={}){
 const allowed=previewRoute(getPreviewRole(),{...parseRoute(),workspace:state.workspace,view});
 if(allowed.workspace!==state.workspace||allowed.view!==view){state.workspace=allowed.workspace;view=allowed.view;history.replaceState(null,'',route(view,allowed.section));}
 showWorkspaceTransition(state.workspace);
 const showLibrary=view==='library';if(showLibrary||view==='badge')view='create';
 const requestedBadge=parseRoute().section,badge=currentFormats().some(format=>format.id===requestedBadge)||(state.workspace==='ambassadors'&&[ambassadorDefaultFormat,'event-graphic'].includes(requestedBadge))?requestedBadge:undefined,starter=state.workspace==='partners'&&requestedBadge==='grow-your-business';
 const showMakeHome=!!makeHomePreview&&view==='create'&&!requestedBadge&&!showLibrary;
 cleanupMakeHome?.();cleanupMakeHome=undefined;
 state.view=view;guidelineNavigation?.destroy();guidelineNavigation=undefined;assemblyObserver?.disconnect();cleanupGallery?.();cleanupGallery=undefined;cleanupAmbassadors?.();cleanupAmbassadors=undefined;cleanupBrand?.();cleanupBrand=undefined;cleanupAgentGuide?.();cleanupAgentGuide=undefined;cleanupTech?.();cleanupTech=undefined;
 const brand=state.workspace==='lovable',ambassadors=state.workspace==='ambassadors';
 const asset=/^[a-f0-9-]{36}$/i.test(requestedBadge??'')?requestedBadge:undefined;
 app.innerHTML=showMakeHome?makeHomePreview.makeHome(state.workspace):state.workspace==='tech-blog'?(view==='gallery'?techGallery():view==='create'?studio({workspace:'tech-blog',badge:requestedBadge==='cover'||!requestedBadge?'cover':undefined,asset:/^[a-f0-9-]{36}$/i.test(requestedBadge??'')?requestedBadge:undefined}):techGuidelines({icon})):brand?(view==='gallery'?brandGallery():view==='create'?studio({workspace:'lovable',badge:['collaboration','app-studio',...(import.meta.env.DEV?['holiday','display-ads','screen-demo']:[])].includes(requestedBadge)?requestedBadge:!requestedBadge?'collaboration':undefined,asset:/^[a-f0-9-]{36}$/i.test(requestedBadge??'')?requestedBadge:undefined}):brandGuidelines({icon})):view==='gallery'?(ambassadors?ambassadorGallery():makeHomePreview&&getPreviewRole()==='external'?makeHomePreview.externalPartnerGallery():gallery()):view==='create'?studio({library:showLibrary,badge,asset,starter,workspace:state.workspace}):ambassadors?ambassadorGuidelines({icon}):guidelines(state.tier,{icon,formatCard,sections});
 if(showMakeHome)cleanupMakeHome=makeHomePreview.mountMakeHome(app,state.workspace);
 document.querySelectorAll('[data-workspace]').forEach(button=>{const selected=!brand&&button.dataset.workspace===state.workspace;button.classList.toggle('is-selected',selected);if(button.dataset.workspace!=='lovable')button.setAttribute('aria-pressed',String(selected));});
 updateWorkspaceMetadata(state.workspace);syncPreviewNavigation();
 if(state.workspace==='tech-blog'&&view!=='create')cleanupTech=mountTech(app);
 if(view==='guidelines')cleanupAgentGuide=mountAgentGuide(app,toast);
 if(brand)cleanupBrand=mountBrandHub(app,toast);
 document.querySelector('.section-switcher').hidden=false;document.querySelector('#search-toggle').hidden=false;
 const brandLink=document.querySelector('[data-brand-link]');brandLink.classList.toggle('is-selected',brand);if(brand)brandLink.setAttribute('aria-current','page');else brandLink.removeAttribute('aria-current');
 document.querySelector('#search-input').placeholder=brand?'Search identity, colors, typography…':ambassadors?'Search assets, spacing, guidelines…':'Search badges, spacing, guidelines…';
 if(ambassadors&&view!=='create')cleanupAmbassadors=mountAmbassadorPreviews(app);
 document.querySelectorAll('.section-switcher [data-view]').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('is-selected',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});hydrateIcons();
 if(view==='guidelines'){guidelineNavigation=mountGuidelineNavigation(app,id=>history.replaceState(null,'',route('guidelines',id)));assemblyObserver=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('is-playing',e.isIntersecting)),{threshold:.2});document.querySelectorAll('.assembly-stage,.motion-example').forEach(el=>assemblyObserver.observe(el));}
 if(reset)window.scrollTo({top:0,behavior:'instant'});
 if(view==='gallery'||view==='guidelines')cleanupGallery=mountGallery(app);
}
function navigate(view,section){history.replaceState(null,'',route(view,section));render(view);if(view==='guidelines'&&section)guidelineNavigation?.go(section);}
function toast(message){clearTimeout(toastTimer);const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');toastTimer=setTimeout(()=>el.classList.remove('visible'),3500);}
async function download(format,type='svg',button,master=false){if(button)button.disabled=true;try{await exportBadge(format,master?{tier:state.tier,year:'2026',partnerName:'Logo',symbolSize:'large'}:options(),type,state.scale);toast(type==='copy'?'Badge .svg copied.':`Your .${type} badge is ready.`);}catch(error){console.error(error);toast(error.message||'Export could not finish. Please try again.');}finally{if(button)button.disabled=false;}}
document.addEventListener('submit',event=>{if(event.target.id==='badge-form')event.preventDefault();});
document.addEventListener('click',event=>{
 if(event.target.closest('[data-brand-link]')){event.preventDefault();state.workspace='lovable';navigate('gallery');return;}
 if(event.target.closest('[data-workspace]'))guidelineNavigation?.release();
 const demoControl=event.target.closest('[data-demo-pause]');if(demoControl){const demo=demoControl.closest('.motion-example'),paused=demo.classList.toggle('is-paused');demoControl.setAttribute('aria-pressed',paused);demoControl.setAttribute('aria-label',`${paused?'Play':'Pause'} ${demo.dataset.motionLabel}`);demoControl.innerHTML=icon(paused?'play':'pause');hydrateIcons(demoControl);return;}
 const pause=event.target.closest('[data-pause]');if(pause){const stage=document.querySelector('.assembly-stage'),paused=stage.classList.toggle('is-paused');pause.setAttribute('aria-pressed',paused);pause.setAttribute('aria-label',paused?'Play badge assembly':'Pause badge assembly');pause.innerHTML=icon(paused?'play':'pause');hydrateIcons(pause);return;}
 const replay=event.target.closest('[data-replay]');if(replay){const stage=document.querySelector('.assembly-stage'),control=stage.closest('.motion-example').querySelector('[data-pause]');stage.classList.remove('is-paused');stage.classList.add('is-restarting');control.setAttribute('aria-pressed','false');control.setAttribute('aria-label','Pause badge assembly');control.innerHTML=icon('pause');hydrateIcons(control);requestAnimationFrame(()=>requestAnimationFrame(()=>stage.classList.remove('is-restarting')));return;}
 const section=event.target.closest('[data-section]');if(section){event.preventDefault();const id=section.dataset.section;history.replaceState(null,'',route('guidelines',id));guidelineNavigation?.go(id);return;}
 const workspace=event.target.closest('[data-workspace]:not([aria-disabled="true"])');if(workspace){state.workspace=workspace.dataset.workspace;navigate('gallery');return;}
 const view=event.target.closest('[data-view]');if(view){event.preventDefault();navigate(view.dataset.view,view.dataset.createTemplate||(!makeHomePreview&&state.workspace==='lovable'&&view.dataset.view==='create'?'collaboration':undefined));return;}
 const customize=event.target.closest('[data-customize]');if(customize){state.format=customize.dataset.customize;navigate('create',state.format);return;}
 const filter=event.target.closest('[data-filter]');if(filter){state.filter=filter.dataset.filter;render('library',{reset:false});return;}
 const bg=event.target.closest('[data-background]');if(bg){state.background=bg.dataset.background;document.querySelectorAll('[data-background]').forEach(b=>{b.classList.toggle('is-active',b===bg);b.setAttribute('aria-pressed',b===bg);});document.querySelector('#creator-preview').className=`creator-preview ${state.background==='transparent'?'checkerboard':''}`;return;}
 const dl=event.target.closest('[data-download]');if(dl){download(dl.dataset.download,'svg',dl,true);return;}
 const exp=event.target.closest('[data-export]');if(exp){if(document.querySelector('#badge-form').reportValidity())download(state.format,exp.dataset.export,exp);return;}
 if(event.target.closest('#remove-logo')){state.partnerImage='';render('badge',{reset:false});}
});
document.addEventListener('input',event=>{if(!event.target.closest('#badge-form'))return;const {name,value,checked}=event.target;if(['year','partnerName'].includes(name)){state[name]=value;updatePreview();}if(name==='guides'){state.guides=checked;updatePreview();}});
document.addEventListener('change',event=>{if(event.target.id==='library-tier'){state.tier=event.target.value;render('library',{reset:false});return;}if(event.target.id==='logo-upload'){uploadLogo(event.target.files[0]);return;}if(!event.target.closest('#badge-form'))return;const {name,value}=event.target;if(name==='format'){state.format=value;render('badge',{reset:false});}else if(name==='tier'||name==='symbolSize'){state[name]=value;updatePreview();}else if(name==='scale')state.scale=Number(value);});
async function uploadLogo(file){
 if(!file)return;if(file.size>5*1024*1024){toast('Please choose a logo smaller than 5 MB.');return;}if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type)){toast('Please use a .svg, .png, .webp or .jpg logo.');return;}const url=URL.createObjectURL(file);
 try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);state.partnerImage=canvas.toDataURL('image/png');render('badge',{reset:false});toast('Partner logo added.');}catch{toast('This logo could not be read. Try a transparent .png.');}finally{URL.revokeObjectURL(url);}
}
const dialog=document.querySelector('#search-dialog');
function searchResults(query=''){const q=query.trim().toLowerCase(),matches=[...currentSections().map(([id,name])=>({title:name,subtitle:'Guidelines',section:id})),...currentFormats().map(f=>({title:f.name,subtitle:state.workspace==='ambassadors'?'Community asset':'Badge format',format:f.id}))].filter(item=>`${item.title} ${item.subtitle}`.toLowerCase().includes(q));document.querySelector('#search-results').innerHTML=matches.length?matches.map(item=>`<button class="search-result" ${item.format?`data-search-format="${item.format}"`:`data-search-section="${item.section}"`}><span>${item.title}<small>${item.subtitle}</small></span>${icon('arrow')}</button>`).join(''):'<div class="empty-search">No results. Try another search.</div>';hydrateIcons(dialog);}
document.querySelector('#search-toggle').addEventListener('click',()=>{searchResults(document.querySelector('#search-input').value);dialog.showModal();document.querySelector('#search-input').focus();});
document.querySelector('#close-search').addEventListener('click',()=>dialog.close());
document.querySelector('#search-input').addEventListener('input',event=>searchResults(event.target.value));
dialog.addEventListener('click',event=>{if(event.target===dialog){dialog.close();return;}const result=event.target.closest('[data-search-format],[data-search-section]');if(!result)return;dialog.close();if(result.dataset.searchFormat){state.format=result.dataset.searchFormat;navigate('create',state.format);}else navigate('guidelines',result.dataset.searchSection);});
function syncThemeButton(){const light=document.documentElement.dataset.theme==='light',button=document.querySelector('#theme-toggle');button.setAttribute('aria-label',light?'Switch to dark appearance':'Switch to light appearance');button.innerHTML=icon(light?'sun':'moon');hydrateIcons(button);}
document.querySelector('#theme-toggle').addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='light'?'dark':'light';setThemeInstantly(theme);try{localStorage.setItem('lovable-hub-theme',theme);}catch{}document.querySelector('meta[name="theme-color"]').content=theme==='light'?'#f7f4ed':'#1b1b1b';syncThemeButton();});
syncThemeButton();
function openHash(){const {workspace,view,section}=parseRoute();state.workspace=workspace;if(view==='badge'){navigate('create',currentFormats().some(format=>format.id===section)?section:undefined);return;}const valid=['gallery','library','guidelines','create'].includes(view)?view:'gallery';render(valid);if(valid==='guidelines'&&currentSections().some(([id])=>id===section))guidelineNavigation?.go(section,'instant');}
window.addEventListener('hashchange',openHash);
const typographyReady=prepareTypography();
makeHomePreview?.mountProfilePreview((role,previous)=>{
 const current=parseRoute(),allowed=previewRoute(role,current);
 if(document.querySelector('.partner-studio iframe')&&current.workspace===allowed.workspace&&current.view===allowed.view){
  if((role==='external')!==(previous==='external')){navigate('create');return;}
  syncPreviewNavigation();return;
 }
 openHash();
});
if(parseRoute().workspace==='partners')await typographyReady;
openHash();
warmGallery(parseRoute().workspace);
if(parseRoute().workspace!=='lovable')setTimeout(()=>warmGallery(parseRoute().workspace==='partners'?'ambassadors':'partners'),200);
document.querySelectorAll('[data-workspace]').forEach(button=>button.addEventListener('pointerenter',()=>warmGallery(button.dataset.workspace)));

document.querySelector('[data-brand-link]').addEventListener('pointerenter',()=>warmGallery('lovable'));
