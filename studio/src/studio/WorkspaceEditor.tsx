import { WorkspaceAIEditButton } from './WorkspaceAIEditButton';
import { HtmlSelectionMode } from './HtmlSelectionMode';
import { type ReviewTool } from '../routes/demos/editor/SharedReviewTools';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Icon, Message, MessageActions, Tooltip } from '@asset/ui';
import { EditorSidebar } from '../routes/demos/editor/EditorSidebar';
import { EditorDesignChatStart } from '../routes/demos/editor/EditorDesignChatStart';
import { EditorChatHeader } from '../routes/demos/editor/EditorChatHeader';
import { EditorChatHistory } from '../routes/demos/editor/EditorChatHistory';
import { EditorChatTitle } from '../routes/demos/editor/EditorChatTitle';
import type { EditorChat } from '../routes/demos/editor/useEditorChats';
import type { WorkspaceChatCommand } from './workspaceChats';
import { EditorChatActions } from '../routes/demos/editor/EditorChatActions';
import { EditorChatUserText } from '../routes/demos/editor/EditorChatTranscript';
import { AssetChatBox } from '../components/AssetChatBox';
import type { StudioMessage } from './schema';
import { ChatMarkdown } from '../components/ChatMarkdown';
import { SourceReferences, useStudioSources } from './StudioSources';
import type { StudioSource } from './sources';
import type { HtmlGenerationProgress } from './htmlGenerationProgress';
import { WorkspaceSelectionContext } from './WorkspaceReview';
import { StudioSelectionChip } from './StudioSelectionChip';
import type { WorkspaceVisual } from './workspaceWidgets';


export type WorkspaceChatState = {
  enabled: boolean; messages: StudioMessage[]; userId?: string;
  chats: EditorChat[]; activeChatId: string; manageDisabled: boolean;
  working?: string; error?: string; retryable?: boolean;
  htmlProgress?: HtmlGenerationProgress;
  queued: { id: number; prompt: string }[];
};
export type WorkspaceAction = 'stop' | 'retry' | 'dismiss' | 'remove';
export type WorkspaceRuntime = {
  title: string; content: ReactNode; state?: WorkspaceChatState;
  send: (prompt: string, visual?: WorkspaceVisual, sources?: StudioSource[]) => void;
  action: (action: WorkspaceAction, id?: number) => void;
  chat: (command: WorkspaceChatCommand) => void;
};
const WorkspaceAIEditContext = createContext({
  active: false, available: false, tool: 'pointer' as ReviewTool,
  setActive: (_value: boolean) => {}, setAvailable: (_value: boolean) => {}, setTool: (_value: ReviewTool) => {},
});
export const WorkspaceRuntimeContext = createContext<WorkspaceRuntime | null>(null);

