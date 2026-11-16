import { useState } from 'react';
import { Button, Icon, MessageActions, Tooltip } from '@asset/ui';

export function EditorChatActions({ text, onRestore, restoreDisabled, currentVersion }: { text: string; onRestore?: () => void; restoreDisabled?: boolean; currentVersion?: boolean }) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  if (!text) return null;
  return <MessageActions className="we-chat-feedback" text={text} copyLabel="Copy response">
    <Tooltip label="Good response"><Button variant="ghost" size="sm" aria-label="Good response" aria-pressed={feedback === 'up'} active={feedback === 'up'}
      leadingIcon={<Icon name="thumbs-up" size={12} />} onClick={() => setFeedback(value => value === 'up' ? null : 'up')} /></Tooltip>
    <Tooltip label="Bad response"><Button variant="ghost" size="sm" aria-label="Bad response" aria-pressed={feedback === 'down'} active={feedback === 'down'}
      leadingIcon={<Icon name="thumbs-down" size={12} />} onClick={() => setFeedback(value => value === 'down' ? null : 'down')} /></Tooltip>
    {currentVersion ? <span className="studio-current-version"><Icon name="check" size={12} />Current version</span> : onRestore && <Tooltip label="Restore this version"><Button variant="ghost" size="sm" aria-label="Restore this version" disabled={restoreDisabled} leadingIcon={<Icon name="history" size={12} />} onClick={onRestore} /></Tooltip>}
  </MessageActions>;
}
