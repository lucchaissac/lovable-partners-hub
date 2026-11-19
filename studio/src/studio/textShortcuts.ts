import type {HtmlBlock,HtmlEditorState} from './htmlEditorModel';
import {patchSelectionAppearance} from './selectionAppearance';
export type TextMark='bold'|'italic'|'underline';
export function textShortcut(key:string){return ({b:'bold',i:'italic',u:'underline'} as Record<string,TextMark>)[key.toLowerCase()];}
/** Match the visible legacy block weight, then explicit character marks. */
export function textMarkActive(block:Extract<HtmlBlock,{kind:'text'}>,mark:TextMark){
 const appearance=block.editor?.appearance,base=mark==='bold'?(appearance?.fontWeight??600)>=700:!!appearance?.[mark];
 if(mark==='bold'&&!block.value.inlineFormatting&&appearance?.fontWeight!==undefined)return base;
 return block.value.runs.length?block.value.runs.every(run=>run[mark]??base):base;
}
export function toggleCanvasTextMark(state:HtmlEditorState,ids:string[],mark:TextMark){
 const selected=new Set(ids),texts=state.pages.flatMap(p=>p.sections.filter(s=>!s.locked).flatMap(s=>s.columns.flat())).filter((b):b is Extract<HtmlBlock,{kind:'text'}>=>b.kind==='text'&&selected.has(b.id)&&!b.editor?.locked);
 if(!texts.length)return state;
 const enabled=!texts.every(block=>textMarkActive(block,mark));
 return patchSelectionAppearance(state,texts.map(block=>block.id),mark==='bold'?{fontWeight:enabled?700:600}:{[mark]:enabled});
}
