import { COMMUNITY_MARKUP, COMMUNITY_VIEWBOX } from './brand.mjs?v=12';
import { makeOriginalQR } from './original-qr.mjs';
export const FORMATS = {
  banner: { label: 'Roll-up', w: 850, h: 2000, mm: [850, 2000], detail: '85 × 200 cm', print: true },
  poster: { label: 'Poster', w: 1440, h: 720, mm: [1828.8, 914.4], detail: '72 × 36 in', print: true },
  social: { label: 'Event', w: 1200, h: 630, detail: '1200 × 630 px' },
  speakers: { label: 'Speakers', w: 1200, h: 630, detail: '1200 × 630 px' },
  spotlight: { label: 'Spotlight', w: 1080, h: 1080, detail: '1080 × 1080 px' },
  badge: { label: 'Name tag', w: 900, h: 600, mm: [90, 60], detail: '90 × 60 mm', print: true },
};
export const DEFAULTS = { format: 'banner', city: 'Paris', url: 'https://lovable.dev/community', headline: 'Build\nsomething\nLovable.', intro: 'Meet. Make.\nBuild together.', cta: 'Scan to join the community', eventFooter: 'Meet your local Lovable community.', speakerFooter: 'Meet. Make. Build together.', prompt: 'Create a website...', title: 'Build something\nlovable.', date: '', venue: '', name: 'Alex Morgan', role: 'Community ambassador', count: 2, badgeMode: 'single', roster: '', speakers: [{name:'Alex Morgan',role:'Community ambassador',photo:''},{name:'Sam Rivera',role:'Builder & founder',photo:''},{name:'Jordan Lee',role:'Product designer',photo:''}], photo: '' };
export const TEXT_LIMITS={city:45,url:300,headline:120,intro:100,cta:70,eventFooter:90,speakerFooter:90,prompt:60,title:90,date:48,venue:65,name:48,role:55,roster:20000};
export const FIELD_LABELS={city:'City',url:'Community link',headline:'Headline',intro:'Community message',cta:'QR caption',title:'Event title',name:'Name',role:'Title',prompt:'Prompt',eventFooter:'Event caption',speakerFooter:'Speaker caption','event-details':'Date and venue'};
export const getSpeakerCount=value=>[1,2,3].includes(value)?value:DEFAULTS.count;
const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function editZone(content,key,box,enabled){
  if(!enabled)return content;
  const {x,y,w,h,size=20,leading=size*1.2,weight='bold',tracking=0,lines=1,align='left',empty=false}=box;
  const label=FIELD_LABELS[key]||(key.includes('role')?'Title':key.startsWith('photo-')?'Photo':'Name');
  return `<g class="edit-zone" data-edit="${escape(key)}" data-width="${w}" data-size="${size}" data-leading="${leading}" data-weight="${weight}" data-tracking="${tracking}" data-lines="${lines}" data-align="${align}" data-empty="${empty}" tabindex="0" role="button" aria-label="Edit ${label}"><g class="edit-content">${content}</g><rect class="edit-hit" x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/><title>Click to edit ${label.toLowerCase()}</title></g>`;
}
const locations = {paris:[48.86,2.35],london:[51.51,-.13],berlin:[52.52,13.4],stockholm:[59.33,18.07],amsterdam:[52.37,4.9],madrid:[40.42,-3.7],lisbon:[38.72,-9.14],rome:[41.9,12.5],toronto:[43.65,-79.38],montreal:[45.5,-73.57],miami:[25.76,-80.19],boston:[42.36,-71.06],chicago:[41.88,-87.63],austin:[30.27,-97.74],'new york':[40.71,-74.01],'san francisco':[37.77,-122.42],'los angeles':[34.05,-118.24],'mexico city':[19.43,-99.13],'sao paulo':[-23.55,-46.63],lagos:[6.52,3.38],nairobi:[-1.29,36.82],'cape town':[-33.92,18.42],mumbai:[19.08,72.88],bangalore:[12.97,77.59],singapore:[1.35,103.82],tokyo:[35.68,139.69],sydney:[-33.87,151.21],melbourne:[-37.81,144.96],dubai:[25.2,55.27],seoul:[37.57,126.98]};
export function cityLocation(city,index={}) {
  const key=city.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
  const alias={sf:'san francisco',nyc:'new york',la:'los angeles'};
  const name=Object.hasOwn(alias,key)?alias[key]:key;
  const point=Object.hasOwn(locations,name)?locations[name]:Object.hasOwn(index,name)?index[name]:null;
  return Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)?point:null;
}
export function safeUrl(value) { try { const u=new URL(value); return ['https:','http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; } }
export function parseRoster(value) { return value.split(/\r?\n/).filter(s=>s.trim()).map(line=>{const [name,...rest]=line.split(','); return {name:name.trim(),role:rest.join(',').trim()};}); }
export function sheetPages(rows) { return Math.max(1, Math.ceil(rows.length/8)); }
export function getDimensions(state) { const f=FORMATS[state.format]||FORMATS.banner; return state.format==='badge'&&state.badgeMode==='sheet'?{w:210,h:297,mm:[210,297]}:{w:f.w,h:f.h,mm:f.mm||[f.w*25.4/96,f.h*25.4/96]}; }
export function getPngSize(state) { const f=FORMATS[state.format]; if(state.format==='badge')return state.badgeMode==='sheet'?[2480,3508]:[1063,709]; if(state.format==='spotlight')return[2160,2160]; if(!f.print)return[f.w,f.h]; return f.w>f.h?[3600,Math.round(3600*f.h/f.w)]:[2400,Math.round(2400*f.h/f.w)]; }
export function withBleed(svg,dimensions,enabled) { if(!enabled)return svg;const b=3*dimensions.w/dimensions.mm[0],w=dimensions.w+2*b,h=dimensions.h+2*b;return svg.replace(/viewBox="[^"]*"/,`viewBox="${-b} ${-b} ${w} ${h}"`).replace(/width="[^"]*" height="[^"]*"/,`width="${w}" height="${h}"`).replace(/(<title>.*?<\/title>)/,'$1'+`<rect x="${-b}" y="${-b}" width="${w}" height="${h}" fill="#1b1b1b"/>`); }
export function applyPdfBoxes(pdf,size,bleed) {const context=pdf.internal.getCurrentPageInfo().pageContext,pt=72/25.4,b=bleed?3:0;context.trimBox={bottomLeftX:b*pt,bottomLeftY:b*pt,topRightX:(size.mm[0]+b)*pt,topRightY:(size.mm[1]+b)*pt};context.bleedBox={...context.mediaBox};}
export function validateDetails(state) {
  if(!state.city.trim())return 'Add your city to get started.';
  if(['banner','poster'].includes(state.format)&&!safeUrl(state.url))return 'Add a valid https:// or http:// community link.';
  if(['social','speakers'].includes(state.format)&&!state.title.trim())return 'Add an event title.';
  const rows=state.format==='badge'&&state.badgeMode==='sheet'?parseRoster(state.roster):[];
  if(rows.length>200)return 'Please use up to 200 guests per download.';
  if(rows.some(row=>!row.name||row.name.length>48||row.role.length>55))return 'Each guest needs a name (up to 48 characters) and an optional title (up to 55).';
  if(['spotlight','badge'].includes(state.format)&&!state.name.trim()&&!rows.length)return 'Add a name.';
  if(state.format==='speakers'&&state.speakers.slice(0,state.count).some(s=>!s.name.trim()))return 'Add a name for each speaker.';
  return '';
}
export function createRenderer({bold,regular,qrcode,heartOverlay}) {
  const ink='#f7f4ed';
  const originalQR=makeOriginalQR(qrcode);
  const fonts={bold,regular};
  let layers=null,layerScale=1;
  const layer=value=>{if(layers)layers.push({...value,x:value.x*layerScale,y:value.y*layerScale,w:value.w*layerScale,h:value.h*layerScale,...(value.size?{size:value.size*layerScale,leading:value.leading*layerScale}:{} )});};
  const width=(s,size,weight='bold')=>fonts[weight].getAdvanceWidth(s,size,{kerning:true});
  function text(s,x,y,size,maxWidth,weight='bold',color=ink) {
    s=String(s||''); size=Math.min(size,maxWidth?size*maxWidth/Math.max(1,width(s,size,weight)):size);
    const d=fonts[weight].getPath(s,x,y,size,{kerning:true}).toPathData(2);
    return `<path d="${d}" fill="${color}" aria-label="${escape(s)}"/>`;
  }
  const image=(src,x,y,w,h)=>`<image href="${src}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
  // These are the original poster's 595 px geometry, line-height and tracking.
  function posterText(s,x,top,size,lineHeight,maxWidth=515,weight='bold',tracking=-.01) {
    const font=fonts[weight],opts={kerning:true,letterSpacing:tracking};
    const advance=font.getAdvanceWidth(s,size,opts);size=Math.min(size,size*maxWidth/Math.max(1,advance));
    const baseline=top+(lineHeight+(font.ascender+font.descender)*size/font.unitsPerEm)/2;
    return `<path d="${font.getPath(s,x,baseline,size,opts).toPathData(2)}" fill="${ink}" aria-label="${escape(s)}"/>`;
  }
  function editableBlock(key,value,x,y,size,leading,w,maxLines,enabled,tracking=-.01,weight='bold',align='left') {
    value=String(value??'');
    let rows=value.split('\n');
    if(rows.length>maxLines)rows=[...rows.slice(0,maxLines-1),rows.slice(maxLines-1).join(' ')];
    const font=fonts[weight],opts={kerning:true,letterSpacing:tracking};
    const actual=Math.min(size,...rows.map(row=>size*w/Math.max(1,font.getAdvanceWidth(row,size,opts))));
    layer({kind:'text',key,text:rows.join('\n'),x,y,w,h:leading*Math.max(1,rows.length),size:actual,leading,weight,tracking,align});
    const body=rows.map((row,i)=>posterText(row,align==='right'?x+w-font.getAdvanceWidth(row,actual,opts):x,y+i*leading,actual,leading,w,weight,tracking)).join('');
    const placeholder=enabled&&!value?`<g class="edit-placeholder">${posterText('Add '+(FIELD_LABELS[key]||'text').toLowerCase(),x,y,Math.min(size,24),leading,w,'regular',0)}</g>`:'';
    return editZone(body+placeholder,key,{x,y,w,h:leading*maxLines,size:actual,leading,weight,tracking,lines:maxLines,align,empty:!value},enabled);
  }
  function headerCity(value,x,w,logoY,logoScale,size,leading,enabled) {
    const opts={kerning:true,letterSpacing:-.01};
    const actual=Math.min(size,size*w/Math.max(1,bold.getAdvanceWidth(value,size,opts)));
    const bounds=bold.getPath(value||'City',0,0,actual,opts).getBoundingBox();
    // Centre the visible letters on the wordmark, including when a long city shrinks.
    const baseline=logoY+19.8862*270/470.029*logoScale-(bounds.y1+bounds.y2)/2;
    const top=baseline-(leading+(bold.ascender+bold.descender)*actual/bold.unitsPerEm)/2;
    return editableBlock('city',value,x,top,size,leading,w,1,enabled,-.01,'bold','right');
  }
  function posterLogo(x=40,y=40,scale=1) {
    const width=270*scale,height=width*46.1959/470.029;
    layer({kind:'logo',key:'logo',x,y,w:width,h:height});
    return `<svg data-artwork="lovable-community-logo" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${COMMUNITY_VIEWBOX}" aria-label="Lovable Community">${COMMUNITY_MARKUP}</svg>`;
  }
  function qr(url,x,y,size) {
    if(!url)return '';
    layer({kind:'qr',key:'url',x,y,w:size,h:size});
    return `<g transform="translate(${x} ${y}) scale(${size/129})">${originalQR(url).replace('<svg viewBox=', '<svg width="129" height="129" viewBox=')}</g>`;
  }
  function portrait(src,x,y,size,name,id) {
    layer({kind:'portrait',key:id.startsWith('speaker')?'photo-'+id.slice(7):'photo',src,x,y,w:size,h:size});
    if(src)return `<defs><clipPath id="photo-${id}"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size/2}"/></clipPath></defs><image href="${escape(src)}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#photo-${id})"/>`;
    return `<circle data-artwork="portrait-placeholder" cx="${x+size/2}" cy="${y+size/2}" r="${size/2}" fill="#1b1b1b"/>`;
  }

  function globeLayer(src,x,y,size,live=false) {
    layer({kind:'globe',key:'globe',x,y,w:size,h:size});
    if(live)return `<rect class="live-globe-slot" x="${x}" y="${y}" width="${size}" height="${size}" fill="transparent" pointer-events="none"/>`;
    return src?`<g data-artwork="original-3d-globe">${image(src,x,y,size,size)}</g>`:'';
  }
  function foregroundHeart(cx,cy,size) {
    const angle=-9.91*Math.PI/180,dy=size*.00404;
    layer({kind:'glow',key:'glow',x:cx-dy*Math.sin(angle)-size/2,y:cy+dy*Math.cos(angle)-size*1.00808/2,w:size,h:size*1.00808,rotation:-9.91});
    return heartOverlay?`<g data-artwork="foreground-heart" transform="translate(${cx} ${cy}) rotate(-9.91)">${image(heartOverlay,-size/2,-size/2,size,size*1.00808)}</g>`:'';
  }
  function tag(state,name=state.name,role=state.role,options={},row=null) {
    const enabled=options.editable;
    return `<rect data-background="true" width="900" height="600" rx="48" fill="#1b1b1b"/>`+
      posterLogo(54,54,1.1)+headerCity(state.city,540,306,54,1.1,27,36,enabled)+
      editableBlock(row===null?'name':`roster-name-${row}`,name,60,238,104,112,780,1,enabled,-.02)+
      editableBlock(row===null?'role':`roster-role-${row}`,role,60,356,34,44,780,1,enabled);

  }
  function render(state,options={}) {
    const f=FORMATS[state.format]||FORMATS.banner,city=state.city||'Your city',url=safeUrl(state.url);let body='';let w=f.w,h=f.h;
    if(state.format==='badge'&&state.badgeMode==='sheet') {
      w=210;h=297;body='<rect data-background="true" width="210" height="297" fill="white"/>';
      const rows=parseRoster(state.roster);const page=options.page||0;
      for(let i=0;i<8;i++){
        const row=rows.length?rows[page*8+i]:{name:state.name,role:state.role};if(!row)continue;
        const x=12+(i%2)*96,y=20+Math.floor(i/2)*66;
        body+=`<svg x="${x}" y="${y}" width="90" height="60" viewBox="0 0 900 600" overflow="hidden">${tag(state,row.name,row.role,options,rows.length?page*8+i:null)}</svg>`;
        for(const [cx,cy] of [[x,y],[x+90,y],[x,y+60],[x+90,y+60]])body+=`<path d="M${cx-2} ${cy}h-2M${cx+2} ${cy}h2M${cx} ${cy-2}v-2M${cx} ${cy+2}v2" fill="none" stroke="#888" stroke-width=".15"/>`;
      }
      body+=text(`Lovable community · ${page+1} / ${sheetPages(rows)} · Print at 100%`,12,292,2.7,185,'regular','#666666');
    } else if(state.format==='badge') body=tag(state,state.name,state.role,options);
    else if(state.format==='banner') {
      // Only the oversized scene continues down the roll-up. All information stays above 90 cm.
      body=`<rect data-background="true" width="${w}" height="${h}" fill="#1b1b1b"/><g transform="scale(${w/595})">`+
        globeLayer(options.globeImage,-267.5,590,1280,options.liveGlobe)+foregroundHeart(225.5,1510,2250)+
        `<g data-layout="local-community" data-content-bottom="900">`+
        posterLogo()+headerCity(state.city,345,210,40,1,29,37.76,options.editable)+
        editableBlock('headline',state.headline??DEFAULTS.headline,35,148,82,75,525,3,options.editable,-.02)+
        editableBlock('intro',state.intro??DEFAULTS.intro,40,438,30,36,330,2,options.editable)+
        editableBlock('cta',state.cta??DEFAULTS.cta,40,548,20,30,335,1,options.editable)+editZone(qr(url,426,438,129),'url',{x:426,y:438,w:129,h:129},options.editable)+'</g></g>';
    } else if(state.format==='poster') {
      // Align the QR with the visible top and bottom of the adjacent copy.
      const qrBox={x:508,y:536,w:122,h:122};
      body=`<rect data-background="true" width="${w}" height="${h}" fill="#1b1b1b"/>`+
        globeLayer(options.globeImage,550,-60,1380,options.liveGlobe)+foregroundHeart(620,1020,3000)+
        `<g data-layout="local-community">`+posterLogo(64,64,1.6)+headerCity(state.city,1061,315,64,1.6,39,51,options.editable)+
        editableBlock('headline',state.headline??DEFAULTS.headline,54,178,110,99,705,3,options.editable,-.02)+
        editableBlock('intro',state.intro??DEFAULTS.intro,64,528,29,36,350,2,options.editable)+
        editableBlock('cta',state.cta??DEFAULTS.cta,64,631,22,30,350,1,options.editable)+editZone(qr(url,qrBox.x,qrBox.y,qrBox.w),'url',qrBox,options.editable)+'</g>';
    } else if(state.format==='spotlight') {
      if(!options.spotlightImage)throw Error('The original spotlight frame is not ready.');
      body=image(options.spotlightImage,0,0,1080,1080);
    } else if(state.format==='speakers') {
      body=`<rect data-background="true" width="${w}" height="${h}" fill="#1b1b1b"/>`+
        globeLayer(options.globeImage,550,-100,1180,options.liveGlobe)+foregroundHeart(520,1020,2700)+
        posterLogo(48,48,1.34)+headerCity(state.city,850,302,48,1.34,32.6,42.7,options.editable)+
        editableBlock('title',state.title,48,126,70,66,740,2,options.editable,-.02)+
        editableBlock('event-details',[state.date,state.venue].filter(Boolean).join('  ·  '),48,272,24,32,1104,1,options.editable,0,'regular');
      const count=getSpeakerCount(state.count),step=count===3?368:352,columnWidth=count===1?668:step-36;
      for(let i=0;i<count;i++){
        const s=state.speakers[i],x=48+i*step;
        body+=editZone(portrait(s.photo,x,320,176,s.name,'speaker'+i),`photo-${i}`,{x,y:320,w:176,h:176},options.editable)+
          editableBlock(`speaker-name-${i}`,s.name,x,516,38,46,columnWidth,1,options.editable,-.01)+
          editableBlock(`speaker-role-${i}`,s.role,x,566,24,32,columnWidth,1,options.editable,-.01,'regular');
      }
    } else {
      body=`<rect data-background="true" width="${w}" height="${h}" fill="#1b1b1b"/>`+
        `<g data-background="true">${foregroundHeart(520,900,2600)}</g>`+
        globeLayer(options.globeImage,550,0,1250,options.liveGlobe)+
        posterLogo(48,48,1.34)+headerCity(state.city,850,302,48,1.34,32.6,42.7,options.editable)+
        editableBlock('title',state.title,48,166,96,88,710,3,options.editable,-.02)+
        editableBlock('event-details',[state.date,state.venue].filter(Boolean).join('  ·  '),48,510,26,34,1000,1,options.editable)+
        editableBlock('eventFooter',state.eventFooter??DEFAULTS.eventFooter,48,569,24,32,1050,1,options.editable,0,'regular');
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="${options.editable?'group':'img'}" aria-label="${escape(f.label+' — '+city)}"><title>${escape(f.label+' — '+city)}</title>${body}</svg>`;
  }
  function unsupported(state) { const fields=state.format==='badge'?[state.city,state.name,state.role,...parseRoster(state.roster).flatMap(s=>[s.name,s.role])]:state.format==='speakers'?[state.city,state.title,state.date,state.venue,...state.speakers.slice(0,state.count).flatMap(s=>[s.name,s.role])]:state.format==='social'?[state.city,state.title,state.date,state.venue,state.eventFooter]:state.format==='spotlight'?[state.city,state.name,state.role]:[state.city,state.headline,state.intro,state.cta];return [...new Set(Array.from(fields.join('')).filter(c=>!/[\s]/.test(c)&&!bold.charToGlyphIndex(c)))].join(' '); }
  function layout(state){
    layers=[];layerScale=state.format==='banner'?FORMATS.banner.w/595:1;
    try{render(state);return layers;}finally{layers=null;layerScale=1;}
  }
  return {render,unsupported,layout};
}
