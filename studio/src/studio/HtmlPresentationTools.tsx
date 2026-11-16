import {Button,Icon,Tooltip} from '@asset/ui';
import {HtmlEditorInsertToolbar,useHtmlEditorInsert,useHtmlInsertPanel} from './HtmlEditorInsert';
import {PresentationShapeMenu} from './PresentationElementDesign';
import {HtmlIconMenu} from './HtmlIconMenu';
export function HtmlPresentationTools({primitivesOnly=false}:{primitivesOnly?:boolean}={}){
 const insert=useHtmlEditorInsert(),panel=useHtmlInsertPanel();
 return <div style={{display:'flex',alignItems:'center',gap:'var(--ui-space-1)'}} role="toolbar" aria-label="Insert elements">
  {!primitivesOnly&&<HtmlEditorInsertToolbar/>}
  <Tooltip label="Text" side="bottom"><Button variant="ghost" aria-label="Add text" leadingIcon={<Icon name="type" size={16}/>} onClick={()=>insert.current?.('Text')}/></Tooltip>
  <PresentationShapeMenu disabled={false} includeLine={panel.enabled||primitivesOnly} onAdd={(kind:string)=>insert.current?.(kind[0].toUpperCase()+kind.slice(1))}/>
  {!panel.enabled&&!primitivesOnly&&<Tooltip label="Line" side="bottom"><Button variant="ghost" aria-label="Add line" leadingIcon={<Icon name="slash" size={16}/>} onClick={()=>insert.current?.('Line')}/></Tooltip>}
  {primitivesOnly&&<><HtmlIconMenu onAdd={name=>insert.current?.(`Icon:${name}`)}/><Tooltip label="Image" side="bottom"><Button variant="ghost" aria-label="Add image" leadingIcon={<Icon name="image" size={16}/>} onClick={()=>insert.current?.('Image')}/></Tooltip><Tooltip label="Video" side="bottom"><Button variant="ghost" aria-label="Add video" leadingIcon={<Icon name="video" size={16}/>} onClick={()=>insert.current?.('Video')}/></Tooltip></>}
 </div>;
}
