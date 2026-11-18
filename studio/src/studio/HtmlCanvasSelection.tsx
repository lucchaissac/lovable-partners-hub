import {IconDesignControls} from './IconDesignControls';
import {scaleSelection,selectionResizeFactor,patchScaledSelection,type ScaleOrigin} from './selectionScale';
import {SelectionScaleControls} from './SelectionScaleControls';
import {canvasLayerAction} from '../assets-tool/canvasLayers';
import {useMakerDesign} from '../assets-tool/MakerDesignContext';
import {canvasClipboardType,canvasClipboardPrefix,copiedCanvasBlocks,pasteCanvasBlocks} from './canvasClipboard';
import {blockAppearance,mixedAppearance,patchSelectionAppearance,selectionDesignKind} from './selectionAppearance';
import {translateCanvasSelection} from './selectionPosition';
import {rotateSelectionFrames} from './selectionRotation';
import {resizeCanvasLine} from './canvasLine';
import {SelectionPositionControls} from './SelectionPositionControls';
import {htmlBlockSchema} from './htmlEditorModel';
import {TechArtworkDesign} from '../assets-tool/TechArtworkDesign';
import {isTechArtwork} from '../assets-tool/techArtwork';
import {BrandLogoDesign} from '../assets-tool/BrandLogoDesign';
import {studioWorkspace} from '../assets-tool/workspace';
import {communityImageHit} from '../assets-tool/communityHitTest';
import {editCommunityBlock,needsCommunityRender} from '../assets-tool/communityDocument';
import {AmbassadorDesign} from '../assets-tool/AmbassadorDesign';
import { PartnerBadgeDesign } from '../assets-tool/PartnerBadgeDesign';
import { badgeFormatName, type PartnerBadgeSettings } from '../assets-tool/partnerBadgeSettings';
import {HtmlIconMenu} from './HtmlIconMenu';
import {LucideGlyph} from './LucideGlyph';
import {cornerRadiusStyle} from './htmlCornerRadius';
import { elementBoxStyle, elementContentHeight } from './htmlElementAppearance';
import { frameRect, constrainLayoutFrames, type LayoutItem } from './htmlLayoutConstraints';
import { moveHtmlBlock } from './htmlEditorModel';
import { htmlElementWidth, htmlBlockMinWidth, resizedElementWidth, imageSectionSizing, renderedElementFrame } from './htmlElementSizing';
import { resizedSectionWidth } from './htmlSectionStyle';
import { HtmlSectionDesign, type SectionSpacingPreview } from './HtmlSectionDesign';
import { clipHtmlGuides, snapHtmlMove, snapHtmlSectionResize, type Guide } from './htmlSelectionSnapping';
import { PresentationElementDesign, PresentationElementAdvanced } from './PresentationElementDesign';
import { useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuList, DropdownMenuItem, DropdownMenuItemIcon, DropdownMenuItemLabel, DropdownMenuSeparator, Icon, Tooltip } from '@asset/ui';
import { HtmlSelectionMode } from './HtmlSelectionMode';
import { HTML_INSERT_PANEL_ID, useHtmlInsertPanel } from './HtmlEditorInsert';
import { WorkspaceEditingContext } from './WorkspaceAssets';
import { useWorkspaceWidgetHost } from './WorkspaceWidgetHost';
import type { HtmlBlock, HtmlEditorState, HtmlSection } from './htmlEditorModel';
import { htmlSectionSelectionAction, htmlSelectionAction, patchHtmlFrames, selectionBounds, type ElementFrame, type Rect, type SelectionAction } from './htmlSelectionOperations';
import { htmlLayerOrder, layerOrderAvailability, type LayerOrderAction } from './htmlLayerOrder';
import { selectionToolbarPosition, sectionToolbarPosition, rotationHandlePosition } from './selectionToolbarPosition';
import './html-canvas-selection.css';

type Save = (state: HtmlEditorState, copies?: Record<string, string>) => void;
const menuSurface = '.we-chat,.we-review-asset,.hcs-ui,.ui-dropdown-content,.ui-popover-content,.ui-color-popover,[role="menu"],[role="dialog"],.workspace-widget-panelhost';
const handles = [['nw',0,0,'top left corner'],['n',50,0,'top edge'],['ne',100,0,'top right corner'],['e',100,50,'right edge'],['se',100,100,'bottom right corner'],['s',50,100,'bottom edge'],['sw',0,100,'bottom left corner'],['w',0,50,'left edge']] as const;
type DropTarget = { absolute?: boolean; x?: number; section: string; column: number; index: number; width: number; y?: number; line: Rect };
type Gesture = { scaled?:boolean; layout?: LayoutItem[]; drop?: DropTarget; cursor?: {x:number;y:number}; kind: string; pointer: number; x: number; y: number; bounds: Rect; blocks: { block: HtmlBlock; box: Rect; width: number; parentWidth: number }[]; initial: HtmlEditorState; frames: Record<string, ElementFrame>; moved: boolean;targets:Rect[];section?:{id:string;width:number;widthPx?:number;parentWidth:number} };

const clamp = (n:number,min:number,max:number) => Math.max(min,Math.min(max,n));

export function htmlFrameStyle(block: HtmlBlock): CSSProperties {
  const f=block.editor||{};const a=block.kind==='shape'&&!block.icon?{}:f.appearance||{};const minimumWidth=htmlBlockMinWidth(block);
  return {...elementBoxStyle(f.appearance,block.kind==='text'&&block.value.list==='bullet'),'--hcs-list-size':block.kind==='text'?`${block.value.size}px`:undefined,'--hcs-list-color':block.kind==='text'?block.value.color:undefined,'--hcs-list-line':a.lineHeight!==undefined?a.lineHeight/100:1.25,'--hcs-image-ratio':block.kind==='image'?block.value.aspectRatio:undefined,width:htmlElementWidth(f), maxWidth:f.position==='absolute'?undefined:'100%', minWidth:minimumWidth?(f.position==='absolute'?minimumWidth:`min(${minimumWidth}px, 100%)`):0, left:f.position==='absolute'?`${f.x||0}px`:`clamp(0px, ${f.x||0}px, max(0px, calc(100% - ${htmlElementWidth(f)||'100%'})))`, minHeight:f.height, top:f.position==='absolute'?`${f.y||0}px`:undefined, transform:`translateY(${f.position==='absolute'?0:f.y||0}px) rotate(${f.rotation||0}deg)`,transformOrigin:'center',mixBlendMode:f.appearance?.blendMode,opacity:a.opacity!==undefined?a.opacity/100:f.opacity,...cornerRadiusStyle(a,f.radius),background:block.kind==='shape'&&block.icon?a.background:block.kind!=='text'&&block.kind!=='image'?a.fill:undefined,border:a.borderWidth?`${a.borderWidth}px solid ${a.borderColor||'var(--ui-text)'}`:undefined,boxShadow:a.shadow==='soft'?'var(--ui-shadow-sm)':a.shadow==='strong'?'var(--ui-shadow-md)':undefined,'--hcs-text-size':a.fontSize!==undefined?`${a.fontSize}px`:undefined,'--hcs-font':a.fontFamily==='Arial'?'var(--ui-font)':a.fontFamily,'--hcs-text-spacing':a.letterSpacing!==undefined?`${a.letterSpacing}px`:undefined,'--hcs-text-line':a.lineHeight!==undefined?a.lineHeight/100:undefined,'--hcs-text-weight':a.fontWeight,'--hcs-text-transform':a.uppercase?'uppercase':'none','--hcs-image-fit':a.imageFit, '--hcs-image-height':block.kind==='image'&&f.height?`${elementContentHeight(f.height,f.appearance)}px`:undefined} as CSSProperties;
}

