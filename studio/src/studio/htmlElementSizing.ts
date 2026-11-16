import type { HtmlBlock } from './htmlEditorModel.js';
type ElementFrame = NonNullable<HtmlBlock['editor']>;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export const HTML_WIDGET_MIN_WIDTH = 200;
/** Native widgets, embedded content and custom HTML share the same canvas minimum. */
export function htmlBlockMinWidth(block:{kind:string}) {
  return ['tasks','contacts','synced','inventory','code','media'].includes(block.kind)?HTML_WIDGET_MIN_WIDTH:0;
}

export function htmlElementWidth(frame?:ElementFrame) {
  return frame?.widthPx!==undefined?`${frame.widthPx}px`:frame?.width?`${frame.width}%`:undefined;
}

/** Keep the current sizing mode when the user resizes an element directly. */
export function resizedElementWidth(frame:ElementFrame|undefined,width:number,parentWidth:number):Pick<ElementFrame,'width'|'widthPx'> {
  return frame?.widthPx!==undefined?{widthPx:clamp(width,1,4000)}:{width:clamp(width/Math.max(1,parentWidth)*100,.1,500)};
}

/** Switching mode preserves the currently rendered size. */
export function imageSectionSizing(follow:boolean,width:number,parentWidth:number):Pick<ElementFrame,'width'|'widthPx'> {
  return follow?{width:clamp(width/Math.max(1,parentWidth)*100,.1,500),widthPx:undefined}:{widthPx:clamp(width,1,4000)};
}

/** Begin a gesture from the rendered position, including responsive CSS clamps. */
export function renderedElementFrame(frame:ElementFrame|undefined,size:{width:number;height:number;parentWidth:number;left:number;top:number}):ElementFrame {
  return {...frame,...resizedElementWidth(frame,size.width,size.parentWidth),x:size.left,
    y:frame?.position==='absolute'?size.top:frame?.y||0,
    ...(frame?.height!==undefined?{height:size.height}:{}),
  };
}
