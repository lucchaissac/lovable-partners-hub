import {useMakerDesign} from '../assets-tool/MakerDesignContext';
import {Button,Icon,Tooltip} from '@asset/ui';
import {HtmlEditorInsertToolbar,useHtmlEditorInsert,useHtmlInsertPanel} from './HtmlEditorInsert';
import {PresentationShapeMenu} from './PresentationElementDesign';
import {HtmlIconMenu} from './HtmlIconMenu';
export function HtmlPresentationTools({primitivesOnly=false}:{primitivesOnly?:boolean}={}){
 const insert=useHtmlEditorInsert(),panel=useHtmlInsertPanel(),maker=useMakerDesign();
 const add=(label:string)=>{if(maker?.beginInsert.current?.()===false)return;insert.current?.(label);};
 return <div style={{display:'flex',alignItems:'center',gap:'var(--ui-space-1)'}} role="toolbar" aria-label="Insert elements">
  {!primitivesOnly&&<HtmlEditorInsertToolbar/>}
  <Tooltip label="Text" side="bottom"><Button variant="ghost" aria-label="Add text" leadingIcon={<Icon name="type" size={16}/>} onClick={()=>add('Text')}/></Tooltip>
  <PresentationShapeMenu disabled={false} includeLine={panel.enabled||primitivesOnly} onAdd={(kind:string)=>add(kind[0].toUpperCase()+kind.slice(1))}/>
  {!panel.enabled&&!primitivesOnly&&<Tooltip label="Line" side="bottom"><Button variant="ghost" aria-label="Add line" leadingIcon={<Icon name="slash" size={16}/>} onClick={()=>add('Line')}/></Tooltip>}
  {primitivesOnly&&<><HtmlIconMenu onAdd={name=>add(`Icon:${name}`)}/><Tooltip label="Image" side="bottom"><Button variant="ghost" aria-label="Add image" leadingIcon={<Icon name="image" size={16}/>} onClick={()=>add('Image')}/></Tooltip><Tooltip label="Video" side="bottom"><Button variant="ghost" aria-label="Add video" leadingIcon={<Icon name="video" size={16}/>} onClick={()=>add('Video')}/></Tooltip></>}
 </div>;
}
