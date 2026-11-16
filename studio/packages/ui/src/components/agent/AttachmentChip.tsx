import { Icon } from '../Icon';
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type AttachmentChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  name: string;
  /** Leading glyph (e.g., file-type icon). Defaults to a generic file. */
  icon?: ReactNode;
};

const DEFAULT_ICON = (
  <Icon name="file" size={14} />
);

export const AttachmentChip = forwardRef<HTMLButtonElement, AttachmentChipProps>(
  function AttachmentChip(
    { name, icon, className, type = 'button', ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn('ui-attachment-chip', className)}
        {...props}
      >
        <span className="ui-attachment-chip-icon" aria-hidden>
          {icon ?? DEFAULT_ICON}
        </span>
        <span className="ui-attachment-chip-name">{name}</span>
      </button>
    );
  },
);
