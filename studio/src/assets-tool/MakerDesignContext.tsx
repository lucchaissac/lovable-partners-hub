import {createContext,useContext,useRef,useState,type MutableRefObject,type ReactNode} from 'react';
import {Button} from '@asset/ui';

type MakerDesign={tab:'canvas'|'layers';setTab:(tab:'canvas'|'layers')=>void;visible:boolean;setVisible:(visible:boolean)=>void;selected:string[];setSelected:(ids:string[])=>void;select:MutableRefObject<((ids:string[])=>void)|undefined>};
const Context=createContext<MakerDesign|null>(null);
export const useMakerDesign=()=>useContext(Context);
export function MakerDesignProvider({children}:{children:ReactNode}) {
 const [tab,setTab]=useState<'canvas'|'layers'>('canvas'),[visible,setVisible]=useState(true),[selected,setSelected]=useState<string[]>([]);
 const select=useRef<((ids:string[])=>void)|undefined>(undefined);
 return <Context.Provider value={{tab,setTab,visible,setVisible,selected,setSelected,select}}>{children}</Context.Provider>;
}
export function MakerDesignModes(){
 const maker=useMakerDesign();if(!maker)return null;
 return <div className="maker-design-modes hcs-ui" role="group" aria-label="Design view">{(['canvas','layers'] as const).map(mode=><Button key={mode} variant="ghost" aria-pressed={maker.tab===mode} onClick={()=>maker.setTab(mode)}>{mode==='canvas'?'Design':'Layers'}</Button>)}</div>;
}
