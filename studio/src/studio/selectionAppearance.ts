import type {HtmlBlock,HtmlEditorState} from './htmlEditorModel';
type Appearance=NonNullable<NonNullable<HtmlBlock['editor']>['appearance']>;
export function blockAppearance(block:HtmlBlock):Appearance {
  return {blendMode:'normal',blur:0,textAnimation:'none',fill:'var(--ui-border)',opacity:(block.editor?.opacity??1)*100,background:'transparent',radius:block.editor?.radius??0,borderWidth:0,borderColor:'var(--ui-text)',shadow:'none',...(block.kind==='image'?{imageFit:block.brandRole||block.badge?'contain' as const:'cover' as const,imageVisible:true}:{}),fontFamily:'Camera Plain',fontSize:32,fontWeight:400,italic:false,underline:false,uppercase:false,textAlign:'left',letterSpacing:0,lineHeight:120,
    ...(block.kind==='text'?{fill:block.value.color,fontSize:block.value.size,textAlign:block.value.align,fontWeight:block.value.runs.every(run=>run.bold)?700:400,italic:block.value.runs.length>0&&block.value.runs.every(run=>run.italic),underline:block.value.runs.length>0&&block.value.runs.every(run=>run.underline),lineHeight:block.value.style==='Heading 1'?102:block.value.style.startsWith('Heading')?112:150}:{}),...block.editor?.appearance};
}
export function mixedAppearance(blocks:HtmlBlock[]) {
  const values=blocks.map(blockAppearance),first=values[0]??{};
  return Object.fromEntries([...new Set(values.flatMap(value=>Object.keys(value)))].map(key=>[key,values.some(value=>value[key as keyof Appearance]!==first[key as keyof Appearance])])) as Partial<Record<keyof Appearance,boolean>>;
}
/** Only expose type-specific controls when they apply to every selected layer. */
export function selectionDesignKind(blocks:HtmlBlock[]) {
  const kind=(block:HtmlBlock)=>block.kind==='shape'?block.shape:['image','text'].includes(block.kind)?block.kind:'selection';
  const first=blocks[0]&&kind(blocks[0]);
  return first&&blocks.every(block=>kind(block)===first)?first:'selection';
}
export function patchSelectionAppearance(state:HtmlEditorState,ids:string[],appearance:Appearance):HtmlEditorState {
  const next=structuredClone(state),selected=new Set(ids);
  for(const page of next.pages)for(const section of page.sections)for(const block of section.columns.flat()){
    if(!selected.has(block.id)||section.locked||block.editor?.locked)continue;
    block.editor={...block.editor,...(appearance.opacity!==undefined?{opacity:undefined}:{}),appearance:{...block.editor?.appearance,...appearance}};
    if(block.kind==='text')block.value={...block.value,
      ...(appearance.fill!==undefined?{color:appearance.fill}:{}),...(appearance.fontSize!==undefined?{size:appearance.fontSize}:{}),...(appearance.textAlign!==undefined?{align:appearance.textAlign}:{}),
      runs:block.value.runs.map(run=>({...run,...(appearance.fontWeight!==undefined?{bold:appearance.fontWeight>=600}:{}),...(appearance.italic!==undefined?{italic:appearance.italic}:{}),...(appearance.underline!==undefined?{underline:appearance.underline}:{})}))};
  }
  return next;
}
