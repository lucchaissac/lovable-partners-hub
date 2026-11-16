import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';
import { cn } from '../lib/cn';

export type MessageActionsProps = {
  text: string;
  timestamp?: string;
  author?: { name: string; mine?: boolean };
  copyLabel?: string;
  className?: string;
  children?: ReactNode;
};

/** Use in Message.footer so revealing the actions never shifts the conversation. */
export function MessageActions({ text, timestamp, author, copyLabel = 'Copy message', className, children }: MessageActionsProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const date = timestamp ? new Date(timestamp) : null;
  const validDate = date && Number.isFinite(date.getTime()) ? date : null;
  const authorLabel = author ? `${author.name}${author.mine ? ' (you)' : ''}` : '';
  return <div className={cn('ui-msg-actions', className)} role="group" aria-label="Message actions">
    {validDate && <Tooltip label={validDate.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}>
      <time className="ui-msg-actions-time" dateTime={validDate.toISOString()} tabIndex={0}>{validDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</time>
    </Tooltip>}
    <Tooltip label={copyStatus === 'copied' ? 'Copied' : copyStatus === 'failed' ? 'Could not copy' : copyLabel}>
      <Button variant="ghost" size="sm" aria-label={copyLabel} leadingIcon={<Icon name={copyStatus === 'copied' ? 'check' : 'copy'} size={12} />} onClick={async () => {
        try { await navigator.clipboard.writeText(text); setCopyStatus('copied'); } catch { setCopyStatus('failed'); }
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopyStatus('idle'), 2000);
      }} />
    </Tooltip>
    {children}
    {author && <Tooltip label={authorLabel}><Button variant="ghost" size="sm" aria-label={`Message by ${authorLabel}`} leadingIcon={<Icon name="circle-user" size={12} />} /></Tooltip>}
    <span className="ui-msg-actions-status" role="status">{copyStatus === 'copied' ? 'Message copied' : copyStatus === 'failed' ? 'Could not copy message' : ''}</span>
  </div>;
}
