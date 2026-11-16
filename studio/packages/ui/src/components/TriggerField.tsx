import { Icon } from './Icon';
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type TriggerFieldSize = 'sm' | 'md';

export type TriggerFieldProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> & {
  size?: TriggerFieldSize;
  /** Leading icon, mirrors the input leading-icon affordance. */
  leadingIcon?: ReactNode;
  /**
   * Custom trailing affordance. Defaults to a chevron-down — matches every
   * other dropdown trigger in the system.
   */
  trailingIcon?: ReactNode;
  /** Render the value in muted color when no value is set. */
  placeholder?: boolean;
  /** Use the focus halo (when the dropdown menu is open). */
  active?: boolean;
  invalid?: boolean;
};

const ChevronDown = (
  <Icon name="chevron-down" size="100%" />
);

/**
 * Input-styled button used as a form-grade dropdown trigger. Matches the
 * height, border, radius, and focus halo of <Input> so a TriggerField and
 * an Input can sit on the same form row without visual jitter.
 */
export const TriggerField = forwardRef<HTMLButtonElement, TriggerFieldProps>(function TriggerField(
  {
    size = 'md',
    leadingIcon,
    trailingIcon,
    placeholder,
    active,
    invalid,
    disabled,
    className,
    type = 'button',
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-size={size}
      data-active={active ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-invalid={invalid ? '' : undefined}
      disabled={disabled}
      className={cn('ui-trigger-field', className)}
      {...props}
    >
      {leadingIcon && <span className="ui-trigger-field-icon">{leadingIcon}</span>}
      <span className="ui-trigger-field-value" data-placeholder={placeholder ? '' : undefined}>
        {children}
      </span>
      <span className="ui-trigger-field-caret">{trailingIcon ?? ChevronDown}</span>
    </button>
  );
});
