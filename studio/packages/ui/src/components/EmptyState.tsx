import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type EmptyStateSize = 'sm' | 'md';

export type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  /** Icon or illustration shown above the title. */
  icon?: ReactNode;
  /** Larger artwork, at its natural size. Replaces the fixed-size icon slot. */
  illustration?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Primary CTA. Pass a Button or any node. */
  action?: ReactNode;
  /** Secondary action (e.g. a "Learn more" link). */
  secondaryAction?: ReactNode;
  size?: EmptyStateSize;
};

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { icon, illustration, title, description, action, secondaryAction, size = 'md', className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-size={size}
      className={cn('ui-empty-state', className)}
      {...props}
    >
      {illustration ? <div className="ui-empty-state-illustration">{illustration}</div> : icon && <div className="ui-empty-state-icon">{icon}</div>}
      <div className="ui-empty-state-title">{title}</div>
      {description && <div className="ui-empty-state-description">{description}</div>}
      {(action || secondaryAction) && (
        <div className="ui-empty-state-actions">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
});
