import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type BadgeTone =
  | 'muted'
  | 'neutral'
  | 'accent'
  | 'purple'
  | 'dark'
  | 'success'
  | 'warning'
  | 'destructive';
export type BadgeVariant = 'soft' | 'outline' | 'solid';
export type BadgeSize = 'sm' | 'md' | 'lg';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  {
    tone = 'muted',
    variant = 'soft',
    size = 'md',
    leadingIcon,
    trailingIcon,
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <span
      ref={ref}
      data-tone={tone}
      data-variant={variant}
      data-size={size}
      className={cn('ui-badge', className)}
      {...props}
    >
      {leadingIcon && <span className="ui-badge-icon">{leadingIcon}</span>}
      {children !== undefined && <span className="ui-badge-label">{children}</span>}
      {trailingIcon && <span className="ui-badge-icon">{trailingIcon}</span>}
    </span>
  );
});
