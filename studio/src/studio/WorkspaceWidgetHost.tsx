import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from 'react';

const CLOSED_PANEL = '__closed__';
type WidgetHost = {
  panelHost: HTMLDivElement | null;
  setPanelHost: (host: HTMLDivElement | null) => void;
  activeId?: string;
  panelOpen: boolean;
  closePanel: () => void;
  panelChanged: (id: string, open: boolean) => void;
};
export const WorkspaceWidgetHostContext = createContext<WidgetHost>({ panelHost: null, setPanelHost: () => {}, panelOpen: false, closePanel: () => {}, panelChanged: () => {} });

/** Widgets keep their local editor state; the workspace shell owns the shared sidebar. */
export function WorkspaceWidgetHost({ children }: { children: ReactNode }) {
  const [panelHost, setPanelHost] = useState<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string>();
  const closePanel = useCallback(() => setActiveId(CLOSED_PANEL), []);
  useEffect(() => {
    window.addEventListener('workspace-page-change', closePanel);
    return () => window.removeEventListener('workspace-page-change', closePanel);
  }, [closePanel]);
  const panelChanged = useCallback((id: string, open: boolean) => setActiveId(current => open ? id : current === id ? CLOSED_PANEL : current), []);
  const panelOpen = !!activeId && activeId !== CLOSED_PANEL;
  return <WorkspaceWidgetHostContext.Provider value={{ panelHost, setPanelHost, activeId, panelOpen, closePanel, panelChanged }}>{children}</WorkspaceWidgetHostContext.Provider>;
}

/** Stays mounted when Threads opens so portal targets never move into the canvas. */
export function WorkspaceInspector({disabled=false}:{disabled?:boolean}) {
  const { setPanelHost, panelOpen } = useWorkspaceWidgetHost();
  return <div ref={setPanelHost} inert={disabled||undefined} aria-disabled={disabled||undefined} className="workspace-widget-panelhost workspace-widget-panelhost--external" data-open={panelOpen || undefined} />;
}
export const useWorkspaceWidgetHost = () => useContext(WorkspaceWidgetHostContext);
