import type {HtmlBlock} from './htmlEditorModel';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, Tooltip } from '@asset/ui';
import { HtmlSelectionMode } from './HtmlSelectionMode';
import { WidgetInsertMenu } from '../protos/widget-dropdown';
import { useWorkspaceWidgetHost } from './WorkspaceWidgetHost';
import { HtmlWidgetInsertPanel, HtmlWidgetInsertPopover } from './HtmlWidgetInsertPanel';

export const htmlInsertOptions = ['Section', 'Text', 'Image', 'PDF', 'File', 'Link', 'Video', 'Embed', 'iFrame', 'Toggle list', 'Code block', 'Divider', 'Contact cards', 'Checklist', 'Project plan', 'Timeline', 'Sales quote', 'Library list', 'Table', 'Forms', 'CTA', 'Synced section'] as const;
type InsertHandler = (label: string | HtmlBlock) => void;
const InsertContext = createContext<{ current?: InsertHandler }>({});
export const HTML_INSERT_PANEL_ID = 'html-insert-widgets';
const InsertPanelContext = createContext({ enabled: false, open: false, show: (_onSelect?: InsertHandler) => {}, close: () => {}, showAt: (_anchor:HTMLElement,_onSelect:InsertHandler) => {} });
export const useHtmlInsertPanel = () => useContext(InsertPanelContext);

export function HtmlEditorInsertProvider({ children, panel = false }: { children: ReactNode; panel?: boolean }) {
  const [popover,setPopover]=useState<{anchor:HTMLElement;onSelect:InsertHandler}>();
  const handler = useRef<InsertHandler | undefined>(undefined);
  const target = useRef<InsertHandler | undefined>(undefined);
  const returnFocus = useRef<HTMLElement | null>(null);
  const host = useWorkspaceWidgetHost();
  const open = panel && host.activeId === HTML_INSERT_PANEL_ID;
  const close = () => {
    host.panelChanged(HTML_INSERT_PANEL_ID, false);
    returnFocus.current?.focus({ preventScroll: true });
  };
  const show = (onSelect?: InsertHandler) => {
    setPopover(undefined);
    target.current = onSelect;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    host.panelChanged(HTML_INSERT_PANEL_ID, true);
  };
  return <InsertContext.Provider value={handler}><InsertPanelContext.Provider value={{ enabled: panel, open, show, close, showAt:(anchor,onSelect)=>setPopover(current=>current?.anchor===anchor?undefined:{anchor,onSelect}) }}>
    {children}
    {popover&&<HtmlWidgetInsertPopover key={popover.anchor.getAttribute('aria-label')} anchor={popover.anchor} available={htmlInsertOptions} onClose={()=>{setPopover(undefined);if(popover.anchor.isConnected)popover.anchor.focus({preventScroll:true});}} onSelect={label=>{setPopover(undefined);popover.onSelect(label);}}/>}
    {open && host.panelHost && createPortal(<HtmlWidgetInsertPanel available={htmlInsertOptions} onClose={close} onSelect={label => {
      const insert = target.current || handler.current;
      close();
      insert?.(label);
    }} />, host.panelHost)}
  </InsertPanelContext.Provider></InsertContext.Provider>;
}
export const useHtmlEditorInsert = () => useContext(InsertContext);

export function HtmlEditorInsertToolbar() {
  const handler = useHtmlEditorInsert(), [open, setOpen] = useState(false), presentation = useContext(HtmlSelectionMode);
  const panel = useHtmlInsertPanel();
  if (panel.enabled) return <Tooltip label="Insert widget" side="bottom"><Button variant="ghost" aria-label="Insert widget" aria-expanded={panel.open} aria-controls={HTML_INSERT_PANEL_ID} active={panel.open} leadingIcon={<Icon name="blocks" size={16} />} onClick={() => panel.open ? panel.close() : panel.show()} /></Tooltip>;
  return <WidgetInsertMenu open={open} onOpenChange={setOpen} side={presentation?"bottom":"top"} align="center" available={htmlInsertOptions}
    onSelect={label => handler.current?.(label)}
    trigger={<Button variant="ghost" size={presentation?undefined:"sm"} aria-label="Insert widget" aria-expanded={open}><Tooltip label="Insert widget" side={presentation?"bottom":"top"}><Icon name={presentation?"blocks":"component"} size={presentation?16:20} /></Tooltip></Button>} />;
}