export function WorkspaceChat({ title = 'Lovable', placeholder = 'Ask Lovable to create or edit…', singleAsset = false, preserveSourceTransparency = false }: { title?: string; placeholder?: string; singleAsset?: boolean; preserveSourceTransparency?: boolean }) {
  const runtime = useContext(WorkspaceRuntimeContext);
  const selection = useContext(WorkspaceSelectionContext);
  const aiEdit = useContext(WorkspaceAIEditContext);
  const [open, setOpen] = useState(() => !singleAsset || window.innerWidth > 820);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [scrolled, setScrolled] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const state = runtime?.state;
  const presentation = useContext(HtmlSelectionMode);
  const [notice,setNotice] = useState('');
  const [agents,setAgents] = useState<Record<string,string|null>>({});
  const sourceInput = useStudioSources(!state?.enabled, setNotice, false, false, presentation, preserveSourceTransparency);
  const activeId = state?.activeChatId || 'workspace';
  const active = state?.chats.find(chat => chat.id === activeId);
  const prompt = drafts[activeId] || '';
  const setPrompt = (value: string) => setDrafts(previous => ({ ...previous, [activeId]: value }));
  const composer = useRef<HTMLDivElement>(null);
  const newChat = () => { sourceInput.clear(); setNotice(''); runtime?.chat({ type: 'new' }); setHistoryOpen(false); follow.current = true; requestAnimationFrame(() => composer.current?.querySelector('textarea')?.focus()); };
  useEffect(() => { follow.current = true; if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [activeId]);
  useEffect(() => { if (follow.current && log.current) log.current.scrollTop = log.current.scrollHeight; }, [state?.messages, state?.working, state?.error]);
  const send = () => { const text = prompt.trim() || (sourceInput.sources.length ? (singleAsset ? 'Refine the current asset using the attached reference. Preserve its essential content.' : 'Create editable page content from the attached reference. Preserve its facts and visual style.') : ''); if (state?.enabled && text && !sourceInput.reading) { runtime?.send(text, selection.visual, presentation ? sourceInput.sources : undefined); if(!presentation) selection.setVisual(undefined); sourceInput.clear(); setNotice(''); setPrompt(''); follow.current = true; } };
  useEffect(() => { sourceInput.clear(); setNotice(''); }, [activeId]);
  return <EditorSidebar className="we-chat studio-editor" label="Workspace chat" open={open} onCollapse={() => setOpen(false)} onExpand={() => setOpen(true)} rail={<>
    <div className="we-panel-header"><Tooltip label="Open chat" side="bottom"><Button className="we-chat-toggle" variant="ghost" aria-label="Open chat" leadingIcon={<Icon name="panel-left-open" size={16} />} onClick={() => setOpen(true)} /></Tooltip></div>
    {!singleAsset && <div className="we-chat-rail-actions"><Tooltip label="Chat history"><Button variant="ghost" aria-label="Chat history" leadingIcon={<Icon name="list" size={16} />} onClick={() => { setOpen(true); setHistoryOpen(true); }} /></Tooltip><Tooltip label="New chat"><Button variant="ghost" aria-label="New chat" disabled={state?.manageDisabled ?? true} leadingIcon={<Icon name="square-pen" size={16} />} onClick={() => { setOpen(true); newChat(); }} /></Tooltip></div>}
  </>}>
    <EditorChatHeader historyOpen={!singleAsset&&historyOpen} busy={state?.manageDisabled ?? true} showNewChat={!singleAsset} showHistory={!singleAsset}
      title={singleAsset ? <span>Chat</span> : active ? <EditorChatTitle chat={active} busy={state?.manageDisabled ?? true}
        onEdit={(id, patch) => runtime?.chat({ type: 'edit', id, patch })} onDelete={id => runtime?.chat({ type: 'delete', id })} onRestore={chat => runtime?.chat({ type: 'restore', id: chat.id })} /> : <strong>{title}</strong>}
      onHistory={() => setHistoryOpen(value => !value)} onNewChat={newChat} onCollapse={() => setOpen(false)} />
    {!singleAsset && historyOpen && <EditorChatHistory chats={state?.chats || []} activeId={activeId} busy={state?.manageDisabled ?? true}
      onSelect={id => { runtime?.chat({ type: 'select', id }); setHistoryOpen(false); }} onEdit={(id, patch) => runtime?.chat({ type: 'edit', id, patch })} />}
    <div className="we-chat-conversation" {...(presentation ? sourceInput.events : {})} data-source-drag={presentation && sourceInput.dragging || undefined} hidden={!singleAsset&&historyOpen} data-scrolled={scrolled ? '' : undefined}>
      {presentation && sourceInput.dragging && <div className="hcs-chat-drop" role="status"><Icon name="upload" size={20}/>Drop a document or image</div>}<div ref={log} className="we-chat-messages" role="log" aria-label="Workspace conversation" data-empty={!state?.messages.length && !state?.working ? '' : undefined} onScroll={event => { const el = event.currentTarget; setScrolled(el.scrollTop > 0); follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
        {state?.messages.filter(message => !message.hiddenInChat).map((message, index) => <div className="we-chat-turn" key={message.id || index}><Message role={message.user ? 'user' : 'assistant'} footer={message.user ? <MessageActions text={message.text} timestamp={message.createdAt} author={{ name: message.author?.name || 'Author not recorded', mine: message.author?.id === state.userId }} /> : <EditorChatActions text={message.text} />}>
          {message.user ? <><SourceReferences sources={message.sources} presentation={presentation} text={message.text} /><EditorChatUserText text={message.text} /></> : <ChatMarkdown text={message.text} preserveLineBreaks links />}
        </Message></div>)}
        {state?.working && <p className="studio-working" role="status">{state.working}</p>}
        {state?.error && <div className="studio-chat-error we-chat-turn"><Message role="assistant"><p role="alert">{state.error}</p><div className="studio-chat-error-actions">{state.retryable && <Button variant="ghost" size="sm" onClick={() => runtime?.action('retry')}>Retry</Button>}<Button variant="ghost" size="sm" onClick={() => runtime?.action('dismiss')}>Dismiss</Button></div></Message></div>}
      </div>
      <div ref={composer} className="we-chat-composer" id="we-chat-composer"><div className="studio-source-composer" data-queued={state?.queued.length ? '' : undefined}>
        {!!state?.queued.length && <div className="studio-request-queue" aria-label="Queued workspace requests"><div className="studio-request-queue-heading">{state.queued.length} {state.queued.length === 1 ? 'request queued' : 'requests queued'}</div>{state.queued.map(item => <div className="studio-request-queue-item" key={item.id}><Tooltip label={item.prompt} onlyWhenTruncated side="top"><span tabIndex={0}>{item.prompt}</span></Tooltip><Button variant="ghost" size="sm" className="studio-request-queue-remove" aria-label={`Remove queued request: ${item.prompt}`} leadingIcon={<Icon name="x" size={14} />} onClick={() => runtime?.action('remove', item.id)} /></div>)}</div>}
        {presentation && notice && <p className="hcs-chat-notice" role="status">{notice}</p>}<AssetChatBox leading={singleAsset ? sourceInput.trigger : undefined} sourceTrigger={presentation ? sourceInput.trigger : undefined} afterSource={presentation && aiEdit.available ? <WorkspaceAIEditButton active={aiEdit.active} onChange={active=>{aiEdit.setActive(active);aiEdit.setTool(active?'pointer':'none');}}/> : undefined} attachments={presentation ? sourceInput.attachments : undefined} activeAgent={agents[activeId] || null} onActiveAgentChange={id=>setAgents(previous=>({...previous,[activeId]:id}))} context={selection.visual?.label && <StudioSelectionChip label={selection.visual.label || 'Selected area'} onRemove={() => selection.setVisual(undefined)} />} mentions={false} value={prompt} onChange={value => setPrompt(value.slice(0, 4000))} onSend={send} onStop={() => runtime?.action('stop')} pending={!!state?.working && !prompt.trim() && !sourceInput.sources.length} disabled={!state?.enabled || sourceInput.reading} placeholder={presentation && !singleAsset ? 'Ask Lovable to create or edit pages' : placeholder} sendLabel={state?.working ? 'Add to queue' : 'Send'} />
      </div></div>
    </div>
    {presentation && sourceInput.dialogs}
  </EditorSidebar>;
}
