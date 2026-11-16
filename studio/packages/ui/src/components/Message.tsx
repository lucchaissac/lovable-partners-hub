import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  role: MessageRole;
  avatar?: ReactNode;
  author?: ReactNode;
  timestamp?: ReactNode;
  /** Actions below the bubble, with space reserved while hidden until hover or focus. */
  footer?: ReactNode;
};

export function Message({
  role,
  avatar,
  author,
  timestamp,
  footer,
  className,
  children,
  ...props
}: MessageProps) {
  return (
    <div className={cn('ui-msg', className)} data-role={role} {...props}>
      {avatar && <div className="ui-msg-avatar">{avatar}</div>}
      <div className="ui-msg-main">
        {(author || timestamp) && (
          <div className="ui-msg-meta">
            {author && <span className="ui-msg-author">{author}</span>}
            {timestamp && <span className="ui-msg-timestamp">{timestamp}</span>}
          </div>
        )}
        <div className="ui-msg-bubble">{children}</div>
        {footer && <div className="ui-msg-footer">{footer}</div>}
      </div>
    </div>
  );
}
