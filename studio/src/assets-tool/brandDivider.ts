import type {HtmlBlock} from '../studio/htmlEditorModel';
import {partnershipTemplate} from '../../../shared/brandTemplates.mjs';

/** Upgrade only the Partnership separator, preserving its center, ink and stroke. */
export function nativeBrandDivider(block:HtmlBlock):HtmlBlock {
 if(block.id!=='brand-divider'||block.kind!=='shape'||block.shape!=='rectangle')return block;
 const frame=block.editor??{},width=frame.widthPx??2,height=frame.height??65.19;
 const vertical=height>=width,thickness=Math.min(width,height);
 // A manually redesigned broad shape is no longer the original separator.
 if(thickness<1||thickness>24)return block;
 const length=Math.max(width,height),rotation=(frame.rotation??0)+(vertical?90:0);
 return {...block,shape:'line',editor:{...frame,x:(frame.x??616)+width/2-length/2,y:(frame.y??307)+height/2-thickness/2,widthPx:length,height:thickness,rotation:((rotation+180)%360+360)%360-180,appearance:{...frame.appearance,lineWidth:thickness,lineStyle:'solid'}}};
}

export function partnershipDivider():HtmlBlock {
 const {x,y,width,height,color}=partnershipTemplate.divider;
 return nativeBrandDivider({id:'brand-divider',kind:'shape',shape:'rectangle',editor:{position:'absolute',x,y,widthPx:width,height,appearance:{fill:color}}});
}
