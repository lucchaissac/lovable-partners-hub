import { useEffect, useState } from 'react';
import { Tooltip } from '@asset/ui';

export function commentTimeLabel(value: string, now = Date.now()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const minutes = Math.max(0, Math.floor((now - date.getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(date.getFullYear() !== new Date(now).getFullYear() ? { year: 'numeric' } as const : {}) });
}

export function CommentTime({ value }: { value: string }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(id); }, []);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const full = date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  return <Tooltip label={full}><time dateTime={value} aria-label={full}>{commentTimeLabel(value, now)}</time></Tooltip>;
}
