import type {HtmlEditorState} from './htmlEditorModel';

/** Translate the group by one shared delta, including at coordinate limits. */
export function translateCanvasSelection(state:HtmlEditorState,ids:string[],delta:{x?:number;y?:number}):HtmlEditorState {
 const selected=new Set(ids),sections=state.pages.flatMap(page=>page.sections);
 const blocks=sections.flatMap(section=>section.columns.flat()).filter(block=>selected.has(block.id));
 if(!blocks.length||blocks.some(block=>block.editor?.locked||block.editor?.position!=='absolute')||sections.some(section=>section.locked&&section.columns.flat().some(block=>selected.has(block.id))))return state;
 const amount=(axis:'x'|'y')=>{
  const value=delta[axis]??0;if(!Number.isFinite(value))return 0;
  return Math.max(...blocks.map(block=>-4000-(block.editor?.[axis]??0)),Math.min(value,...blocks.map(block=>4000-(block.editor?.[axis]??0))));
 };
 const x=amount('x'),y=amount('y');if(Math.abs(x)<.0001&&Math.abs(y)<.0001)return state;
 return {...state,pages:state.pages.map(page=>({...page,sections:page.sections.map(section=>({...section,columns:section.columns.map(column=>column.map(block=>selected.has(block.id)?{...block,editor:{...block.editor,x:(block.editor?.x??0)+x,y:(block.editor?.y??0)+y}}:block))}))}))};
}
