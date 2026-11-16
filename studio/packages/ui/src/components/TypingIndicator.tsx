import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type TypingIndicatorProps = HTMLAttributes<HTMLDivElement> & {
  label?: string;
};

export function TypingIndicator({ label, className, ...props }: TypingIndicatorProps) {
  return (
    <div
      className={cn('ui-typing', className)}
      role="status"
      aria-live="polite"
      {...props}
    >
      <span className="ui-typing-dots" aria-hidden>
        <span /><span /><span />
      </span>
      {label && <span className="ui-typing-label">{label}</span>}
    </div>
  );
}
