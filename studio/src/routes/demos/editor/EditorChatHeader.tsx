import type { ReactNode } from 'react';
import { Button, Icon, Tooltip } from '@asset/ui';
import './editor-chat-history.css';

/** Shared by the workspace editor and the live workspace-building prototype. */
export function EditorChatHeader({ historyOpen, title, busy, showNewChat = historyOpen, showHistory = true, onHistory, onNewChat, onCollapse }: {
  historyOpen: boolean; title: ReactNode; busy: boolean; showNewChat?: boolean; showHistory?: boolean;
  onHistory: () => void; onNewChat: () => void; onCollapse: () => void;
}) {
  return <div className="we-panel-header we-chat-header">
    <div className="we-chat-header-leading">
      {showHistory && <Tooltip label={historyOpen ? 'Back to chat' : 'Chat history'}><Button className="we-chat-toggle" variant="ghost" aria-label={historyOpen ? 'Back to chat' : 'Chat history'} aria-expanded={historyOpen}
        aria-controls="we-chat-history" onClick={onHistory} leadingIcon={<Icon name={historyOpen ? 'arrow-left' : 'list'} size={16} />} /></Tooltip>}
      {historyOpen ? <strong>Chats</strong> : title}
    </div>
    <div className="we-chat-header-actions">
      {showNewChat && <Tooltip label="New chat"><Button className="we-chat-toggle" variant="ghost" aria-label="New chat" disabled={busy}
        leadingIcon={<Icon name="square-pen" size={16} />} onClick={onNewChat} /></Tooltip>}
      <Tooltip label="Collapse chat" side="bottom"><Button className="we-chat-toggle" variant="ghost" aria-label="Collapse chat" aria-expanded={true} aria-controls="we-chat-composer" onClick={onCollapse} leadingIcon={<Icon name="panel-left-close" size={16} />} /></Tooltip>
    </div>
  </div>;
}
