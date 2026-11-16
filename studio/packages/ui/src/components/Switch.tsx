import { forwardRef, useCallback, useState } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type SwitchSize = 'xs' | 'sm' | 'md';

export type SwitchProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'children' | 'type'
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: SwitchSize;
};

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    checked,
    defaultChecked = false,
    onChange,
    size = 'md',
    disabled,
    className,
    onClick,
    ...props
  },
  ref,
) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = useState(defaultChecked);
  const value = isControlled ? checked : internal;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (e.defaultPrevented || disabled) return;
      const next = !value;
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [onClick, disabled, value, isControlled, onChange],
  );

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={value}
      data-size={size}
      data-state={value ? 'on' : 'off'}
      data-disabled={disabled ? '' : undefined}
      disabled={disabled}
      onClick={handleClick}
      className={cn('ui-reset', 'ui-switch', className)}
      {...props}
    >
      <span className="ui-switch-thumb" />
    </button>
  );
});
