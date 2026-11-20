/** Runs in the importer's isolated renderer. Reads the rendered DOM, never model output. */
export function extractWebPageDom(){
 const width=1440,height=900,layers=[],visuals=[],warnings=[];
 let serial=0,visited=0,rasterBytes=0;
 const color=value=>{
  if(!value||value==='transparent')return 'transparent';
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
  const context=canvas.getContext('2d');context.fillStyle=value;context.fillRect(0,0,1,1);
  const rgba=context.getImageData(0,0,1,1).data;
  return rgba[3]===0?'transparent':'#'+[...rgba].map(n=>n.toString(16).padStart(2,'0')).join('');
 };
 const rect=r=>({x:r.left,y:r.top,width:r.width,height:r.height});
 const intersects=(r,clip)=>r.width>.4&&r.height>.4&&r.right>clip.left&&r.bottom>clip.top&&r.left<clip.right&&r.top<clip.bottom;
 const clipRect=(r,clip)=>{const left=Math.max(r.left,clip.left),top=Math.max(r.top,clip.top),right=Math.min(r.right,clip.right),bottom=Math.min(r.bottom,clip.bottom);return {left,top,right,bottom,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};};
 const add=(layer,visual)=>{
  if(layers.length>=240){if(!warnings.length)warnings.push('The visible page contains more than 240 elements; the import was limited to the first 240.');return;}
  const id=`dom-${++serial}`;layers.push({id,...layer});if(visual)visuals.push({id,...visual});
 };
 const frame=(r,style,opacity)=>({...rect(r),radius:Math.min(1500,parseFloat(style.borderTopLeftRadius)||0),opacity:opacity*100});
 const pngCanvas=element=>{try{
  if(Math.max(element.width,element.height)>2400){const ratio=2400/Math.max(element.width,element.height),copy=document.createElement('canvas');copy.width=Math.max(1,Math.round(element.width*ratio));copy.height=Math.max(1,Math.round(element.height*ratio));copy.getContext('2d').drawImage(element,0,0,copy.width,copy.height);element=copy;}
  const data=element.toDataURL('image/png');if(data.length>2_400_000||rasterBytes+data.length>20_000_000)return null;rasterBytes+=data.length;return data;
 }catch{return null;}};
 const imagePixels=element=>{
  if(!element.complete||!element.naturalWidth)return null;
  try{const ratio=Math.min(1,2400/Math.max(element.naturalWidth,element.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(element.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(element.naturalHeight*ratio));canvas.getContext('2d').drawImage(element,0,0,canvas.width,canvas.height);return pngCanvas(canvas);}catch{return null;}
 };
 const originalSvg=element=>{
  const clone=element.cloneNode(true),original=[element,...element.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
  const allowed=new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon','defs','lineargradient','radialgradient','stop','clippath','mask','use','title','desc']);
  for(let i=0;i<copies.length;i++){
   const copy=copies[i],source=original[i];
   if(!allowed.has(copy.tagName.toLowerCase())){copy.remove();continue;}
   for(const attribute of [...copy.attributes])if(/^on/i.test(attribute.name)||['style','class','id'].includes(attribute.name)&&attribute.name!=='id'||/href$/i.test(attribute.name)&&!attribute.value.startsWith('#'))copy.removeAttribute(attribute.name);
   const style=getComputedStyle(source);
   for(const name of ['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','fill-rule','clip-rule','fill-opacity','stroke-opacity','opacity','stop-color','stop-opacity']){
    const value=style.getPropertyValue(name);if(value&&!/url\(/.test(value))copy.setAttribute(name,value);
   }
   copy.removeAttribute('filter');
  }
  clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('opacity','1');
  return new XMLSerializer().serializeToString(clone);
 };
 const textLayer=(node,style,clip,opacity)=>{
  const raw=node.textContent??'';if(!raw.trim())return;
  const range=document.createRange();range.selectNodeContents(node);const bounds=range.getBoundingClientRect();
  if(!intersects(bounds,clip))return;
  const fontSize=Math.max(1,Math.min(1000,parseFloat(style.fontSize)||16)),linePx=parseFloat(style.lineHeight)||fontSize*1.2;
  const lines=[],visibleRects=[];let lastTop;
  // Range measurements preserve the browser's actual wraps, including nested spans.
  for(let i=0;i<Math.min(raw.length,8000);i++){
   range.setStart(node,i);range.setEnd(node,i+1);const r=range.getBoundingClientRect();if(!r.width||!intersects(r,clip)||r.bottom>clip.bottom+1||r.top<clip.top-1)continue;
   visibleRects.push(r);
   if(lastTop===undefined||Math.abs(r.top-lastTop)>fontSize*.35){lines.push('');lastTop=r.top;}
   lines[lines.length-1]+=raw[i];
  }
  const text=lines.map(line=>line.replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');if(!text)return;
  const left=Math.min(...visibleRects.map(r=>r.left)),right=Math.max(...visibleRects.map(r=>r.right)),top=Math.min(...visibleRects.map(r=>r.top));
  const align=style.textAlign==='center'?'center':style.textAlign==='right'||style.textAlign==='end'?'right':'left';
  add({kind:'text',x:left,y:top-(linePx-visibleRects[0].height)/2,width:right-left,height:linePx*lines.length,text,align,fontSize,fontWeight:Math.max(600,Math.min(900,parseInt(style.fontWeight)||600)),lineHeight:Math.max(50,Math.min(300,linePx/fontSize*100)),letterSpacing:Math.max(-20,Math.min(100,parseFloat(style.letterSpacing)||0)),color:color(style.color),opacity:opacity*100});
 };
 const bodyStyle=getComputedStyle(document.body),htmlStyle=getComputedStyle(document.documentElement);
 add({kind:'shape',x:0,y:0,width,height,fill:color(bodyStyle.backgroundColor)!=='transparent'?color(bodyStyle.backgroundColor):color(htmlStyle.backgroundColor)!=='transparent'?color(htmlStyle.backgroundColor):'#ffffff'});
 const walk=(element,clip,opacity)=>{
  if(++visited>12000||layers.length>=240)return;
  const tag=element.tagName.toLowerCase();if(['script','style','link','meta','noscript','template','head'].includes(tag))return;
  const style=getComputedStyle(element),alpha=opacity*(parseFloat(style.opacity)||0);
  if(style.display==='none'||style.visibility==='hidden'||alpha<.01)return;
  const bounds=element.getBoundingClientRect(),visible=intersects(bounds,clip);
  if(visible){
   const box=clipRect(bounds,clip),base=frame(box,style,alpha),fill=color(style.backgroundColor),borderWidth=Math.min(24,parseFloat(style.borderTopWidth)||0);
   const background=style.backgroundImage;
   if(fill!=='transparent'||borderWidth>0)add({kind:'shape',...base,fill,borderWidth,borderColor:color(style.borderTopColor)});
   if(background&&background!=='none'&&visuals.length<50)add({kind:'image',...base,alt:'Page background'},{kind:'background',width:bounds.width,height:bounds.height,clip:{x:box.left-bounds.left,y:box.top-bounds.top,width:box.width,height:box.height},css:{backgroundImage:background,backgroundSize:style.backgroundSize,backgroundPosition:style.backgroundPosition,backgroundRepeat:style.backgroundRepeat,borderRadius:style.borderRadius}});
   if(tag==='svg'){
    if(visuals.length<50)add({kind:'image',...base,alt:element.getAttribute('aria-label')||'Original page icon'},{kind:'svg',svg:originalSvg(element)});
    return;
   }
   if(tag==='img'){
    if(visuals.length<50&&element.currentSrc)add({kind:'image',...base,alt:(element.alt||'Page image').slice(0,500)},{kind:'image',url:element.currentSrc,data:imagePixels(element),fit:style.objectFit==='contain'?'contain':'cover',position:style.objectPosition});return;
   }
   if(tag==='canvas'){
    const data=pngCanvas(element);if(data&&visuals.length<50)add({kind:'image',...base,alt:'Page artwork'},{kind:'image',data,fit:'fill'});
    else warnings.push('A canvas visual could not be embedded.');return;
   }
   if(tag==='video'){
    if(element.poster&&visuals.length<50)add({kind:'image',...base,alt:'Video poster'},{kind:'image',url:element.poster,fit:'cover'});else warnings.push('A video without a poster was omitted.');return;
   }
   if(tag==='iframe'){warnings.push('Embedded frames are not imported in this V1.');return;}
   if(['input','textarea'].includes(tag)){
    const text=element.value||element.placeholder;
    if(text&&element.type!=='password'){const x=bounds.left+(parseFloat(style.paddingLeft)||0),y=bounds.top+(parseFloat(style.paddingTop)||0);add({kind:'text',x,y,width:Math.max(1,bounds.width-(x-bounds.left)*2),height:Math.max(parseFloat(style.lineHeight)||24,bounds.height-(y-bounds.top)*2),text:text.slice(0,8000),fontSize:parseFloat(style.fontSize)||16,fontWeight:600,lineHeight:125,color:color(style.color),opacity:alpha*100});}
    return;
   }
  }
  let childClip=clip;if(/hidden|clip|scroll|auto/.test(style.overflow+style.overflowX+style.overflowY))childClip=clipRect(bounds,clip);
  // Stable z-index order keeps positioned overlays above their siblings.
  const children=[...element.childNodes].sort((a,b)=>{const z=n=>n.nodeType===1?(parseInt(getComputedStyle(n).zIndex)||0):0;return z(a)-z(b);});
  for(const child of children){if(child.nodeType===3)textLayer(child,style,childClip,alpha);else if(child.nodeType===1)walk(child,childClip,alpha);}
  if(element.shadowRoot)for(const child of element.shadowRoot.children)walk(child,childClip,alpha);
 };
 walk(document.body,{left:0,top:0,right:width,bottom:height,width,height},1);
 return {title:document.title.slice(0,200),layers,visuals,warnings:[...new Set(warnings)].slice(0,12)};
}
