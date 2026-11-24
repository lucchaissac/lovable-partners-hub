import {createContext,useContext,useRef,useState,type Dispatch,type SetStateAction,type MutableRefObject,type ReactNode} from 'react';
import {Button} from '@asset/ui';
import {usePreviewAccess} from './usePreviewAccess';

type LayerSelectionRequest={assetId:string;ids:string[]};
type MakerDesign={canInsert:boolean;beginInsert:MutableRefObject<(()=>boolean)|undefined>;hovered:LayerSelectionRequest|undefined;setHovered:Dispatch<SetStateAction<LayerSelectionRequest|undefined>>;tab:'canvas'|'layers';setTab:(tab:'canvas'|'layers')=>void;visible:boolean;setVisible:(visible:boolean)=>void;selected:string[];setSelected:(ids:string[])=>void;select:MutableRefObject<((ids:string[])=>void)|undefined>;nudge:MutableRefObject<((x:number,y:number)=>void)|undefined>;selectionRequest:LayerSelectionRequest|undefined;setSelectionRequest:Dispatch<SetStateAction<LayerSelectionRequest|undefined>>};
const Context=createContext<MakerDesign|null>(null);
export const useMakerDesign=()=>useContext(Context);
export function MakerDesignProvider({children}:{children:ReactNode}) {
 const {canInsert}=usePreviewAccess();
 const [tab,setTab]=useState<'canvas'|'layers'>('canvas'),[visible,setVisible]=useState(true),[selected,setSelected]=useState<string[]>([]);
 const beginInsert=useRef<(()=>boolean)|undefined>(undefined);
 const [hovered,setHovered]=useState<LayerSelectionRequest>();
 const select=useRef<((ids:string[])=>void)|undefined>(undefined);
 const nudge=useRef<((x:number,y:number)=>void)|undefined>(undefined),[selectionRequest,setSelectionRequest]=useState<LayerSelectionRequest>();
 return <Context.Provider value={{canInsert,beginInsert,hovered,setHovered,tab,setTab,visible,setVisible,selected,setSelected,select,nudge,selectionRequest,setSelectionRequest}}>{children}</Context.Provider>;
}
export function MakerDesignModes(){
 const maker=useMakerDesign();if(!maker)return null;
 return <div className="maker-design-modes hcs-ui" role="group" aria-label="Design view">{(['canvas','layers'] as const).map(mode=><Button key={mode} variant="ghost" aria-pressed={maker.tab===mode} onClick={()=>maker.setTab(mode)}>{mode==='canvas'?'Design':'Layers'}</Button>)}</div>;
}
