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
 const [color,setColor]=useState('#f7f4ed'),[mode,setMode]=useState('mono'),[custom,setCustom]=useState([]);
 const choices=[{id:'mono',label:'Monochrome'},...(neutral(color)?[{id:'gradient',label:'Original gradient'}]:[])];
 const changeColor=value=>{if(!/^#[0-9a-f]{6}$/i.test(value))return;setColor(value.toLowerCase());if(!neutral(value))setMode('mono');};
 const light=luminance(color)>.179,file=`${mode==='gradient'?'lockup':'full'}-${light?'black':mode==='gradient'?'white':'white-pure'}`;
 useEffect(()=>{stage.style.setProperty('--logo-background',color);const art=stage.querySelector('[data-logo-art]');art.src=`/brand/assets/${file}.svg`;art.alt=mode==='mono'?'Monochrome Lovable logo':'Lovable logo with original gradient heart';},[color,file,mode,stage]);
 return <><div className="logo-control"><span>Background</span><ColorPicker value={color} onChange={changeColor} brandColors={colors} brandLabel="Lovable colors" showPalette={false} customColors={custom} onAddCustomColor={hex=>setCustom(previous=>[...new Set([...previous,hex])])} onUpdateCustomColor={(index,hex)=>setCustom(previous=>previous.map((c,i)=>i===index?hex:c))} align="end" trigger={<button className="logo-control-trigger" aria-label="Background color"><span className="logo-color-chip" style={{background:color}}/>{color}<Icon name="chevron-down" size={14}/></button>}/></div><div className="logo-control"><span>Artwork</span><Dropdown value={mode} items={choices} onChange={setMode} align="end" trigger={<button className="logo-control-trigger" aria-label="Logo artwork">{mode==='mono'?'Monochrome':'Original gradient'}<Icon name="chevron-down" size={14}/></button>}/></div><a className="text-link" href={`/brand/assets/${file}.svg`} download={`lovable-${file}.svg`}>Download .svg <Icon name="download" size={16}/></a></>;
}
export function mountLogoControls(stage){const root=createRoot(stage.querySelector('[data-logo-controls]'));document.body.classList.add('logo-picker-active');root.render(<Controls stage={stage}/>);return()=>{root.unmount();document.body.classList.remove('logo-picker-active');};}
