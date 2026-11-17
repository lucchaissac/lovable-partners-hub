import {Button,Dropdown,Icon,Input,TriggerField} from '@asset/ui';
import {curvePresets} from '../../../shared/techArtwork.mjs';
import {renderedTechSource,techArtworkSettings,techArtworkSvg,updateTechArtwork} from './techArtwork';
import type {TechArtworkSettings} from './techArtworkSettings';
import type {HtmlBlock} from '../studio/htmlEditorModel';
import {download} from './media';
import './tech-artwork.css';
type ImageBlock=Extract<HtmlBlock,{kind:'image'}>;
export function TechArtworkControls({block,onChange,locked=false}:{block:ImageBlock;onChange:(block:ImageBlock)=>void;locked?:boolean}){
 const value=techArtworkSettings(block),curves=value.kind==='curves';
 const update=(patch:Record<string,unknown>)=>onChange(updateTechArtwork(block,{...value,...patch} as TechArtworkSettings));
 const range=(key:string,label:string,min:number,max:number,step:number,suffix='')=>{
  const current=Number(value[key as keyof typeof value]);
  const change=(number:number)=>{if(Number.isFinite(number))update({[key]:Math.min(max,Math.max(min,number))});};
  return <label className="tech-artwork-range"><span>{label}</span><div><input type="range" aria-label={label} min={min} max={max} step={step} value={current} onChange={e=>change(e.target.valueAsNumber)}/><Input inputSize="sm" aria-label={`${label} value`} type="number" min={min} max={max} step={step} value={current} onChange={e=>change(e.target.valueAsNumber)}/>{suffix&&<span>{suffix}</span>}</div></label>;
 };
 const reset=()=>{const next={...block};delete next.techArtwork;onChange(next);};
 const exportSvg=async()=>{const svg=block.techArtwork?techArtworkSvg(block.techArtwork):await fetch(block.value.src).then(r=>r.text());download(new Blob([svg],{type:'image/svg+xml'}),`tech-blog-${value.kind}.svg`);};
 return <fieldset className="tech-artwork-fields" disabled={locked}>
  <div className="tech-artwork-preview" data-kind={value.kind}><img src={renderedTechSource(block)} alt={curves?'Construction preview':'Grid preview'}/></div>
  <label className="tech-artwork-field"><span>{curves?'Composition':'Pattern'}</span><Dropdown value={curves?value.preset:value.style} items={curves?curvePresets:[{id:'lines',label:'Lines'},{id:'dots',label:'Dots'}]} onChange={id=>curves?update({preset:id,count:id==='convergence'?7:id==='rays'?36:24,spread:100,rotation:0}):update({style:id,stroke:id==='dots'?1:.37})} trigger={<TriggerField aria-label={curves?'Composition':'Grid pattern'} disabled={locked} trailingIcon={<Icon name="chevron-down" size={14}/>}>{curves?curvePresets.find(p=>p.id===value.preset)?.label:value.style==='dots'?'Dots':'Lines'}</TriggerField>}/></label>
  {curves?<>{range('count','Count',3,64,1)}{range('spread','Spread',25,160,1,'%')}{range('rotation','Rotation',-180,180,1,'°')}</>:range('spacing','Spacing',10,84,.01,'px')}
  {range('stroke',!curves&&value.style==='dots'?'Dot radius':'Stroke',.1,4,.01,'px')}
  {range('opacity','Opacity',0,100,1,'%')}
  <label className="tech-artwork-field"><span>Ink</span><Dropdown value={value.color} items={[{id:'#ffffff',label:'White'},{id:'#1b1b1b',label:'Dark'}]} onChange={color=>update({color})} trigger={<TriggerField aria-label="Artwork ink" disabled={locked} trailingIcon={<Icon name="chevron-down" size={14}/>}>{value.color==='#1b1b1b'?'Dark':'White'}</TriggerField>}/></label>
  <div className="tech-artwork-actions"><Button size="sm" variant="ghost" disabled={!block.techArtwork} onClick={reset}>Reset</Button><Button size="sm" variant="ghost" leadingIcon={<Icon name="download" size={14}/>} onClick={()=>void exportSvg()}>Download .svg</Button></div>
 </fieldset>;
}
export function TechArtworkDesign({block,onChange,onClose,locked}:{block:ImageBlock;onChange:(block:ImageBlock)=>void;onClose:()=>void;locked:boolean}){
 return <aside id="html-element-design" className="hcs-design-design-panel" aria-label="Tech artwork design"><header className="we-panel-header"><strong>{techArtworkSettings(block).kind==='grid'?'Cover grid':'Construction'}</strong><Button variant="ghost" size="sm" aria-label="Close artwork design" leadingIcon={<Icon name="panel-right-close" size={16}/>} onClick={onClose}/></header><div className="hcs-design-design-body"><TechArtworkControls block={block} onChange={onChange} locked={locked}/></div></aside>;
}
