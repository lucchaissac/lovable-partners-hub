import type { HtmlEditorState } from './htmlEditorModel';
import { createContext } from 'react';
import { type WorkspaceDesign, type WorkspaceEdit, type WorkspaceImageEdit, type WorkspaceBlockEdit, type WorkspaceMove } from './workspaceEditing';
import './workspace-editing.css';
import type { WorkspaceWidgetEdit } from './workspaceWidgets';


export const WorkspaceEditingContext = createContext<{
  manual?: HtmlEditorState; layout?: WorkspaceMove[]; blocks?: Record<string, WorkspaceBlockEdit>; widgets?: Record<string, WorkspaceWidgetEdit>; design?: WorkspaceDesign; images?: Record<string, WorkspaceImageEdit>; ramp?: boolean; navigation?: 'pages' | 'edition';
  onEdit?: (command: WorkspaceEdit) => void;
  openLink?: (url: string) => void;
}>({});
