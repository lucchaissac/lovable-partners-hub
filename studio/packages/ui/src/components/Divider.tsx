import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type DividerProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical';
};

export const Divider = forwardRef<HTMLDivElement, DividerProps>(function Divider(
  { orientation = 'horizontal', className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      aria-hidden
      data-orientation={orientation}
      className={cn('ui-divider', className)}
      {...props}
    />
  );
});
