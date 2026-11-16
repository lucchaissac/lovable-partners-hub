import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type ToolbarProps = HTMLAttributes<HTMLDivElement> & {
  /** Content aligned to the left (typically search, filters). */
  leading?: ReactNode;
  /** Content aligned to the right (typically actions: Export, Edit columns). */
  trailing?: ReactNode;
  /** Adds a bottom border. Useful when stacked above a Table. */
  divided?: boolean;
};

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(function Toolbar(
  { leading, trailing, divided, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-divided={divided ? '' : undefined}
      className={cn('ui-toolbar', className)}
      {...props}
    >
      {leading !== undefined ? <div className="ui-toolbar-leading">{leading}</div> : null}
      {children !== undefined ? <div className="ui-toolbar-center">{children}</div> : null}
      {trailing !== undefined ? <div className="ui-toolbar-trailing">{trailing}</div> : null}
    </div>
  );
});
