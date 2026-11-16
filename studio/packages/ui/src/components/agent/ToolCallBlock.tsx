import { Icon } from '../Icon';
import { useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type ToolCallBlockProps = HTMLAttributes<HTMLDivElement> & {
  tool: string;
  status?: 'pending' | 'success' | 'error';
  summary?: ReactNode;
  defaultOpen?: boolean;
};

export function ToolCallBlock({
  tool,
  status = 'success',
  summary,
  defaultOpen = false,
  className,
  children,
  ...props
}: ToolCallBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasBody = !!children;
  return (
    <div
      className={cn('ui-agent-block ui-tool-block', className)}
      data-status={status}
      data-open={open ? 'true' : 'false'}
      {...props}
    >
      <button
        type="button"
        className="ui-tool-block-head"
        onClick={() => hasBody && setOpen((v) => !v)}
        aria-expanded={hasBody ? open : undefined}
        data-no-body={hasBody ? undefined : ''}
      >
        <span className="ui-tool-block-status" data-status={status} aria-hidden />
        <span className="ui-tool-block-name">{tool}</span>
        {summary && <span className="ui-tool-block-summary">{summary}</span>}
        {hasBody && (
          <span className="ui-tool-block-chevron" data-open={open ? '' : undefined} aria-hidden>
            <Icon name="chevron-right" size={10} />
          </span>
        )}
      </button>
      {open && hasBody && <div className="ui-tool-block-body">{children}</div>}
    </div>
  );
}
