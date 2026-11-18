import type {HtmlBlock, HtmlEditorState} from './htmlEditorModel';

export const canvasClipboardType = 'application/x-lovable-canvas+json';
export const canvasClipboardPrefix = 'Lovable canvas\n';
export function copiedCanvasBlocks(blocks:HtmlBlock[], images:Record<string,string> = {}):HtmlBlock[] {
  return structuredClone(blocks).map(block => {
    if(block.kind==='image')block.value.src=images[block.value.src]??block.value.src;
    return block;
  });
}

/** Fresh IDs and groups, original pixels/styles, and one atomic undo step. */
export function pasteCanvasBlocks(state:HtmlEditorState,pageId:string,blocks:HtmlBlock[],width:number,height:number,freshId:()=>string=()=>crypto.randomUUID()) {
  const next=structuredClone(state),page=next.pages.find(page=>page.id===pageId),section=page?.sections.find(section=>!section.locked);
  if(!section||!blocks.length||section.columns[0].length+blocks.length>80)return null;
  const existing=new Set(state.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat().map(block=>block.id))));
  const offset=blocks.some(block=>existing.has(block.id))?24:0,groups=new Map<string,string>();
  const clones=structuredClone(blocks).map(block=>{
    const motionId=block.editor?.motionId??block.id;
    block.id=freshId();
    block.editor={...block.editor,motionId,position:'absolute',locked:false,x:(block.editor?.x??0)+offset,y:(block.editor?.y??0)+offset};
    if(block.editor.groupId){const group=block.editor.groupId;if(!groups.has(group))groups.set(group,freshId());block.editor.groupId=groups.get(group)!;}
    return block;
  });
  const left=Math.min(...clones.map(block=>block.editor!.x!)),top=Math.min(...clones.map(block=>block.editor!.y!));
  const right=Math.max(...clones.map(block=>block.editor!.x!+(block.editor!.widthPx??100))),bottom=Math.max(...clones.map(block=>block.editor!.y!+(block.editor!.height??40)));
  // Preserve the group's geometry, bringing it back into view on a smaller canvas.
  const dx=left<0?-left:right>width?Math.max(-left,width-right):0,dy=top<0?-top:bottom>height?Math.max(-top,height-bottom):0;
  for(const block of clones){block.editor!.x=Math.max(-4000,Math.min(4000,block.editor!.x!+dx));block.editor!.y=Math.max(-4000,Math.min(4000,block.editor!.y!+dy));}
  section.columns[0].push(...clones);
  return {state:next,ids:clones.map(block=>block.id)};
}
