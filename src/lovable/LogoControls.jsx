import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ColorPicker} from '../../studio/packages/ui/src/components/ColorPicker';
import {Dropdown} from '../../studio/packages/ui/src/components/Dropdown';
import {Icon} from '../../studio/packages/ui/src/components/Icon';
import '../../studio/packages/ui/src/tokens.css';
import assets from './assets.json';
const colors=['#ffffff',...assets.colors.filter(color=>color.hex.length===7).map(color=>color.hex)];
const neutral=hex=>{const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16));return Math.max(...c)-Math.min(...c)<24;};
const luminance=hex=>hex.slice(1).match(/../g).map(part=>{const c=parseInt(part,16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
function Controls({stage}){
 const community=stage.dataset.logoWorkspace==='community';
 const [color,setColor]=useState('#f7f4ed'),[mode,setMode]=useState(community?'dark':'mono'),[custom,setCustom]=useState([]);
 const [format,setFormat]=useState('svg'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const choices=community?[{id:'dark',label:'Dark'},{id:'white',label:'White'},{id:'beige',label:'Lovable beige'}]:[{id:'mono',label:'Monochrome'},...(neutral(color)?[{id:'gradient',label:'Original gradient'}]:[])];
 const changeColor=value=>{if(!/^#[0-9a-f]{6}$/i.test(value))return;setColor(value.toLowerCase());if(community)setMode(luminance(value)>.179?'dark':'white');else if(!neutral(value))setMode('mono');};
 const light=luminance(color)>.179,file=`${mode==='gradient'?'lockup':'full'}-${light?'black':mode==='gradient'?'white':'white-pure'}`;
 const src=community?`/ambassadors/assets/lovable-community${mode==='beige'?'':`-${mode}`}.svg`:`/brand/assets/${file}.svg`;
 const changeArtwork=value=>{setMode(value);if(community&&((value==='dark')!==light))setColor(value==='dark'?'#f7f4ed':'#1b1b1b');};
 const download=async()=>{setBusy(true);setError('');try{const {downloadLogo}=await import('./logoExport.js');await downloadLogo(src,format,`lovable-community-${mode}`);}catch(reason){setError(reason.message||'The download could not finish. Please try again.');}finally{setBusy(false);}};
 useEffect(()=>{stage.style.setProperty('--logo-background',color);const art=stage.querySelector('[data-logo-art]');art.src=src;art.alt=community?'Lovable Community logo':mode==='mono'?'Monochrome Lovable logo':'Lovable logo with original gradient heart';},[color,src,mode,community,stage]);
 return <>
  <div className="logo-control"><span>Background</span><ColorPicker value={color} onChange={changeColor} brandColors={colors} brandLabel="Lovable colors" showPalette={false} customColors={custom} onAddCustomColor={hex=>setCustom(previous=>[...new Set([...previous,hex])])} onUpdateCustomColor={(index,hex)=>setCustom(previous=>previous.map((c,i)=>i===index?hex:c))} align="end" trigger={<button className="logo-control-trigger" aria-label="Background color"><span className="logo-color-chip" style={{background:color}}/>{color}<Icon name="chevron-down" size={14}/></button>}/></div>
  <div className="logo-control"><span>Artwork</span><Dropdown value={mode} items={choices} onChange={changeArtwork} align="end" trigger={<button className="logo-control-trigger" aria-label="Logo artwork">{choices.find(choice=>choice.id===mode)?.label}<Icon name="chevron-down" size={14}/></button>}/></div>
  {community?<><div className="logo-control"><span>Format</span><Dropdown value={format} items={['svg','png','webp','pdf'].map(id=>({id,label:`.${id}`}))} onChange={setFormat} align="end" trigger={<button className="logo-control-trigger" aria-label="Download format">.{format}<Icon name="chevron-down" size={14}/></button>}/></div><button className="text-link" onClick={()=>void download()} disabled={busy}>{busy?'Preparing…':`Download .${format}`} <Icon name="download" size={16}/></button>{error&&<p className="logo-export-error" role="alert">{error}</p>}</>:<a className="text-link" href={src} download={`lovable-${file}.svg`}>Download .svg <Icon name="download" size={16}/></a>}
 </>;
}
export function mountLogoControls(stage){const root=createRoot(stage.querySelector('[data-logo-controls]'));document.body.classList.add('logo-picker-active');root.render(<Controls stage={stage}/>);return()=>{root.unmount();document.body.classList.remove('logo-picker-active');};}
