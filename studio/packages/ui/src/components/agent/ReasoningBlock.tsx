import { Icon } from '../Icon';
import { useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type ReasoningBlockStatus = 'idle' | 'running' | 'done';

export type ReasoningBlockProps = HTMLAttributes<HTMLDivElement> & {
  /** Defaults to "Reasoning". */
  label?: ReactNode;
  /** Leading icon. Defaults to sparkles; pass null for a text-only label. */
  icon?: ReactNode;
  /** 'running' adds a subtle pulse so the user knows AI is still working. */
  status?: ReasoningBlockStatus;
  defaultOpen?: boolean;
};

const DEFAULT_ICON = (
  <Icon name="sparkles" size={14} />
);

export function ReasoningBlock({
  label = 'Reasoning',
  icon,
  status = 'done',
  defaultOpen = false,
  className,
  children,
  ...props
}: ReasoningBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasBody = !!children;
  return (
    <div
      className={cn('ui-reasoning-block', className)}
      data-status={status}
      data-open={open ? 'true' : 'false'}
      {...props}
    >
      <button
        type="button"
        className="ui-reasoning-block-head"
        onClick={() => hasBody && setOpen((v) => !v)}
        aria-expanded={hasBody ? open : undefined}
        data-no-body={hasBody ? undefined : ''}
      >
        {icon !== null && <span className="ui-reasoning-block-icon" aria-hidden>
          {icon ?? DEFAULT_ICON}
        </span>}
        <span className="ui-reasoning-block-label">{label}</span>
        {hasBody && (
          <span
            className="ui-reasoning-block-chevron"
            aria-hidden
            data-open={open ? '' : undefined}
          />
        )}
      </button>
      {open && hasBody && (
        <div className="ui-reasoning-block-body">{children}</div>
      )}
    </div>
  );
}
