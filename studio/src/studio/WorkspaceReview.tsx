import {createContext} from 'react';
import type {WorkspaceVisual} from './workspaceWidgets';
export const WorkspaceSelectionContext=createContext<{visual?:WorkspaceVisual;setVisual:(value?:WorkspaceVisual)=>void}>({setVisual:()=>{}});
