import { useContext, type HTMLAttributes } from 'react';
import { HtmlSelectionMode } from './HtmlSelectionMode';
/** Insertion controls sit in existing gaps; opening one never moves content. */
export function HtmlInsertionGap({kind,open=false,children,className='',...props}:HTMLAttributes<HTMLDivElement>&{kind:'block'|'section';open?:boolean}){
 const mode=useContext(HtmlSelectionMode);
 return <div {...props} className={`${className}${mode?' hcs-gap':''}`} data-gap={mode?kind:undefined} data-expanded={open||undefined}>{children}</div>;
}
