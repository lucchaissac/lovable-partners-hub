import {readFile,writeFile} from 'node:fs/promises';
import opentype from 'opentype.js';
import {createRenderer,DEFAULTS} from '../src/ambassadors/source/renderer.mjs';
import qrcode from '../src/ambassadors/source/qrcode.js';
import {squareEventLayers} from '../shared/communityStarter.mjs';
import {ambassadorFormats} from '../src/ambassadors/catalog.js';
const root=new URL('../',import.meta.url);
const font=async p=>{const b=await readFile(new URL(p,root));return opentype.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
const bold=await font('public/fonts/CameraPlain-Bold.ttf'),regular=await font('public/ambassadors/assets/CameraPlain-Regular.ttf');
const renderer=createRenderer({bold,regular,qrcode,heartOverlay:''}),layouts={};
for(const f of ambassadorFormats.filter(f=>f.id!=='spotlight'))layouts[f.id]={width:f.width,height:f.height,reference:f.id,layers:renderer.layout({...DEFAULTS,format:f.id}).map(({src,text,...l})=>l)};
layouts['event-square']={width:1080,height:1080,reference:'social',layers:squareEventLayers(renderer.layout({...DEFAULTS,format:'social'})).map(({src,text,...l})=>l)};
// The Spotlight native profile, with fixed editable slots rather than fictional attendee copy.
layouts.spotlight={width:1080,height:1080,reference:'spotlight',layers:[
 {kind:'globe',key:'globe',x:258,y:-62,w:1404,h:1404},
 {kind:'logo',key:'logo',x:64,y:64,w:470.029,h:46.1959},
 {kind:'portrait',key:'photo',x:64,y:200,w:560,h:560},
 {kind:'text',key:'name',x:64,y:780,w:952,h:105,size:96,leading:100.8,weight:'bold'},
 {kind:'text',key:'city',x:64,y:890,w:952,h:66,size:60,leading:66,weight:'bold'},
 {kind:'text',key:'role',x:64,y:977,w:952,h:40,size:36,leading:39.6,weight:'bold'},
]};
const readManual=async(path,keys)=>{
 const data=JSON.parse(await readFile(new URL(path,root),'utf8'));
 return data.map((d,i)=>{const css=Object.fromEntries(d.style.split(';').map(v=>v.trim().split(/:\s*/)).filter(v=>v.length===2)),n=k=>parseFloat(css[k]);
 return {kind:d.kind==='text'?'text':keys[i]==='logo'?'logo':'image',key:keys[i],x:n('left'),y:n('top'),w:n('width'),h:n('min-height'),...(d.kind==='text'?{size:n('--hcs-text-size'),leading:n('--hcs-text-line')*n('--hcs-text-size'),weight:'bold',align:d.align??(i===2?'right':'left')}:{} )};});
};
layouts['editorial-materials']={width:1080,height:1080,reference:'social',layers:await readManual('examples/malaga-community/refinement/luc-layout-reference.json',['visual','logo','city','kicker','title','details','partner-1','partner-0'])};
layouts['editorial-pixel']={width:1080,height:1080,reference:'social',layers:await readManual('examples/montreal-games-week/latest-local-layout.json',['visual','logo','city','title','details','footer','access'])};
const base=[{kind:'logo',key:'logo',x:43.2,y:43.2,w:407.025,h:40.003},{kind:'text',key:'city',x:816.8,y:36.9,w:220,h:48,size:36.675,leading:48,weight:'bold',align:'right'},{kind:'text',key:'title',x:43.2,y:150,w:650,h:350,size:180,leading:165.6,weight:'bold',align:'left'}];
const sub={kind:'text',key:'subtitle',x:610,y:180,w:426.8,h:180,size:52,leading:57.2,weight:'bold',align:'right'};
layouts['editorial-photo']={width:1080,height:1080,reference:'social',layers:[{kind:'image',key:'visual',x:0,y:0,w:1080,h:1080},...base,sub]};
layouts['editorial-collage']={width:1080,height:1080,reference:'social',layers:[{kind:'image',key:'visual',x:0,y:520,w:1160,h:1160},...base,{...sub,y:330,h:170}]};
layouts['editorial-nature']={width:1080,height:1080,reference:'social',layers:[{kind:'image',key:'visual',x:300,y:430,w:970,h:970},...base,sub]};
layouts['editorial-globe']={width:1080,height:1080,reference:'social',layers:[{kind:'globe',key:'globe',x:300,y:330,w:1450,h:1450},{kind:'glow',key:'glow',x:-700,y:80,w:2340,h:2358.91,rotation:-18.2698},...base,{...sub,x:43.2,y:515,w:600,h:145,align:'left'}]};
const advances={};for(let code=32;code<384;code++){const c=String.fromCharCode(code);advances[c]=Math.round(bold.charToGlyph(c).advanceWidth/bold.unitsPerEm*10000)/10000;}
await writeFile(new URL('shared/communityTemplateGeometry.mjs',root),'// Prepared from the original kit and Luc’s approved manual compositions. Regenerate with scripts/prepare-community-layouts.mjs.\nexport const communityTemplateGeometry='+JSON.stringify(layouts,null,1)+';\nexport const cameraBoldAdvances='+JSON.stringify(advances)+';\n');
