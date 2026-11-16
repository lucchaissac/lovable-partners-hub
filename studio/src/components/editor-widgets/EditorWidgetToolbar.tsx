import {Dropdown,Icon} from '@asset/ui';
import {Children,isValidElement,createContext,useContext,type HTMLAttributes,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

/** An outer canvas can host a widget's real controls, keeping their own state and actions. */
export const EditorWidgetToolbarContext=createContext<{host:HTMLElement|null;identityHost:HTMLElement|null;disabled?:boolean;advancedDesign?:ReactNode}|null>(null);
export function EditorWidgetToolbar({children,className,as:Tag='div',...props}:HTMLAttributes<HTMLDivElement>&{children:ReactNode;as?:'div'|'header'}){
 const canvas=useContext(EditorWidgetToolbarContext);
 if(!canvas)return <Tag className={className} {...props}>{children}</Tag>;
 if(!canvas.host)return null;
 const items=Children.toArray(children);let firstAction=0;
 while(firstAction<items.length){const child=items[firstAction];if(isValidElement(child)&&(child.type===Icon||child.type==='span'))firstAction++;else break;}
 const identity=items.slice(0,firstAction);
 // Removal already lives in the shared selection toolbar; keep widget-specific menus.
 const actions=items.slice(firstAction).filter(child=>{
  if(!isValidElement<{items?:{id?:string}[]}>(child)||child.type!==Dropdown)return true;
  const entries=child.props.items;
  return !entries?.length||!entries.every(item=>item.id==='remove');
 });
 return <>{canvas.identityHost&&createPortal(<div className="hcs-widget-label" inert={canvas.disabled||undefined}>{identity.length?identity:<><Icon name="clipboard-list" size={16}/><span>Form</span></>}</div>,canvas.identityHost)}{createPortal(<div {...props} role="group" className={`${className||''} hcs-native-widget-toolbar`} inert={canvas.disabled||undefined}>{actions}</div>,canvas.host)}</>;
}
