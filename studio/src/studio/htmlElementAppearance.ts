import type { CSSProperties } from 'react';
import type { HtmlBlock } from './htmlEditorModel';
export type ElementAppearance = NonNullable<NonNullable<HtmlBlock['editor']>['appearance']>;
export function elementPadding(a: ElementAppearance = {}) {
  return {top:a.paddingTop??a.padding??0,right:a.paddingRight??a.padding??0,bottom:a.paddingBottom??a.padding??0,left:a.paddingLeft??a.padding??0};
}
/** Padding stays inside the selected element's width, even in a narrow column. */
export function elementBoxStyle(a: ElementAppearance = {}, bullet = false): CSSProperties {
  const p=elementPadding(a),hasPadding=['padding','paddingTop','paddingRight','paddingBottom','paddingLeft'].some(key=>a[key as keyof ElementAppearance]!==undefined);
  return {boxSizing:'border-box',backgroundColor:a.background,
    ...(hasPadding?{paddingTop:p.top,paddingBottom:p.bottom,paddingLeft:`min(${p.left+(bullet?22:0)}px, 50%)`,paddingRight:`min(${p.right}px, 50%)`}:{}),
    '--hcs-padding-top':`${p.top}px`,'--hcs-padding-left':`${p.left}px`,
  } as CSSProperties;
}
export function elementContentHeight(height:number|undefined,a:ElementAppearance={}) {
  if(height===undefined)return undefined;
  const p=elementPadding(a);
  return Math.max(0,height-p.top-p.bottom-2*(a.borderWidth??0));
}
export function elementBackgroundImage(a:ElementAppearance={}):CSSProperties {
  return {backgroundImage:a.backgroundImage?`url(${JSON.stringify(a.backgroundImage)})`:undefined,backgroundSize:a.backgroundFit??'cover',backgroundPosition:'center',backgroundRepeat:'no-repeat'};
}
