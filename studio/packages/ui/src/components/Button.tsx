import { Icon } from './Icon';
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type ButtonVariant = 'ghost' | 'neutral' | 'primary' | 'destructive';
export type ButtonSize = 'sm' | 'md';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  active?: boolean;
  /** Show a spinner in place of the leading icon and disable interaction. */
  loading?: boolean;
};

function hasTextChildren(children: ReactNode): boolean {
  if (children == null || children === false) return false;
  if (typeof children === 'string') return children.trim().length > 0;
  if (typeof children === 'number') return true;
  if (Array.isArray(children)) {
    return children.some(
      (c) => typeof c === 'string' ? c.trim().length > 0 : typeof c === 'number',
    );
  }
  return false;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'neutral',
    size = 'md',
    leadingIcon,
    trailingIcon,
    active,
    loading,
    disabled,
    className,
    type = 'button',
    children,
    onClick,
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const hasText = hasTextChildren(children);
  const hasContent =
    hasText || Boolean(leadingIcon) || Boolean(trailingIcon) || (children != null && children !== false);
  const isIconOnly = hasContent && !hasText;
  return (
    <button
      ref={ref}
      type={type}
      data-variant={variant}
      data-size={size}
      data-active={active ? '' : undefined}
      data-disabled={isDisabled ? '' : undefined}
      data-loading={loading ? '' : undefined}
      data-icon-only={isIconOnly ? '' : undefined}
      aria-busy={loading || undefined}
      disabled={isDisabled}
      onClick={loading ? undefined : onClick}
      className={cn('ui-reset', 'ui-btn', className)}
      {...props}
    >
      {loading ? (
        <span className="ui-btn-icon ui-btn-spinner" aria-hidden>
          <Icon name="loader-circle" size={16} />
        </span>
      ) : (
        leadingIcon && <span className="ui-btn-icon">{leadingIcon}</span>
      )}
      {children !== undefined && (
        <span className={isIconOnly && !leadingIcon && !trailingIcon ? 'ui-btn-icon' : undefined}>
          {children}
        </span>
      )}
      {trailingIcon && <span className="ui-btn-icon">{trailingIcon}</span>}
    </button>
  );
});

export type ButtonGroupProps = HTMLAttributes<HTMLDivElement>;

/** Visually connects a row of <Button>s — collapses inter-button gap and
 *  flattens facing radii so the group reads as one CTA cluster. */
export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  function ButtonGroup({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        role="group"
        className={cn('ui-btn-group', className)}
        {...props}
      />
    );
  },
);