export function useHtmlCanvasSelection({ root, state, pageId, editable, zoom = 1, fixedCanvas = false, imageSources = {}, save, onSelect, onReplace, onEditButton, onAddSection }: {
  root: RefObject<HTMLDivElement | null>; state: HtmlEditorState; pageId: string; editable: boolean; zoom?: number; fixedCanvas?: boolean; imageSources?: Record<string,string>; save: Save;
  onSelect: (element?: Element) => void; onReplace:(id:string,fill?:boolean)=>void; onAddSection:(id:string,after:boolean,anchor:HTMLElement)=>void; onEditButton:(block:Extract<HtmlBlock,{kind:'cta'}>)=>void;
}) {
  const rect = (el: Element) => { const r=el.getBoundingClientRect(); return {left:r.left/zoom,top:r.top/zoom,width:r.width/zoom,height:r.height/zoom,right:r.right/zoom,bottom:r.bottom/zoom}; };
  const mode=useContext(HtmlSelectionMode), enabled=mode&&editable, host=useWorkspaceWidgetHost(), editing=useContext(WorkspaceEditingContext);
  const makerDesign=useMakerDesign();
  const communityCanvas=!!root.current?.closest('.community-canvas');
  const insertPanel = useHtmlInsertPanel();
  const [sectionIds,setSectionIds]=useState<string[]>([]);
  const sectionId=sectionIds.length===1?sectionIds[0]:'';
  const sectionAnchor=useRef('');
  const setSectionId=(id:string)=>{setSectionIds(id?[id]:[]);sectionAnchor.current=id;};
  const [textToolbarHost,setTextToolbarHost]=useState<HTMLDivElement|null>(null);
  const [widgetToolbarHost,setWidgetToolbarHost]=useState<HTMLDivElement|null>(null),[widgetIdentityHost,setWidgetIdentityHost]=useState<HTMLDivElement|null>(null);
  const [ids,setIds]=useState<string[]>([]), [editingId,setEditingId]=useState(''), [design,setDesign]=useState(false), [menu,setMenu]=useState(false);
  const [spacingPreview,setSpacingPreview]=useState<SectionSpacingPreview|null>(null);
  const [guides,setGuides]=useState<Guide[]>([]);
  const [dropTarget,setDropTarget]=useState<DropTarget|null>(null);
  const [draft,setDraft]=useState<HtmlEditorState|null>(null), [marquee,setMarquee]=useState<Rect|null>(null);
  const [geometry,setGeometry]=useState<{spacing:Rect[];bounds:Rect|null;frame:Rect|null;boxes:Rect[];visible:Rect;origin:Rect;toolbar:ReturnType<typeof selectionToolbarPosition>&{fixed?:boolean}}|null>(null);
  const toolbar=useRef<HTMLDivElement>(null), gesture=useRef<Gesture|null>(null), marqueeStart=useRef<{x:number;y:number;pointer:number;capture:HTMLElement;initial:string[];previousIds:string[];previousSections:string[]}|null>(null);
  const dragScroll=useRef(0);
  const source=useRef(state);source.current=state;
  const rendered=draft||state, page=rendered.pages.find(p=>p.id===pageId)||rendered.pages[0], blocks=page.sections.flatMap(s=>s.columns.flat());
  const selectedSections=page.sections.filter(s=>sectionIds.includes(s.id)),sectionSelection=selectedSections.length>0,multipleSections=selectedSections.length>1;
  const selectedSection=selectedSections.length===1?selectedSections[0]:undefined;
  const members=blocks.filter(b=>ids.includes(b.id)), locked=selectedSections.some(s=>s.locked)||members.some(b=>b.editor?.locked), one=members.length===1?members[0]:undefined;
  const selectedGroup=members.length>1&&!!members[0].editor?.groupId&&members.every(block=>block.editor?.groupId===members[0].editor?.groupId);
  const scaleOrigin:ScaleOrigin=selectedGroup?members[0].editor?.scaleOrigin??[.5,.5]:[.5,.5];
  const multiDesign=members.length>1, multiKind=selectionDesignKind(members);
  const layeredSelection=!sectionSelection&&members.length>0&&(fixedCanvas||members.every(b=>b.editor?.position==='absolute'));
  const layerAvailability=layerOrderAvailability(rendered,ids);
  const layerItems=[
    {id:'bring-to-front',label:'Bring to front',leadingIcon:<LucideGlyph name="bring-to-front" size={16}/>,disabled:locked||!layerAvailability.forward},
    {id:'bring-forward',label:'Bring forward',leadingIcon:<Icon name="arrow-up" size={16}/>,disabled:locked||!layerAvailability.forward},
    {id:'send-backward',label:'Send backward',leadingIcon:<Icon name="arrow-down" size={16}/>,disabled:locked||!layerAvailability.backward},
    {id:'send-to-back',label:'Send to back',leadingIcon:<LucideGlyph name="send-to-back" size={16}/>,disabled:locked||!layerAvailability.backward},
  ];
  const hasWidgetTools=!!one&&(['contacts','tasks','synced'].includes(one.kind)||(one.kind==='inventory'&&['Table','Library list','Forms'].includes(one.content?.type||'')));
  const hasWidgetDesign=!!one&&(['contacts','tasks'].includes(one.kind)||(one.kind==='inventory'&&one.content?.type==='Table'));
  const selectionDesignActive=mode&&design&&!!(selectedSection||multiDesign||(one&&!hasWidgetDesign));
  useLayoutEffect(()=>{if(!selectionDesignActive)host.panelChanged('html-selection',false);},[selectionDesignActive,host.panelChanged]);
  useLayoutEffect(()=>{if(mode&&host.panelOpen&&host.activeId!=='html-selection'&&host.activeId!==HTML_INSERT_PANEL_ID&&host.activeId!==one?.id)host.closePanel();},[mode,host.panelOpen,host.activeId,one?.id,host.closePanel]);
  useEffect(()=>{if(host.activeId&&host.activeId!=='html-selection')setDesign(false);},[host.activeId]);
  const element=(id:string)=>root.current?.querySelector<HTMLElement>(`#block-${CSS.escape(id)}`);
  const clear=()=>{setSectionId('');setIds([]);setEditingId('');setDesign(false);setMenu(false);onSelect(undefined);};
  const choose=(next:string[])=>{setSectionId('');setIds(next);setEditingId('');if(next.length>1){setDesign(true);host.panelChanged('html-selection',true);}onSelect(next.length===1?(element(next[0])||undefined):undefined);};
  useLayoutEffect(()=>{
    if(!enabled||!makerDesign)return;
    const select=(next:string[])=>{
      choose(next.filter(id=>blocks.some(block=>block.id===id)));
      setDesign(true);host.panelChanged('html-selection',true);
    };
    makerDesign.select.current=select;
    return()=>{if(makerDesign.select.current===select)makerDesign.select.current=undefined;};
  },[enabled,blocks,makerDesign?.select,host.panelChanged]);
  useEffect(()=>{if(enabled)makerDesign?.setSelected(ids);},[enabled,ids.join('|')]);
  useEffect(()=>{if(enabled&&makerDesign)return()=>makerDesign.setSelected([]);},[enabled]);
  useEffect(()=>{clear();},[pageId,mode]);
  const communityTemplateId=blocks.find(block=>block.kind==='image'&&block.ambassador&&!block.ambassadorElement)?.id;
  useEffect(()=>{if(!enabled||!communityTemplateId)return;choose([communityTemplateId]);setDesign(true);host.panelChanged('html-selection',true);},[communityTemplateId,enabled]);
  useEffect(()=>{if(!enabled)return;const available=new Set(blocks.map(b=>b.id));setIds(old=>old.some(id=>!available.has(id))?old.filter(id=>available.has(id)):old);},[state,enabled]);
  useEffect(()=>{if(!enabled)return;const available=new Set(page.sections.map(s=>s.id));setSectionIds(old=>old.some(id=>!available.has(id))?old.filter(id=>available.has(id)):old);},[state,enabled]);
  function chooseSection(id:string,range=false,toggle=false){
    const order=page.sections.map(s=>s.id),anchor=order.indexOf(sectionAnchor.current),target=order.indexOf(id);
    const next=range&&anchor>=0?order.slice(Math.min(anchor,target),Math.max(anchor,target)+1):toggle?(sectionIds.includes(id)?sectionIds.filter(value=>value!==id):[...sectionIds,id]):[id];
    if(!range)sectionAnchor.current=id;
    setSectionIds(next);setIds([]);setEditingId('');setDesign(false);setMenu(false);
    onSelect(next.length===1?root.current?.querySelector(`#section-${CSS.escape(next[0])}`)||undefined:undefined);
  }
  function measure(){
    if(!enabled||!root.current)return;
    const scroll=root.current.closest('.studio-workspace-scroll')||root.current.parentElement!;
    const r=rect(scroll),content=insertPanel.enabled?(root.current.querySelector('.hev-content')?rect(root.current.querySelector('.hev-content')!):undefined):undefined,header=insertPanel.enabled?(root.current.querySelector('.hn-pages')?rect(root.current.querySelector('.hn-pages')!):undefined):undefined;
    const left=Math.max(0,r.left,content?.left??r.left),top=Math.max(0,r.top,header?.bottom??r.top),right=Math.min((innerWidth/zoom),r.left+r.width,content?.right??r.left+r.width),bottom=Math.min((innerHeight/zoom),r.top+r.height);
    const visible={left,top,width:right-left,height:bottom-top};
    const sections=selectedSections.map(section=>root.current!.querySelector<HTMLElement>(`#section-${CSS.escape(section.id)}`)).filter((el):el is HTMLElement=>!!el);
    const boxes=sections.length?sections.map(rect):ids.map(element).filter((e):e is HTMLElement=>!!e).map(rect),bounds=selectionBounds(boxes);
    const style=getComputedStyle(root.current),gap=(parseFloat(style.getPropertyValue('--ui-space-3'))||12)/zoom;
    // Inset only the section's visual selection; resizing still uses its real bounds.
    const inset = sectionSelection && insertPanel.enabled ? gap / 2 : 0;
    const frame = bounds ? { left:bounds.left+inset, top:bounds.top+inset, width:Math.max(0,bounds.width-inset*2), height:Math.max(0,bounds.height-inset*2) } : null;
    const placeToolbar=insertPanel.enabled&&sectionSelection?sectionToolbarPosition:selectionToolbarPosition;
    const pos=frame?placeToolbar({x:frame.left+frame.width/2,y:frame.top,left:frame.left,right:frame.left+frame.width,bottom:frame.top+frame.height},visible,{width:(toolbar.current?.offsetWidth||204)/zoom,height:(toolbar.current?.offsetHeight||36)/zoom},gap,sectionSelection?gap+16/zoom:gap):{left:0,top:0,maxWidth:visible.width};
    const spacing:Rect[]=[];
    if(selectionDesignActive&&spacingPreview&&selectedSection&&sections[0]){
      const section=sections[0],box=rect(section),style=getComputedStyle(section);
      if(spacingPreview==='after'){const height=parseFloat(getComputedStyle(section.parentElement!).marginBottom)||0;spacing.push({left:box.left,top:box.top+box.height,width:box.width,height});}
      if(spacingPreview==='padding'){
        const top=parseFloat(style.paddingTop)||0,bottom=parseFloat(style.paddingBottom)||0,left=parseFloat(style.paddingLeft)||0,right=parseFloat(style.paddingRight)||0;
        spacing.push({left:box.left,top:box.top,width:box.width,height:top},{left:box.left,top:box.top+box.height-bottom,width:box.width,height:bottom},{left:box.left,top:box.top+top,width:left,height:Math.max(0,box.height-top-bottom)},{left:box.left+box.width-right,top:box.top+top,width:right,height:Math.max(0,box.height-top-bottom)});
      }
      if(spacingPreview==='gap'){
        const columns=[...section.querySelectorAll<HTMLElement>(':scope > .hev-columns > .hev-column')].map(rect);
        for(let i=1;i<columns.length;i++){const prev=columns[i-1],next=columns[i],width=next.left-prev.left-prev.width;if(width>0)spacing.push({left:prev.left+prev.width,top:Math.min(prev.top,next.top),width,height:Math.max(prev.top+prev.height,next.top+next.height)-Math.min(prev.top,next.top)});}
      }
    }
    if(selectionDesignActive&&spacingPreview&&one&&!selectedSection){
      const node=element(one.id);
      if(node){
        const box=rect(node),style=getComputedStyle(node);
        if(spacingPreview==='padding'){
          const top=Math.min(box.height,parseFloat(style.paddingTop)||0),bottom=Math.min(box.height-top,parseFloat(style.paddingBottom)||0),left=Math.min(box.width,parseFloat(style.paddingLeft)||0),right=Math.min(box.width-left,parseFloat(style.paddingRight)||0);
          spacing.push({left:box.left,top:box.top,width:box.width,height:top},{left:box.left,top:box.top+box.height-bottom,width:box.width,height:bottom},{left:box.left,top:box.top+top,width:left,height:Math.max(0,box.height-top-bottom)},{left:box.left+box.width-right,top:box.top+top,width:right,height:Math.max(0,box.height-top-bottom)});
        }
        if(spacingPreview==='after'&&one.editor?.position!=='absolute')spacing.push({left:box.left,top:box.top+box.height,width:box.width,height:one.editor?.spacingAfter??0});
        const section=node.closest('.hev-section');
        if(section){const clip=rect(section);for(const area of spacing){const right=Math.min(area.left+area.width,clip.left+clip.width),bottom=Math.min(area.top+area.height,clip.top+clip.height);area.left=Math.max(area.left,clip.left);area.top=Math.max(area.top,clip.top);area.width=Math.max(0,right-area.left);area.height=Math.max(0,bottom-area.top);}}
      }
    }
    const next={spacing,bounds,frame,boxes,visible,origin:rect(root.current),toolbar:pos};setGeometry(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
  }
  const measureRef=useRef(measure);measureRef.current=measure;
  useLayoutEffect(()=>{measure();});
  useEffect(()=>{
    if(!enabled||!(insertPanel.enabled&&(sectionIds.length||editingId)||communityCanvas&&ids.length))return;
    let pending=0;
    const scroll=()=>{if(!pending)pending=requestAnimationFrame(()=>{pending=0;measureRef.current();});};
    window.addEventListener('scroll',scroll,true);
    return()=>{window.removeEventListener('scroll',scroll,true);cancelAnimationFrame(pending);};
  },[enabled,insertPanel.enabled,sectionIds.join(','),editingId,communityCanvas,ids.join(',')]);
  useEffect(()=>{
    if(!enabled)return;const measureNext=()=>measureRef.current();window.addEventListener('resize',measureNext);
    const observer=new ResizeObserver(measureNext);if(root.current)observer.observe(root.current);if(toolbar.current)observer.observe(toolbar.current);ids.forEach(id=>{const el=element(id);if(el)observer.observe(el);});
    return()=>{observer.disconnect();window.removeEventListener('resize',measureNext);};
  },[enabled,ids,sectionIds.join(','),editingId,textToolbarHost]);
  function updateSection(patch:Partial<HtmlSection>){if(selectedSection?.locked)return;const next=structuredClone(source.current);const section=next.pages.flatMap(p=>p.sections).find(s=>s.id===sectionId);if(section){Object.assign(section,patch);save(next);}}
  function sectionAction(action:SelectionAction){
    if(!sectionSelection || fixedCanvas && action !== 'lock' && action !== 'unlock')return;
    const result=htmlSectionSelectionAction(source.current,sectionIds,action);
    save(result.state,result.copies);
    if(!result.ids.length){clear();return;}
    setSectionIds(result.ids);if(action==='duplicate')sectionAnchor.current=result.ids[0];
    requestAnimationFrame(()=>onSelect(result.ids.length===1?root.current?.querySelector(`#section-${CSS.escape(result.ids[0])}`)||undefined:undefined));
  }
  function action(action:SelectionAction){
    if(sectionSelection){sectionAction(action);return;}
    if(locked&&action!=='unlock'&&action!=='lock')return;
    const result=htmlSelectionAction(source.current,ids,action);save(result.state,result.copies);choose(result.ids);
  }
  function arrange(action:LayerOrderAction){
    if(!layeredSelection||locked)return;
    const next=htmlLayerOrder(source.current,ids,action);
    if(next!==source.current)save(next);
    setMenu(false);
  }
  function layoutItems(selected: HtmlBlock[]): LayoutItem[] {
    const chosen = new Set(selected.map(block => block.id));
    return selected.flatMap(block => {
      const el = element(block.id), section = el?.closest<HTMLElement>('.hev-section'), column = el?.closest<HTMLElement>('.hev-column');
      if (!el || !section || !column) return [];
      const box = rect(el), outer = rect(section), col = rect(column), css = getComputedStyle(section), elementCSS=getComputedStyle(el);
      const width=parseFloat(elementCSS.width)||el.offsetWidth,height=parseFloat(elementCSS.height)||el.offsetHeight,parentWidth=rect(el.parentElement!).width;
      const frame=renderedElementFrame(block.editor,{width,height,parentWidth,left:parseFloat(elementCSS.left)||0,top:parseFloat(elementCSS.top)||0});
      const left = Math.max(col.left, outer.left + parseFloat(css.paddingLeft)), top = outer.top + parseFloat(css.paddingTop);
      const right = Math.min(col.left + col.width, outer.left + outer.width - parseFloat(css.paddingRight));
      return [{ id: block.id, minWidth:htmlBlockMinWidth(block), flow:block.editor?.position!=='absolute', frame, box, width, height, parentWidth,
        limits: { left, top, width: Math.max(0, right - left), height: Math.max(0, outer.top + outer.height - parseFloat(css.paddingBottom) - top) },
        obstacles: block.editor?.position==='absolute'?[]:[...section.querySelectorAll<HTMLElement>('.hev-block')].filter(other => !chosen.has(other.id.replace('block-', '')) && other.parentElement?.dataset.position!=='absolute').map(rect),
      }];
    });
  }
  function patch(values:ElementFrame){if(locked)return;const items=layoutItems(members);save(patchHtmlFrames(source.current,constrainLayoutFrames(items,Object.fromEntries(members.map(block=>{const frame=items.find(item=>item.id===block.id)?.frame||block.editor||{};return [block.id,{...frame,...values,...(values.x!==undefined?{x:(frame.x||0)+values.x-(block.editor?.x||0)}:{}),...(values.y!==undefined?{y:(frame.y||0)+values.y-(block.editor?.y||0)}:{})}];})))));}
  function scaleGroup(value:number){
    if(locked||!selectedGroup)return;
    const items=layoutItems(members),bounds=selectionBounds(items.map(item=>item.box));if(!bounds)return;
    const result=scaleSelection(items,members,bounds,value/(members[0].editor?.groupScale??1),scaleOrigin);
    save(patchScaledSelection(source.current,result.frames));
  }
  function groupOrigin(origin:ScaleOrigin){
    if(locked)return;save(patchHtmlFrames(source.current,Object.fromEntries(members.map(block=>[block.id,{...block.editor,scaleOrigin:origin}]))));
  }
  function rotateBy(degrees:number){if(locked)return;const items=layoutItems(members),bounds=selectionBounds(items.map(item=>item.box));if(bounds)save(patchHtmlFrames(source.current,constrainLayoutFrames(items,rotateSelectionFrames(items,bounds,degrees))));}
  function setAbsolute(absolute: boolean){
    if(!one||locked)return;
    const el=element(one.id),col=el?.closest<HTMLElement>('.hev-column'),section=el?.closest<HTMLElement>('.hev-section');
    if(!el||!col||!section)return;
    const next=structuredClone(source.current),model=next.pages.flatMap(p=>p.sections).find(s=>s.id===section.dataset.section)!;
    const block=model.columns.flat().find(b=>b.id===one.id)!;
    const box=rect(el),parent=rect(col);
    if(absolute)model.minHeight=Math.max(model.minHeight||0,section.offsetHeight);
    block.editor={...block.editor,position:absolute?'absolute':'flow',x:absolute?Math.max(0,box.left-parent.left+(box.width-el.offsetWidth)/2):0,y:absolute?Math.max(0,box.top-parent.top+(box.height-el.offsetHeight)/2):0,...(absolute?{height:Math.max(12,el.offsetHeight)}:{rotation:0})};
    save(next);
  }
  function findDrop(x: number, y: number, g: Gesture): DropTarget | undefined {
    const sections = [...(root.current?.querySelectorAll<HTMLElement>('.hev-section:not([data-locked])') || [])];
    const target = sections.find(section => { const r = rect(section); return x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height; });
    if (!target) return;
    const columns = [...target.querySelectorAll<HTMLElement>(':scope > .hev-columns > .hev-column')];
    const column = columns.reduce((best, col, i) => Math.abs(x - (rect(col).left + rect(col).width / 2)) < Math.abs(x - (rect(columns[best]).left + rect(columns[best]).width / 2)) ? i : best, 0);
    const col = columns[column]; if (!col) return;
    if (g.blocks.every(({block}) => element(block.id)?.closest('.hev-column') === col)) return;
    if(g.blocks.length===1&&g.blocks[0].block.editor?.position==='absolute'){
      const item=g.blocks[0],box=rect(col),section=rect(target),css=getComputedStyle(target);
      const width=item.box.width,height=item.box.height;
      const left=x-(g.x-item.box.left),top=y-(g.y-item.box.top);
      return {absolute:true,x:Math.round(left-box.left),y:Math.round(top-box.top),section:target.dataset.section!,column,index:col.querySelectorAll(':scope > .hev-block-wrap').length,width:box.width,line:{left,top,width,height}};
    }
    const chosen = new Set(g.blocks.map(({block}) => block.id));
    const children = [...col.querySelectorAll<HTMLElement>(':scope > .hev-block-wrap > .hev-block')];
    const after = children.findIndex(child => !chosen.has(child.id.replace('block-', '')) && y < rect(child).top + rect(child).height / 2);
    const layered = getComputedStyle(col).display === 'grid';
    const index = layered || after < 0 ? children.length : after;
    const box = rect(col), last = children.filter(child => !chosen.has(child.id.replace('block-', ''))).at(-1);
    const rawLineY = layered ? Math.max(box.top,...children.map(child=>rect(child).top+rect(child).height))+12 : after >= 0 ? rect(children[after]).top - 6 : last ? rect(last).top + rect(last).height + 6 : box.top;
    const sectionBox=rect(target),sectionCSS=getComputedStyle(target);
    const lineY=clamp(rawLineY,sectionBox.top+parseFloat(sectionCSS.paddingTop),sectionBox.top+sectionBox.height-parseFloat(sectionCSS.paddingBottom)-2);
    return { y: layered ? lineY-box.top : undefined, section: target.dataset.section!, column, index, width: box.width, line: { left: box.left, top: lineY, width: box.width, height: 2 } };
  }
  function changeBlock(block:HtmlBlock){const next=structuredClone(source.current);for(const p of next.pages)for(const s of p.sections)for(const c of s.columns){const i=c.findIndex(b=>b.id===block.id);if(i>=0)c[i]=block;}save(next);}
  function editBlock(block:HtmlBlock){
    if(block.editor?.locked)return;
    if(block.kind==='image'){choose([block.id]);if(block.badge||block.ambassador||block.brandRole||((studioWorkspace==='tech-blog'||studioWorkspace==='ambassadors')&&isTechArtwork(block))){setDesign(true);host.panelChanged('html-selection',true);}else onReplace(block.id);return;}
    choose([block.id]);setEditingId(block.id);
    if(block.kind==='cta')onEditButton(block);
    if(block.kind==='shape'){setEditingId('');setDesign(true);host.panelChanged('html-selection',true);}
    requestAnimationFrame(()=>{
      const el=element(block.id);onSelect(el?.querySelector('[data-workspace-widget]')||el||undefined);
      el?.querySelector<HTMLElement>('[contenteditable=true],input,textarea')?.focus({preventScroll:true});
    });
  }
  function begin(event:ReactPointerEvent,kind:string,selected=members){
    if(event.button!==0)return;
    if(selectedSection&&kind!=='move'){if(selectedSection.locked||!['e','w'].includes(kind))return;event.preventDefault();event.stopPropagation();const el=root.current!.querySelector<HTMLElement>(`#section-${CSS.escape(sectionId)}`)!;gesture.current={kind,pointer:event.pointerId,x:(event.clientX/zoom),y:(event.clientY/zoom),bounds:rect(el),blocks:[],initial:source.current,frames:{},moved:false,targets:[...root.current!.querySelectorAll<HTMLElement>('.hev-section')].filter(target=>target!==el&&target.getBoundingClientRect().width>0).map(rect),section:{id:sectionId,width:selectedSection.width??100,widthPx:selectedSection.widthPx,parentWidth:el.parentElement!.clientWidth}};(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);return;}
    if(!selected.length||selected.some(b=>b.editor?.locked))return;
    event.preventDefault();event.stopPropagation();
    const layout=layoutItems(selected);
    const items=selected.flatMap(block=>{const el=element(block.id),item=layout.find(item=>item.id===block.id);return el&&item?[{block:{...block,editor:item.frame},box:rect(el),width:item.width,parentWidth:item.parentWidth}]:[];});
    if(!items.length)return;
    const bounds=selectionBounds(items.map(i=>i.box))!;
    const chosen=new Set(selected.map(b=>b.id));
    const sections=[...new Set(items.map(i=>element(i.block.id)?.closest('.hev-section')).filter((s):s is HTMLElement=>!!s))];
    const targets=[...blocks.filter(b=>!chosen.has(b.id)&&sections.includes(element(b.id)?.closest('.hev-section') as HTMLElement)).map(b=>element(b.id)).filter((e):e is HTMLElement=>!!e).map(rect).filter(r=>r.top+r.height>0&&r.top<(innerHeight/zoom)&&r.left+r.width>0&&r.left<(innerWidth/zoom)),...sections.map(section=>{const r=rect(section),css=getComputedStyle(section),l=parseFloat(css.paddingLeft)||0,t=parseFloat(css.paddingTop)||0;return {left:r.left+l,top:r.top+t,width:r.width-l-(parseFloat(css.paddingRight)||0),height:r.height-t-(parseFloat(css.paddingBottom)||0)};})];
    gesture.current={kind,pointer:event.pointerId,x:(event.clientX/zoom),y:(event.clientY/zoom),bounds,blocks:items,initial:source.current,frames:{},moved:false,targets,layout};
    if(kind==='move')dragScroll.current=requestAnimationFrame(scrollDuringDrag);
    (kind==='move'?((event.target as HTMLElement).closest<HTMLElement>('.hev-block')??element(selected[0].id)!):event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function scrollDuringDrag(){
    const g=gesture.current;
    if(!g||g.kind!=='move')return;
    const scroll=root.current?.closest<HTMLElement>('.studio-workspace-scroll');
    if(scroll&&g.moved&&g.cursor){
      const bounds=rect(scroll),edge=48,y=g.cursor.y;
      const delta=y<bounds.top+edge?-Math.min(18,(bounds.top+edge-y)/3):y>bounds.top+bounds.height-edge?Math.min(18,(y-bounds.top-bounds.height+edge)/3):0;
      if(delta){const before=scroll.scrollTop;scroll.scrollTop+=delta;if(scroll.scrollTop!==before){g.drop=findDrop(g.cursor.x,g.cursor.y,g);setDropTarget(g.drop||null);measureRef.current();}}
    }
    dragScroll.current=requestAnimationFrame(scrollDuringDrag);
  }
  useEffect(()=>()=>cancelAnimationFrame(dragScroll.current),[]);
  function finish(cancel=false){
    const selection=marqueeStart.current;marqueeStart.current=null;setMarquee(null);
    if(selection){
      if(cancel){setIds(selection.previousIds);setSectionIds(selection.previousSections);}else if(ids.length>1)choose(ids);
      if(selection.capture.hasPointerCapture(selection.pointer))selection.capture.releasePointerCapture(selection.pointer);
    }
    const g=gesture.current;gesture.current=null;cancelAnimationFrame(dragScroll.current);setDraft(null);setGuides([]);setDropTarget(null);if(g)setIds(current=>[...current]);if(g?.moved&&!cancel){if(g.section){const next=structuredClone(g.initial),section=next.pages.flatMap(p=>p.sections).find(s=>s.id===g.section!.id);if(section)Object.assign(section,g.section.widthPx!==undefined?{widthPx:g.section.widthPx}:{width:g.section.width});save(next);}else if(g.drop){
      let next=g.initial; const target=g.drop;
      const frames:Record<string,ElementFrame>={};
      let offset=target.y||0;
      g.blocks.forEach(({block,width,box},i)=>{next=moveHtmlBlock(next,block.id,target.section,target.column,target.index+i);frames[block.id]={...block.editor,position:target.absolute?'absolute':'flow',x:target.x||0,y:target.y===undefined?0:offset,rotation:0,...resizedElementWidth(block.editor,target.absolute?width:Math.min(width,target.width),target.width)};offset+=box.height+12;});
      if(target.absolute){next=structuredClone(next);const section=next.pages.flatMap(p=>p.sections).find(s=>s.id===target.section)!;const el=root.current?.querySelector<HTMLElement>(`#section-${CSS.escape(target.section)}`);if(el)section.minHeight=Math.max(section.minHeight||0,el.offsetHeight);}
      save(patchHtmlFrames(next,frames));
      requestAnimationFrame(()=>element(g.blocks[0].block.id)?.scrollIntoView({block:'nearest'}));
    }else save(g.scaled?patchScaledSelection(g.initial,g.frames):patchHtmlFrames(g.initial,g.frames));}}
  function startMarquee(event:ReactPointerEvent|PointerEvent,section?:HTMLElement|null){
    event.preventDefault();root.current?.focus({preventScroll:true});
    const capture=event.currentTarget as HTMLElement;
    marqueeStart.current={x:event.clientX/zoom,y:event.clientY/zoom,pointer:event.pointerId,capture,initial:event.shiftKey?ids:[],previousIds:ids,previousSections:sectionIds};
    if(!event.shiftKey){clear();setSectionId(section?.getAttribute('data-section')||'');onSelect(section||undefined);}
    capture.setPointerCapture(event.pointerId);
  }
  function hitElement(target:Element,x:number,y:number){
    const initial=target.closest<HTMLElement>('.hev-block');
    const hit=(el:HTMLElement)=>{
      const b=blocks.find(b=>`block-${b.id}`===el.id);
      if(b?.editor?.locked||b?.editor?.hidden)return false;
      if(studioWorkspace==='tech-blog'&&b?.kind==='image'&&isTechArtwork(b)&&b.value.src.includes('curves')){
        const r=el.getBoundingClientRect(),angle=(b.editor?.rotation??0)*Math.PI/180,dx=(x-r.left-r.width/2)/zoom,dy=(y-r.top-r.height/2)/zoom;
        const u=(dx*Math.cos(angle)+dy*Math.sin(angle))/el.offsetWidth+.5,v=(-dx*Math.sin(angle)+dy*Math.cos(angle))/el.offsetHeight+.5;
        return u>=393.87/674&&u<=645.218/674&&v>=28.08/337&&v<=308.914/337;
      }
      return communityImageHit(el,x,y,zoom);
    };
    if(!initial||hit(initial))return initial;
    return document.elementsFromPoint(x,y).map(element=>element.closest<HTMLElement>('.hev-block')).find(element=>element&&root.current?.contains(element)&&hit(element))??null;
  }
  function pointerDown(event:ReactPointerEvent<HTMLDivElement>){
    if(!enabled||event.button!==0)return;
    const target=event.target as HTMLElement;
    if(target.closest(menuSurface))return;
    const tool=root.current?.closest('.hev-review-surface')?.querySelector('.we-review-layer')?.getAttribute('data-tool');
    if(tool&&tool!=='pointer'&&tool!=='none')return;
    const el=hitElement(target,event.clientX,event.clientY),id=el?.id.replace('block-',''),block=blocks.find(b=>b.id===id);
    const clickedSection=target.closest<HTMLElement>('.hev-section');
    if(insertPanel.enabled&&clickedSection&&(event.shiftKey||event.metaKey||event.ctrlKey)&&(sectionSelection||!block)&&!target.closest('button,a,input,textarea,[role=tab]')){
      event.preventDefault();event.stopPropagation();root.current?.focus({preventScroll:true});chooseSection(clickedSection.dataset.section!,event.shiftKey,event.metaKey||event.ctrlKey);return;
    }
    if(block){
      const parentSection=el?.closest('.hev-section');if(parentSection?.hasAttribute('data-locked')){event.preventDefault();event.stopPropagation();setIds([]);setSectionId(parentSection.getAttribute('data-section')||'');setEditingId('');return;}
      if(editingId===id&&!event.shiftKey&&!event.metaKey&&!event.ctrlKey)return;
      event.preventDefault();event.stopPropagation();root.current?.focus({preventScroll:true});
      const additive=event.shiftKey||event.metaKey||event.ctrlKey;
      const group=block.editor?.groupId;
      const selectableIds=ids.filter(id=>blocks.some(b=>b.id===id&&!b.editor?.locked&&!b.editor?.hidden));
      const next=event.altKey?[id!]:additive?(selectableIds.includes(id!)?selectableIds.filter(i=>i!==id):[...selectableIds,id!]):selectableIds.includes(id!)?selectableIds:group?blocks.filter(b=>b.editor?.groupId===group&&!b.editor?.locked&&!b.editor?.hidden).map(b=>b.id):[id!];
      choose(next);if(next.length===1&&block.kind==='image'&&(block.badge||block.ambassador||block.brandRole||((studioWorkspace==='tech-blog'||studioWorkspace==='ambassadors')&&isTechArtwork(block)))){setDesign(true);host.panelChanged('html-selection',true);}if(!additive)begin(event,'move',blocks.filter(b=>next.includes(b.id)));return;
    }
    if(target.closest('button,a,input,textarea,[role=tab],.hev-section-tools,.hev-column-resizer'))return;
    if(target.closest('.hev-content'))startMarquee(event,target.closest<HTMLElement>('.hev-section'));
  }
  function move(event:ReactPointerEvent|PointerEvent){
    const start=marqueeStart.current;
    if(start){if(event.pointerId!==start.pointer)return;if(!(event.buttons&1)){finish();return;}if(Math.hypot((event.clientX/zoom)-start.x,(event.clientY/zoom)-start.y)<4)return;setSectionId('');const box={left:Math.min(start.x,(event.clientX/zoom)),top:Math.min(start.y,(event.clientY/zoom)),width:Math.abs((event.clientX/zoom)-start.x),height:Math.abs((event.clientY/zoom)-start.y)};setMarquee(box);setIds([...new Set([...start.initial,...blocks.filter(b=>{const el=element(b.id);if(!el||b.editor?.locked||el.closest('.hev-section[data-locked]'))return false;const r=rect(el);return r.left<box.left+box.width&&r.left+r.width>box.left&&r.top<box.top+box.height&&r.top+r.height>box.top;}).map(b=>b.id)])]);return;}
    const g=gesture.current;if(!g)return;if(event.pointerId!==g.pointer)return;if(!(event.buttons&1)){finish();return;}
    const dx=(event.clientX/zoom)-g.x,dy=(event.clientY/zoom)-g.y;if(!g.moved&&Math.hypot(dx,dy)<3)return;g.moved=true;
    const {kind,bounds}=g;
    g.scaled=false;
    let moveGuides:Guide[]=[];
    if(g.section){
      const next=structuredClone(g.initial),section=next.pages.flatMap(p=>p.sections).find(s=>s.id===g.section!.id)!;
      const raw=resizedSectionWidth(section,bounds.width+dx*(kind==='w'?-2:2),g.section.parentWidth);
      const pixels=raw.widthPx??g.section.parentWidth*(raw.width??100)/100;
      const snap=event.altKey?{width:pixels,guides:[],matched:false}:snapHtmlSectionResize(bounds,pixels,g.targets);
      const width=resizedSectionWidth(section,snap.width,g.section.parentWidth);
      Object.assign(section,width);Object.assign(g.section,width);const sectionWidth=width.widthPx??g.section.parentWidth*(width.width??100)/100;setGuides(clipHtmlGuides(snap.guides,[{...bounds,left:bounds.left+(bounds.width-sectionWidth)/2,width:sectionWidth},...g.targets.filter(target=>Math.abs(target.width-sectionWidth)<.75)]));setDraft(next);return;
    }
    if(kind==='rotate'){
      const cx=bounds.left+bounds.width/2,cy=bounds.top+bounds.height/2;
      let angle=(Math.atan2((event.clientY/zoom)-cy,(event.clientX/zoom)-cx)-Math.atan2(g.y-cy,g.x-cx))*180/Math.PI;
      if(event.shiftKey)angle=Math.round(angle/15)*15;
      g.frames=rotateSelectionFrames(g.blocks.map(({block,box})=>({id:block.id,frame:block.editor??{},box})),bounds,angle);
    }else if(kind==='line-start'||kind==='line-end'){
      const {block,width}=g.blocks[0];
      g.scaled=event.shiftKey&&(event.ctrlKey||event.metaKey);
      g.frames={[block.id]:resizeCanvasLine(block.editor??{},width,{x:dx,y:dy},kind==='line-end'?'end':'start',g.scaled)};
    }else if(kind==='move'){
      g.cursor={x:(event.clientX/zoom),y:(event.clientY/zoom)};g.drop=findDrop((event.clientX/zoom),(event.clientY/zoom),g);setDropTarget(g.drop||null);
      const raw=event.shiftKey?(Math.abs(dx)>Math.abs(dy)?{x:dx,y:0}:{x:0,y:dy}):{x:dx,y:dy};
      const snapped=event.altKey?{delta:raw,guides:[]}:snapHtmlMove(bounds,raw,g.targets);moveGuides=snapped.guides;
      g.frames=Object.fromEntries(g.blocks.map(({block})=>[block.id,{...block.editor,x:clamp((block.editor?.x||0)+snapped.delta.x,-4000,4000),y:clamp((block.editor?.y||0)+snapped.delta.y,-4000,4000)}]));
    }
    else if((g.blocks.length>1&&g.blocks.every(({block})=>block.editor?.groupId&&block.editor.groupId===g.blocks[0].block.editor?.groupId))||(event.shiftKey&&(event.ctrlKey||event.metaKey))){
      const aroundOrigin=event.shiftKey&&(event.ctrlKey||event.metaKey);
      const origin:ScaleOrigin=aroundOrigin?scaleOrigin:[kind.includes('w')?1:kind.includes('e')?0:.5,kind.includes('n')?1:kind.includes('s')?0:.5];
      const result=scaleSelection(g.layout??[],g.blocks.map(item=>item.block),bounds,selectionResizeFactor(bounds,{x:dx,y:dy},kind,origin),origin,g.blocks.length>1);
      g.frames=result.frames;g.scaled=true;
    }
    else{
      const xFactor=kind.includes('w')?-1:1,yFactor=kind.includes('n')?-1:1;
      let sx=kind==='n'||kind==='s'?1:Math.max(.05,(bounds.width+dx*xFactor)/bounds.width),sy=kind==='e'||kind==='w'?1:Math.max(.05,(bounds.height+dy*yFactor)/bounds.height);
      if(kind!=='n'&&kind!=='s')sx=Math.max(sx,...g.blocks.map(({block,width})=>htmlBlockMinWidth(block)/width));
      if(g.blocks.some(({block})=>block.kind==='image'&&(block.badge||block.ambassador||block.brandRole||((studioWorkspace==='tech-blog'||studioWorkspace==='ambassadors')&&isTechArtwork(block))))){if(kind==='n'||kind==='s')sx=sy;else sy=sx;}else if(event.shiftKey&&kind.length===2)sy=sx;
      g.frames=Object.fromEntries(g.blocks.map(({block,box,width,parentWidth})=>{const widthNext=resizedElementWidth(block.editor,width*sx,parentWidth);return [block.id,{...block.editor,...widthNext,...(sy!==1?{height:clamp(box.height*sy,12,3000)}:{}),x:clamp((block.editor?.x||0)+(kind.includes('w')?bounds.width*(1-sx):0)+(box.left-bounds.left)*(sx-1),-4000,4000),y:clamp((block.editor?.y||0)+(kind.includes('n')?bounds.height*(1-sy):0)+(box.top-bounds.top)*(sy-1),-4000,4000)}];}));
    }
    if(!g.scaled)g.frames=constrainLayoutFrames(g.layout||[],g.frames);
    const actual=selectionBounds((g.layout||[]).map(item=>frameRect(item,g.frames[item.id]||item.frame)));
    setGuides(g.drop||!actual?[]:clipHtmlGuides(moveGuides.filter(guide=>{const start=guide.axis==='x'?actual.left:actual.top,size=guide.axis==='x'?actual.width:actual.height;return [0,.5,1].some(part=>Math.abs(start+size*part-guide.value)<.75);}), (g.layout||[]).map(item=>item.limits)));
    setDraft(g.scaled?patchScaledSelection(g.initial,g.frames):patchHtmlFrames(g.initial,g.frames));
  }
  useEffect(()=>{
    if(!enabled)return;
    const outside=(e:PointerEvent)=>{const target=e.target as Element;if(marqueeStart.current?.pointer===e.pointerId||root.current?.contains(target)||target.closest(menuSurface))return;clear();};
    const key=(e:KeyboardEvent)=>{
      if(e.defaultPrevented||(!ids.length&&!sectionIds.length&&!marqueeStart.current)||!(e.target instanceof Element)||e.target.closest('input,textarea,[contenteditable=true],[role=menu],[role=dialog],.workspace-widget-panelhost'))return;
      if(e.key==='Escape'){e.preventDefault();if(gesture.current||marqueeStart.current)finish(true);else clear();return;}
      if(gesture.current||marqueeStart.current){if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();finish(true);}return;}
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='a'){e.preventDefault();if(insertPanel.enabled&&sectionSelection){setSectionIds(page.sections.map(s=>s.id));return;}choose(page.sections.filter(s=>!s.locked).flatMap(s=>s.columns.flat()).filter(b=>!b.editor?.locked&&!b.editor?.hidden).map(b=>b.id));return;}
      if(locked)return;
      if(!sectionSelection&&(e.metaKey||e.ctrlKey)&&!e.altKey&&e.key.toLowerCase()==='g'){e.preventDefault();if(!e.repeat){const next=canvasLayerAction(source.current,ids,e.shiftKey?'ungroup':'group',crypto.randomUUID());if(next!==source.current)save(next);}return;}
      if(layeredSelection&&(e.metaKey||e.ctrlKey)&&(e.code==='BracketLeft'||e.code==='BracketRight')){e.preventDefault();arrange(e.code==='BracketRight'?(e.shiftKey?'bring-to-front':'bring-forward'):(e.shiftKey?'send-to-back':'send-backward'));return;}
      if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();action('delete');}
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='d'){e.preventDefault();action('duplicate');}
      if((e.key==='Enter'||e.key==='F2')&&one){e.preventDefault();editBlock(one);}
      if(!sectionSelection&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&!e.metaKey&&!e.ctrlKey){e.preventDefault();const n=e.shiftKey?10:1,items=layoutItems(members);save(patchHtmlFrames(source.current,constrainLayoutFrames(items,Object.fromEntries(items.map(b=>[b.id,{...b.frame,x:(b.frame.x||0)+(e.key==='ArrowRight'?n:e.key==='ArrowLeft'?-n:0),y:(b.frame.y||0)+(e.key==='ArrowDown'?n:e.key==='ArrowUp'?-n:0)}])))));}
    };
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};
  },[enabled,ids,members,locked,one,sectionIds.join(','),selectedSection]);
  useEffect(()=>{
    if(!enabled||!fixedCanvas)return;
    const editingTarget=(event:ClipboardEvent)=>event.defaultPrevented||!(event.target instanceof Element)||!!event.target.closest('input,textarea,[contenteditable=true],[role=menu],[role=dialog],.workspace-widget-panelhost,.we-chat');
    const copy=(event:ClipboardEvent)=>{
      if(editingTarget(event)||!members.length||!event.clipboardData)return;
      const payload=JSON.stringify({version:1,blocks:copiedCanvasBlocks(members,imageSources)});
      event.clipboardData.setData(canvasClipboardType,payload);
      event.clipboardData.setData('text/plain',canvasClipboardPrefix+payload);
      event.preventDefault();
    };
    const paste=(event:ClipboardEvent)=>{
      if(editingTarget(event)||!event.clipboardData)return;
      const plain=event.clipboardData.getData('text/plain'),raw=event.clipboardData.getData(canvasClipboardType)||(plain.startsWith(canvasClipboardPrefix)?plain.slice(canvasClipboardPrefix.length):'');
      if(!raw||raw.length>80_000_000)return;
      try{
        const payload=JSON.parse(raw);if(payload.version!==1||!Array.isArray(payload.blocks)||payload.blocks.length>80)return;
        const blocks=payload.blocks.map((block:unknown)=>htmlBlockSchema.parse(block));
        const result=pasteCanvasBlocks(source.current,pageId,blocks,root.current?.clientWidth||1080,page.sections[0]?.minHeight||1080);
        if(!result)return;
        event.preventDefault();save(result.state);choose(result.ids);root.current?.focus({preventScroll:true});
      }catch{/* Leave unsupported clipboard contents to the native paste handler. */}
    };
    document.addEventListener('copy',copy);document.addEventListener('paste',paste);
    return()=>{document.removeEventListener('copy',copy);document.removeEventListener('paste',paste);};
  },[enabled,fixedCanvas,members,pageId,imageSources]);
  const handlers=useRef({finish,move,startMarquee});handlers.current={finish,move,startMarquee};
  useEffect(()=>{if(!enabled)return;const up=()=>handlers.current.finish(),cancel=()=>handlers.current.finish(true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',cancel,true);window.addEventListener('blur',cancel);return()=>{window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('blur',cancel);};},[enabled]);
  useEffect(()=>{
    if(!enabled||!fixedCanvas)return;
    const surface=root.current?.closest<HTMLElement>('[data-html-selection-surface]');if(!surface)return;
    const down=(event:PointerEvent)=>{
      if(event.button!==0||event.defaultPrevented||!(event.target instanceof Element)||root.current?.contains(event.target)||event.target.closest(`${menuSurface},button,a,input,textarea,[contenteditable=true],[role=tab]`))return;
      handlers.current.startMarquee(event);
    };
    const move=(event:PointerEvent)=>{if(marqueeStart.current?.capture===surface)handlers.current.move(event);};
    const lost=(event:PointerEvent)=>{if(marqueeStart.current?.pointer===event.pointerId)handlers.current.finish(true);};
    surface.addEventListener('pointerdown',down);surface.addEventListener('pointermove',move);surface.addEventListener('lostpointercapture',lost);
    return()=>{surface.removeEventListener('pointerdown',down);surface.removeEventListener('pointermove',move);surface.removeEventListener('lostpointercapture',lost);};
  },[enabled,fixedCanvas]);
  const toolButton=(label:string,name:string,click:()=>void,disabled=false)=><Tooltip label={label} side="top"><Button size="sm" variant="ghost" aria-label={label} disabled={disabled} leadingIcon={<Icon name={name} size={16}/>} onClick={click}/></Tooltip>;
  // Outlines follow the document; section controls also recompute their visible side on scroll.
  const bounds=geometry?.bounds,frame=geometry?.frame,visible=geometry?.origin,viewport=geometry?.visible,show=enabled&&bounds&&frame&&visible&&viewport;
  const sectionInset=bounds&&frame?frame.left-bounds.left:0;
  const selectedLine=one?.kind==='shape'&&one.shape==='line'&&one.editor?.position==='absolute';
  const lineAngle=(one?.editor?.rotation??0)*Math.PI/180,lineLength=one?.editor?.widthPx??element(one?.id??'')?.offsetWidth??0;
  const rotateSize=32/zoom,rotateInset=12/zoom,toolbarWidth=(toolbar.current?.offsetWidth||204)/zoom;
  const pinnedRotate=communityCanvas&&bounds&&viewport&&geometry?rotationHandlePosition(bounds,viewport,rotateSize,rotateInset,{left:geometry.toolbar.left-toolbarWidth/2,top:geometry.toolbar.top,width:toolbarWidth,height:(toolbar.current?.offsetHeight||36)/zoom}):undefined;
  const rotateTop=pinnedRotate&&visible?pinnedRotate.top-visible.top:bounds&&visible?clamp(bounds.top+bounds.height-visible.top+12,viewport!.top-visible.top+12,viewport!.top+viewport!.height-visible.top-44):0;
  const rotateLeft=pinnedRotate&&visible?pinnedRotate.left-visible.left:bounds&&visible&&geometry?clamp((Math.abs(geometry.toolbar.top-visible.top-rotateTop)<40?geometry.toolbar.left-visible.left+(toolbar.current?.offsetWidth||204)/2+12:bounds.left+bounds.width/2-visible.left-16),viewport!.left-visible.left+12,viewport!.left+viewport!.width-visible.left-44):0;
  const ui=mode&&<>
    {enabled&&geometry&&root.current&&createPortal(<div className="hcs-overlay" onPointerMove={move} onPointerUp={()=>finish()} onPointerCancel={()=>finish(true)}>
      {geometry.spacing.filter(box=>box.width>0&&box.height>0).map((box,index)=><div key={index} className="hcs-spacing-preview" data-spacing={spacingPreview} aria-hidden="true" style={{left:box.left-geometry.origin.left,top:box.top-geometry.origin.top,width:box.width,height:box.height}}/>)}
      {!!guides.length&&<svg className="hcs-guides" aria-label="Alignment guides">{guides.map(g=><line key={`${g.axis}-${g.value}-${g.start}-${g.end}`} x1={(g.axis==='x'?g.value:g.start)-geometry.origin.left} y1={(g.axis==='y'?g.value:g.start)-geometry.origin.top} x2={(g.axis==='x'?g.value:g.end)-geometry.origin.left} y2={(g.axis==='y'?g.value:g.end)-geometry.origin.top} stroke="var(--ui-accent)" strokeWidth="1" vectorEffect="non-scaling-stroke"/>)}</svg>}
      {dropTarget&&<div className="hcs-drop-target" data-absolute={dropTarget.absolute||undefined} aria-label={dropTarget.absolute?"Place in section":"Insert into section"} style={{left:dropTarget.line.left-geometry.origin.left,top:dropTarget.line.top-geometry.origin.top,width:dropTarget.line.width,height:dropTarget.absolute?dropTarget.line.height:2}}/>}
      {marquee&&<div className="hcs-marquee" style={{left:marquee.left-geometry.origin.left,top:marquee.top-geometry.origin.top,width:marquee.width,height:marquee.height}}/>}
      {show&&editingId&&one?.kind==='text'&&<div ref={toolbar} className="hcs-text-tools hcs-ui" style={{left:geometry.toolbar.left-visible.left,top:geometry.toolbar.top-visible.top}}><div ref={setTextToolbarHost}/></div>}
      {show&&(!editingId||hasWidgetTools)&&<>
        {members.length>1&&geometry.boxes.map((b,i)=><div key={i} className="hcs-member" style={{left:b.left-visible.left,top:b.top-visible.top,width:b.width,height:b.height}}/>)}
        {multipleSections?geometry.boxes.map((box,index)=>selectedSections[index]&&<div key={selectedSections[index].id} className="hcs-selection hcs-section-selection" role="group" aria-label={`Selected section: ${selectedSections[index].name}`} data-section={selectedSections[index].id} style={{left:box.left+sectionInset-visible.left,top:box.top+sectionInset-visible.top,width:Math.max(0,box.width-sectionInset*2),height:Math.max(0,box.height-sectionInset*2)}}/>):<div className="hcs-selection" data-absolute={one?.editor?.position==='absolute'||undefined} role="group" aria-label={selectedSection?'Selected section':members.length>1?`${members.length} selected elements`:'Selected element'} style={{left:frame.left-visible.left,top:frame.top-visible.top,width:frame.width,height:frame.height}}>
          {!locked&&one?.editor?.position==='absolute'&&['top','right','bottom','left'].map(edge=><span key={edge} className="hcs-absolute-drag-edge hcs-ui" data-edge={edge} onPointerDown={event=>begin(event,'move')}/>)}
          {selectedGroup&&<span className="hcs-scale-pivot" aria-hidden="true" style={{left:`${scaleOrigin[0]*100}%`,top:`${scaleOrigin[1]*100}%`}}/>}
          {!locked&&selectedLine&&(['start','end'] as const).map(end=>{const side=end==='end'?1:-1;return <button key={end} className="hcs-handle hcs-ui" data-corner data-line-end={end} style={{left:frame.width/2+side*Math.cos(lineAngle)*lineLength/2,top:frame.height/2+side*Math.sin(lineAngle)*lineLength/2,cursor:Math.abs(Math.cos(lineAngle))>.7?'ew-resize':'ns-resize'}} aria-label={`Resize line ${end}`} onPointerDown={e=>begin(e,`line-${end}`)}/>;})}
          {!locked&&!selectedLine&&!(fixedCanvas&&sectionSelection)&&handles.filter(([h])=>selectedSection?['e','w'].includes(h):h.length===2||(h==='n'||h==='s'?bounds.width:bounds.height)>=48).map(([h,x,y,label])=><button key={h} className="hcs-handle hcs-ui" data-handle={h} data-section-edge={selectedSection?true:undefined} data-corner={h.length===2||undefined} style={{left:`${x}%`,top:`${y}%`}} aria-label={`Resize selection from ${label}`} onPointerDown={e=>begin(e,h)}/>)}
        </div>}
        {selectedSection&&!fixedCanvas&&[false,true].map(after=>{
          const edge=insertPanel.enabled&&(after?page.sections.at(-1)?.id:page.sections[0]?.id)===sectionId;
          return <Tooltip key={String(after)} label={after?'Add section below':'Add section above'}><Button className="hcs-section-add hcs-ui" data-section-edge={edge?(after?'end':'start'):undefined} variant="ghost" size="sm" aria-label={after?'Add section below selection':'Add section above selection'} leadingIcon={<Icon name="plus" size={16}/>} style={{left:frame.left+frame.width/2-visible.left,top:(edge?bounds.top+(after?bounds.height:0):frame.top+(after?frame.height:0))-visible.top}} onClick={event=>onAddSection(sectionId,after,event.currentTarget)}/></Tooltip>;
        })}
        {!locked&&!sectionSelection&&<Button className="hcs-rotate hcs-ui" size="sm" variant="ghost" aria-label="Rotate selection" data-rotating={gesture.current?.kind==='rotate'||undefined} leadingIcon={<Icon name="rotate-cw" size={14}/>} style={{left:rotateLeft,top:rotateTop,visibility:!communityCanvas&&gesture.current?.kind==='rotate'?'hidden':undefined}} onPointerDown={e=>begin(e,'rotate')} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();rotateBy((e.key==='ArrowRight'?1:-1)*(e.shiftKey?15:1));}}}/>}
        <div ref={toolbar} className="hcs-toolbar hcs-ui" data-section={insertPanel.enabled&&sectionSelection||undefined} data-pinned={geometry.toolbar.fixed||undefined} role="toolbar" aria-label="Selected element actions" style={{position:geometry.toolbar.fixed?'fixed':undefined,left:geometry.toolbar.left-(geometry.toolbar.fixed?0:visible.left),top:geometry.toolbar.top-(geometry.toolbar.fixed?0:visible.top),visibility:gesture.current||insertPanel.enabled&&sectionSelection&&!geometry.boxes.some(box=>box.top+box.height>viewport.top&&box.top<viewport.top+viewport.height)?'hidden':undefined}}>
          {sectionSelection&&<div className="hcs-widget-identity"><span className="hcs-widget-label"><Icon name={fixedCanvas?'frame':insertPanel.enabled?'rectangle-horizontal':'layout-template'} size={16}/><span>{multipleSections?`${selectedSections.length} sections`:selectedSection!.name}</span></span></div>}{hasWidgetTools&&<div className="hcs-widget-identity" ref={setWidgetIdentityHost}/>}
          {toolButton(locked?'Unlock selection':'Lock selection',locked?'lock':'lock-open',()=>action(locked?'unlock':'lock'))}
          {hasWidgetTools&&<div className="hcs-widget-tools" ref={setWidgetToolbarHost}/>}
          {((one&&!hasWidgetDesign)||multiDesign||selectedSection)&&toolButton(selectedSection?'Edit section design':'Edit element design','paintbrush-vertical',()=>{setDesign(v=>!v);host.panelChanged('html-selection',!design);})}
          {one?.kind==='shape'&&one.icon&&<HtmlIconMenu value={one.icon} onAdd={name=>changeBlock({...one,icon:name})} trigger={<Button size="sm" variant="ghost" aria-label="Change icon" leadingIcon={<LucideGlyph name={one.icon} size={16}/>}/>}/>}
          {one?.kind==='shape'&&one.icon&&<Button size="sm" variant="ghost" aria-label="Filled icon" active={!!one.filled} onClick={()=>changeBlock({...one,filled:!one.filled})} leadingIcon={<Icon name="circle" size={16} fill={one.filled?'currentColor':'none'}/>}/>}
          {members.some(b=>b.editor?.groupId)&&toolButton('Ungroup elements','layers',()=>{const next=canvasLayerAction(source.current,ids,'ungroup');if(next!==source.current)save(next);})}
          {one?.kind==='media'&&one.format==='Video'&&toolButton('Play or pause video','play',()=>{const video=element(one.id)?.querySelector('video');if(video?.paused)void video.play().catch(()=>{});else video?.pause();})}
          {one?.kind==='image'&&!one.badge&&!one.ambassador&&!one.brandRole&&!isTechArtwork(one)&&toolButton('Replace image','image',()=>onReplace(one.id),locked)}
          {multipleSections&&<>{toolButton('Move selected sections up','arrow-up',()=>action('up'),locked||!page.sections.some((s,i)=>sectionIds.includes(s.id)&&i>0&&!sectionIds.includes(page.sections[i-1].id)))}{toolButton('Move selected sections down','arrow-down',()=>action('down'),locked||!page.sections.some((s,i)=>sectionIds.includes(s.id)&&i<page.sections.length-1&&!sectionIds.includes(page.sections[i+1].id)))}</>}
          {!(fixedCanvas&&sectionSelection)&&toolButton('Duplicate selection','copy',()=>action('duplicate'),locked)}
          {!(fixedCanvas&&sectionSelection)&&toolButton('Delete selection','trash-2',()=>action('delete'),locked)}
          {!(fixedCanvas&&sectionSelection)&&<SelectionMenu open={menu} onOpenChange={setMenu} items={[
            ...(one?.kind==='text'?[{id:'bullet',label:one.value.list==='bullet'?'Remove bullet':'Add bullet',leadingIcon:<Icon name="list" size={16}/>,disabled:locked}]:[]),
            ...(!communityCanvas&&studioWorkspace!=='lovable'&&studioWorkspace!=='tech-blog'&&one?.kind==='image'&&!one.badge&&!one.ambassador?[{id:'play-icon',label:one.value.playIcon?'Hide play icon':'Show play icon',disabled:locked}]:[]),
            ...(one?[{id:'edit',label:one.kind==='text'?'Edit text':'Edit content',leadingIcon:<Icon name="pencil" size={16}/>,disabled:locked}]:[]),
            ...(layeredSelection?layerItems:[{id:'up',label:'Move up',leadingIcon:<Icon name="arrow-up" size={16}/>,disabled:locked},{id:'down',label:'Move down',leadingIcon:<Icon name="arrow-down" size={16}/>,disabled:locked},{id:'first',label:'Move to beginning',disabled:locked},{id:'last',label:'Move to end',disabled:locked}]),
            {kind:'separator'}, {id:'duplicate',label:'Duplicate',leadingIcon:<Icon name="copy" size={16}/>,disabled:locked},
            {id:locked?'unlock':'lock',label:locked?'Unlock':'Lock',leadingIcon:<Icon name={locked?'lock':'lock-open'} size={16}/>},
            {id:'delete',label:'Delete',leadingIcon:<Icon name="trash-2" size={16}/>,disabled:locked},
            ...(one?[{kind:'separator' as const},{id:'position',label:one.editor?.position==='absolute'?'Return to normal flow':'Absolute position',leadingIcon:<Icon name="move" size={16}/>,disabled:locked}]:[])
          ]} onChange={value=>{if(value==='bullet'&&one?.kind==='text'&&!locked)changeBlock({...one,value:{...one.value,list:one.value.list==='bullet'?'none':'bullet'}});else if(value==='play-icon'&&!communityCanvas&&studioWorkspace!=='lovable'&&studioWorkspace!=='tech-blog'&&one?.kind==='image'&&!locked)changeBlock({...one,value:{...one.value,playIcon:!one.value.playIcon}});else if(value==='edit'&&one)editBlock(one);else if(value==='position'&&one)setAbsolute(one.editor?.position!=='absolute');else if(layeredSelection&&layerItems.some(item=>item.id===value))arrange(value as LayerOrderAction);else action(value as SelectionAction);}} trigger={<Button size="sm" variant="ghost" aria-label="More element options" leadingIcon={<Icon name="ellipsis" size={16}/>}/>}/>}
        </div>
      </>}
    </div>,root.current)}
    {design&&selectedSection&&host.panelHost&&host.activeId==='html-selection'&&createPortal(<div className="hcs-ui" style={{display:'contents'}}><HtmlSectionDesign fixedCanvas={fixedCanvas} onSpacingPreview={setSpacingPreview} section={selectedSection} onChange={updateSection} onClose={()=>{setDesign(false);host.closePanel();}}/></div>,host.panelHost)}
    {selectionDesignActive&&one?.kind==='image'&&one.ambassador&&host.panelHost&&host.activeId==='html-selection'&&createPortal(<AmbassadorDesign key={one.id} id={one.id} settings={one.ambassador} src={one.value.src} locked={locked} element={one.ambassadorElement} pending={needsCommunityRender({...one,ambassador:one.ambassador})} onChange={ambassador=>{
      const current=source.current.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat())).find(block=>block.id===one.id);
      if(current?.kind!=='image'||!current.ambassador||current.editor?.locked)return;
      changeBlock(editCommunityBlock({...current,ambassador:current.ambassador},ambassador));
    }} onClose={()=>{setDesign(false);host.closePanel();}}/>,host.panelHost)}
    {selectionDesignActive&&one?.kind==='image'&&(studioWorkspace==='tech-blog'||studioWorkspace==='ambassadors')&&isTechArtwork(one)&&host.panelHost&&host.activeId==='html-selection'&&createPortal(<TechArtworkDesign key={one.id} block={one} locked={locked} onChange={changeBlock} onClose={()=>{setDesign(false);host.closePanel();}}/>,host.panelHost)}
    {selectionDesignActive&&one?.kind==='image'&&one.brandRole==='partner'&&host.panelHost&&host.activeId==='html-selection'&&createPortal(<BrandLogoDesign key={one.id} block={one} locked={locked} onChange={changeBlock} onClose={()=>{setDesign(false);host.closePanel();}}/>,host.panelHost)}
    {selectionDesignActive&&one?.kind==='image'&&one.badge&&host.panelHost&&host.activeId==='html-selection'&&createPortal(<PartnerBadgeDesign key={one.id} block={one} settings={one.badge} src={one.value.src} locked={locked} onAppearanceChange={changeBlock}
      onChange={(badge:PartnerBadgeSettings,image)=>{
        const current=source.current.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat())).find(block=>block.id===one.id);
        if(current?.kind!=='image'||current.editor?.locked)return;
        const width=current.editor?.widthPx||bounds?.width||320,ratio=image.width/image.height;
        changeBlock({...current,badge,value:{...current.value,src:image.src,alt:badgeFormatName(badge.format),crop:undefined,playIcon:undefined},editor:{...current.editor,widthPx:width,height:Math.max(12,Math.min(3000,width/ratio)),appearance:{imageFit:'contain',...current.editor?.appearance}}});
      }} onClose={()=>{setDesign(false);host.closePanel();}}/>,host.panelHost)}
    {selectionDesignActive&&multiDesign&&host.panelHost&&host.activeId==='html-selection'&&createPortal(<div className="hcs-ui" style={{height:'100%',display:'contents'}}><PresentationElementDesign
      shape={{id:ids.join('-'),kind:multiKind,width:Math.min(...members.map(block=>block.editor?.widthPx??bounds?.width??100)),height:Math.min(...members.map(block=>block.editor?.height??bounds?.height??100)),appearance:blockAppearance(members[0])}}
      label={selectedGroup?'Group':`${members.length} ${multiKind==='text'?'texts':multiKind==='image'?'images':multiKind==='selection'?'elements':'shapes'}`} locked={locked} mixed={mixedAppearance(members)} multiple
      positionControls={<><SelectionPositionControls blocks={members} onChange={delta=>{if(!locked)save(translateCanvasSelection(source.current,ids,delta));}}/>{selectedGroup&&<SelectionScaleControls scale={members[0].editor?.groupScale??1} origin={scaleOrigin} onScale={scaleGroup} onOrigin={groupOrigin}/>}</>}
      onChange={(appearance:NonNullable<ElementFrame['appearance']>)=>save(patchSelectionAppearance(source.current,ids,appearance))} onClose={()=>{setDesign(false);host.closePanel();}}/></div>,host.panelHost)}
    {selectionDesignActive&&one&&!(one.kind==='image'&&(one.badge||one.ambassador||one.brandRole==='partner'||((studioWorkspace==='tech-blog'||studioWorkspace==='ambassadors')&&isTechArtwork(one))))&&host.panelHost&&host.activeId==='html-selection'&&createPortal(<div className="hcs-ui" style={{height:'100%',display:'contents'}}><PresentationElementDesign
      shape={{id:one.id,kind:one.kind==='text'?'text':one.kind==='image'?'image':one.kind==='shape'?one.shape:'rectangle',width:bounds?.width||100,height:bounds?.height||100,src:one.kind==='image'?one.value.src:undefined,appearance:{...(one.kind==='text'?{fill:one.value.color,fontFamily:'Camera Plain',fontSize:one.value.size,textAlign:one.value.align,fontWeight:one.value.runs.every(r=>r.bold)?700:400,italic:one.value.runs.length>0&&one.value.runs.every(r=>r.italic),underline:one.value.runs.length>0&&one.value.runs.every(r=>r.underline),lineHeight:one.value.style==='Heading 1'?102:one.value.style.startsWith('Heading')?112:150}:one.kind==='image'?{imageFit:'cover'}:{}),...one.editor?.appearance}}}
      label={one.kind==='text'?(one.value.runs.map(r=>r.text).join('').slice(0,60)||'Text'):one.kind==='image'?'Image':one.kind==='contacts'?'Contact cards':one.kind==='tasks'?'Checklist':one.kind==='media'&&one.format==='Video'?'Video':one.kind==='shape'&&one.icon?'Icon':one.kind==='shape'&&one.shape==='line'?'Line':'Element'} locked={locked}
      spacingAfter={one.editor?.spacingAfter??0} onSpacingAfter={(spacingAfter:number)=>changeBlock({...one,editor:{...one.editor,spacingAfter}})} onSpacingPreview={setSpacingPreview}
      positionControls={one.kind==='shape'&&one.icon?<IconDesignControls icon={one.icon} filled={!!one.filled} locked={!!locked} onIcon={icon=>changeBlock({...one,icon})} onFilled={filled=>changeBlock({...one,filled})}/>:undefined}
      onFillImage={one.kind==='shape'&&!one.icon?()=>onReplace(one.id,true):undefined}
      absolutePosition={one.editor?.position==='absolute'} onAbsolutePosition={setAbsolute}
      resizeWithSection={one.editor?.widthPx===undefined}
      onResizeWithSection={one.kind==='image'?(follow:boolean)=>{const el=element(one.id);if(!el||locked)return;changeBlock({...one,editor:{...one.editor,...imageSectionSizing(follow,el.offsetWidth,el.parentElement!.clientWidth)}});}:undefined}
      onChange={(appearance:NonNullable<ElementFrame['appearance']>)=>{
        const next={...one,editor:{...one.editor,appearance:{...one.editor?.appearance,...appearance}}};
        if(next.kind==='text') next.value={...next.value,...(appearance.fill!==undefined?{color:appearance.fill}:{}),...(appearance.fontSize!==undefined?{size:appearance.fontSize}:{}),...(appearance.textAlign!==undefined?{align:appearance.textAlign}:{}),runs:next.value.runs.map(run=>({...run,...(appearance.fontWeight!==undefined?{bold:appearance.fontWeight>=600}:{}),...(appearance.italic!==undefined?{italic:appearance.italic}:{}),...(appearance.underline!==undefined?{underline:appearance.underline}:{})}))};
        changeBlock(next);
      }} onReplace={()=>onReplace(one.id)} onClose={()=>{setDesign(false);host.closePanel();}} /> </div>,host.panelHost)}
  </>;
  const widgetDesign=one&&hasWidgetTools?<PresentationElementAdvanced id={one.id} label="Widget" value={one.editor?.appearance??{}} locked={locked}
    onChange={(appearance:NonNullable<ElementFrame['appearance']>)=>changeBlock({...one,editor:{...one.editor,appearance:{...one.editor?.appearance,...appearance}}})}
    spacingAfter={one.editor?.spacingAfter??0} onSpacingAfter={(spacingAfter:number)=>changeBlock({...one,editor:{...one.editor,spacingAfter}})} onSpacingPreview={setSpacingPreview}
    absolutePosition={one.editor?.position==='absolute'} onAbsolutePosition={setAbsolute}/>:null;
  return {mode,enabled,ids,sectionId,sectionIds,selectSection:(id:string,range=false,toggle=false)=>{if(enabled)chooseSection(id,range,toggle);},designSection:(id:string)=>{if(!enabled)return;chooseSection(id);setDesign(true);host.panelChanged('html-selection',true);},editingId,textToolbarHost,widgetToolbarHost,widgetIdentityHost,widgetDesign,rendered,ui,clear,edit:editBlock,inserted:(block:HtmlBlock,openDesign:boolean)=>{
    if(!enabled)return;
    if(block.kind==='text')editBlock(block);else choose([block.id]);
    setDesign(openDesign);host.panelChanged('html-selection',openDesign);
    if(openDesign)makerDesign?.setTab('canvas');
  },designElement:(id:string)=>{if(!enabled||!blocks.some(block=>block.id===id))return;choose([id]);setDesign(true);host.panelChanged('html-selection',true);},transforming:!!draft,select:(el?:Element)=>{if(!enabled)return;const id=el?.closest('.hev-block')?.id.replace('block-','');if(id)choose([id]);},
    rootProps:enabled?{tabIndex:0,onPointerDownCapture:pointerDown,onPointerMove:move,onPointerUp:()=>finish(),onPointerCancel:()=>finish(true),onClickCapture:(e:React.MouseEvent)=>{const b=(e.target as Element).closest('.hev-block');if(b&&b.id!==`block-${editingId}`){e.preventDefault();e.stopPropagation();}},onDoubleClickCapture:(e:React.MouseEvent)=>{if((e.target as Element).closest('.hev-section[data-locked]')){e.preventDefault();return;}const id=hitElement(e.target as Element,e.clientX,e.clientY)?.id.replace('block-',''),block=blocks.find(b=>b.id===id);if(block){e.preventDefault();e.stopPropagation();editBlock(block);}},onContextMenu:(e:React.MouseEvent)=>{const id=hitElement(e.target as Element,e.clientX,e.clientY)?.id.replace('block-','');if(id){e.preventDefault();if(!ids.includes(id))choose([id]);setMenu(true);}}}:{}
  };
}

function SelectionMenu({open,onOpenChange,items,onChange,trigger}:{open:boolean;onOpenChange:(v:boolean)=>void;items:({id:string;label:string;leadingIcon?:React.ReactNode;disabled?:boolean;kind?:undefined}|{kind:'separator'})[];onChange:(v:string)=>void;trigger:React.ReactElement<{onClick?:(e:React.MouseEvent)=>void;active?:boolean}>}){return <DropdownMenu open={open} onOpenChange={onOpenChange}><DropdownMenuTrigger>{trigger}</DropdownMenuTrigger><DropdownMenuContent align="center" width={208}><DropdownMenuList>{items.map((item,i)=>item.kind==='separator'?<DropdownMenuSeparator key={i}/>:<DropdownMenuItem key={item.id} disabled={item.disabled} onClick={()=>onChange(item.id)}>{item.leadingIcon&&<DropdownMenuItemIcon>{item.leadingIcon}</DropdownMenuItemIcon>}<DropdownMenuItemLabel>{item.label}</DropdownMenuItemLabel></DropdownMenuItem>)}</DropdownMenuList></DropdownMenuContent></DropdownMenu>;}
