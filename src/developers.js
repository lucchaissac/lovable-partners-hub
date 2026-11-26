import {createElement,BookOpen,Layers,KeyRound,Moon,Sun,FileJson,Copy,Upload,ChevronDown,Check} from 'lucide';
import {setThemeInstantly} from '../shared/instantTheme.js';
const icons={'book-open':BookOpen,layers:Layers,'key-round':KeyRound,moon:Moon,sun:Sun,'file-json':FileJson,copy:Copy,upload:Upload};
document.querySelectorAll('[data-icon]').forEach(el=>el.replaceWith(createElement(icons[el.dataset.icon],{'aria-hidden':'true','stroke-width':1.8})));
const $=id=>document.getElementById(id),base=location.origin+'/api/hub/v1';
const select=$('shared-workspace'),wrap=document.createElement('span');wrap.className='select-control';select.replaceWith(wrap);wrap.append(select,createElement(ChevronDown,{class:'select-chevron','aria-hidden':'true'}));
function themeIcon(){const light=document.documentElement.dataset.theme==='light';$('theme-toggle').replaceChildren(createElement(light?Sun:Moon,{width:18,height:18,'aria-hidden':'true'}));$('theme-toggle').setAttribute('aria-label',`Switch to ${light?'dark':'light'} appearance`);}
$('theme-toggle').onclick=()=>{const theme=document.documentElement.dataset.theme==='light'?'dark':'light';setThemeInstantly(theme);try{localStorage.setItem('lovable-hub-theme',theme);}catch{}themeIcon();};themeIcon();
$('read-code').textContent=`curl '${base}/guidelines?workspace=lovable' \\\n  -H "Authorization: Bearer $HUB_KEY"`;
$('write-code').textContent=`# request.json contains { "document": { … } }\ncurl '${base}/designs?workspace=lovable' \\\n  -H "Authorization: Bearer $HUB_KEY" \\\n  -H 'Content-Type: application/json' \\\n  --data-binary @request.json\n\n# Read the design first, then retain its quoted ETag.\ncurl -X PUT '${base}/designs/DESIGN_ID?workspace=lovable' \\\n  -H "Authorization: Bearer $HUB_KEY" \\\n  -H 'Content-Type: application/json' \\\n  -H 'If-Match: "REVISION_FROM_LAST_READ"' \\\n  --data-binary @updated-request.json`;
document.querySelectorAll('[data-copy]').forEach(button=>button.onclick=async()=>{try{await navigator.clipboard.writeText($(button.dataset.copy).textContent);button.replaceChildren(createElement(Check));setTimeout(()=>button.replaceChildren(createElement(Copy)),1500);}catch{$('access-status').textContent='Clipboard unavailable. Select and copy the example text.';}});
let access,token='',epoch=0,selected,nextCursor,uploadMode='create';
function clearDesigns(){selected=undefined;nextCursor=undefined;$('shared-list').replaceChildren();$('selected-design').hidden=true;$('more-designs').hidden=true;}
function disconnect(){epoch++;access=undefined;token='';clearDesigns();$('access-details').replaceChildren();select.replaceChildren(new Option('Connect first',''));select.disabled=true;for(const id of ['load-designs','create-design','download-example'])$(id).disabled=true;$('disconnect').hidden=true;$('access-status').textContent='Not connected.';$('design-status').textContent='Connect to view shared designs.';}
$('access-key').oninput=disconnect;$('disconnect').onclick=()=>{$('access-key').value='';disconnect();};
async function request(path,options={},credential=token){
  const response=await fetch(base+path,{...options,credentials:'omit',cache:'no-store',headers:{Authorization:'Bearer '+credential,...options.headers}});
  let data;try{data=await response.json();}catch{throw Error('The hub returned an unreadable response.');}
  if(!response.ok)throw Error(data.error||'Request failed.');return {data,etag:response.headers.get('etag')};
}
function permissions(){const can=scope=>access?.scopes.includes(scope);select.disabled=!access;$('load-designs').disabled=!can('designs:read');$('create-design').disabled=!can('designs:write');$('download-example').disabled=!can('templates:read');$('update-design').disabled=!can('designs:write');}
$('access-form').onsubmit=async event=>{
  event.preventDefault();disconnect();const attempt=epoch,credential=$('access-key').value.trim();$('access-status').textContent='Checking access…';
  try{const {data}=await request('/me',{},credential);if(epoch!==attempt)return;access=data;token=credential;$('access-status').textContent=`Connected as ${data.name}. Expires ${new Date(data.expiresAt).toLocaleDateString()}.`;$('disconnect').hidden=false;
    select.replaceChildren(...data.workspaces.map(w=>new Option({lovable:'Lovable',partners:'Partners',ambassadors:'Community','tech-blog':'Tech blog'}[w],w)));
    $('access-details').replaceChildren(...data.scopes.map(scope=>{const tag=document.createElement('span');tag.textContent=scope;return tag;}));permissions();$('design-status').textContent='Choose a workspace to load its shared designs.';
  }catch(error){if(epoch===attempt)$('access-status').textContent=error.message;}
};
select.onchange=()=>{epoch++;clearDesigns();$('design-status').textContent='Load this workspace’s shared designs.';};
async function loadDesigns(more=false){
  const attempt=epoch,workspace=select.value;$('design-status').textContent='Loading shared designs…';$('load-designs').disabled=true;
  try{const {data}=await request(`/designs?workspace=${workspace}${more&&nextCursor?'&cursor='+encodeURIComponent(nextCursor):''}`);if(attempt!==epoch)return;
    if(!more)clearDesigns();for(const design of data.data){const button=document.createElement('button'),label=document.createElement('span'),date=document.createElement('small');label.textContent=design.title;date.textContent=new Date(design.updatedAt).toLocaleDateString();button.append(label,date);button.onclick=()=>void readDesign(design.id);$('shared-list').append(button);}
    nextCursor=data.nextCursor;$('more-designs').hidden=!nextCursor;$('design-status').textContent=$('shared-list').children.length?'Select a design to download or update it.':'No shared designs in this workspace yet.';
  }catch(error){if(attempt===epoch)$('design-status').textContent=error.message;}finally{permissions();}
}
async function readDesign(id){
  const attempt=epoch,workspace=select.value;$('design-status').textContent='Reading the latest version…';
  try{const result=await request(`/designs/${id}?workspace=${workspace}`);if(attempt!==epoch)return;selected={...result,workspace};$('selected-title').textContent=result.data.title;$('selected-design').hidden=false;$('design-status').textContent='Current version loaded.';permissions();}catch(error){if(attempt===epoch)$('design-status').textContent=error.message;}
}
function download(document){const url=URL.createObjectURL(new Blob([JSON.stringify(document,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(document.title.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,80)||'Design')+'.asset.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('load-designs').onclick=()=>void loadDesigns();$('more-designs').onclick=()=>void loadDesigns(true);
$('download-design').onclick=()=>{if(selected)download(selected.data.document);};$('refresh-design').onclick=()=>{if(selected)void readDesign(selected.data.id);};
$('download-example').onclick=async()=>{const attempt=epoch;try{const {data}=await request('/example?workspace='+select.value);if(attempt===epoch)download(data.document);}catch(error){if(attempt===epoch)$('design-status').textContent=error.message;}};
$('create-design').onclick=()=>{uploadMode='create';$('source-file').click();};$('update-design').onclick=()=>{uploadMode='update';$('source-file').click();};
$('source-file').onchange=async()=>{
  const file=$('source-file').files[0];$('source-file').value='';if(!file)return;
  const attempt=epoch,workspace=select.value,current=selected,updating=uploadMode==='update';
  if(updating&&!current)return;
  $('create-design').disabled=true;$('update-design').disabled=true;$('design-status').textContent=updating?'Saving a new version…':'Sharing the design…';
  try{
    if(file.size>4*1024*1024)throw Error('Choose a single editable source smaller than 4 MiB.');
    const document=JSON.parse(await file.text());if(attempt!==epoch)return;
    if(document.type==='lovable-asset-collection')throw Error('Export a single editable source, rather than the whole collection.');
    // Make imports create a fresh local ID. Update only the explicitly selected shared design.
    if(updating)document.id=current.data.id;
    const result=await request(`/designs${updating?'/'+current.data.id:''}?workspace=${workspace}`,{method:updating?'PUT':'POST',headers:{'Content-Type':'application/json',...(updating?{'If-Match':current.etag}:{})},body:JSON.stringify({document})});
    if(attempt!==epoch)return;await loadDesigns();if(attempt!==epoch)return;await readDesign(result.data.id);if(attempt===epoch)$('design-status').textContent=updating?'New version saved.':'Design shared.';
  }catch(error){if(attempt===epoch)$('design-status').textContent=error.message;}finally{permissions();}
};
window.addEventListener('pagehide',()=>{$('access-key').value='';disconnect();});
