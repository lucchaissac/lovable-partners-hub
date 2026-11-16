import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
} from 'react';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from 'react';
import { cn } from '../lib/cn';

// ============================================================
// RadioGroup
// ============================================================

type RadioGroupCtx = {
  value: string | undefined;
  setValue: (v: string) => void;
  name: string;
  registerRef: (value: string, el: HTMLButtonElement | null) => void;
  focusNext: (from: string, dir: 1 | -1) => void;
};

const RadioGroupContext = createContext<RadioGroupCtx | null>(null);

export type RadioGroupProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Shared name for native form submission. Auto-generated if omitted. */
  name?: string;
  direction?: 'vertical' | 'horizontal';
};

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
  {
    value,
    defaultValue,
    onChange,
    name,
    direction = 'vertical',
    className,
    children,
    ...props
  },
  ref,
) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const current = isControlled ? value : internal;
  const autoName = useId();
  const refs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const order = useRef<string[]>([]);

  const registerRef = useCallback((v: string, el: HTMLButtonElement | null) => {
    if (el) {
      refs.current.set(v, el);
      if (!order.current.includes(v)) order.current.push(v);
    } else {
      refs.current.delete(v);
      order.current = order.current.filter((x) => x !== v);
    }
  }, []);

  const setValue = useCallback(
    (v: string) => {
      if (!isControlled) setInternal(v);
      onChange?.(v);
    },
    [isControlled, onChange],
  );

  const focusNext = useCallback(
    (from: string, dir: 1 | -1) => {
      const items = order.current;
      if (items.length === 0) return;
      const i = items.indexOf(from);
      const next = items[(i + dir + items.length) % items.length];
      const el = refs.current.get(next);
      el?.focus();
      setValue(next);
    },
    [setValue],
  );

  return (
    <RadioGroupContext.Provider
      value={{ value: current, setValue, name: name ?? autoName, registerRef, focusNext }}
    >
      <div
        ref={ref}
        role="radiogroup"
        data-direction={direction}
        className={cn('ui-radio-group', className)}
        {...props}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
});

// ============================================================
// Radio
// ============================================================

export type RadioProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'value' | 'children' | 'type' | 'role'
> & {
  value: string;
  /** Optional rich content next to the indicator. Plain string also works. */
  children?: ReactNode;
};

export const Radio = forwardRef<HTMLButtonElement, RadioProps>(function Radio(
  { value, disabled, className, children, onKeyDown, ...props },
  ref,
) {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) {
    throw new Error('<Radio> must be rendered inside a <RadioGroup>.');
  }
  const checked = ctx.value === value;

  const handleRef = (el: HTMLButtonElement | null) => {
    ctx.registerRef(value, el);
    if (typeof ref === 'function') ref(el);
    else if (ref) (ref as { current: HTMLButtonElement | null }).current = el;
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      ctx.focusNext(value, 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      ctx.focusNext(value, -1);
    }
  };

  return (
    <label
      className="ui-radio-label"
      data-disabled={disabled ? '' : undefined}
    >
      <button
        ref={handleRef}
        type="button"
        role="radio"
        aria-checked={checked}
        name={ctx.name}
        value={value}
        disabled={disabled}
        tabIndex={checked || ctx.value === undefined ? 0 : -1}
        data-state={checked ? 'on' : 'off'}
        data-shape="round"
        onClick={() => !disabled && ctx.setValue(value)}
        onKeyDown={handleKeyDown}
        className={cn('ui-checkbox', 'ui-radio', className)}
        {...props}
      >
        {checked && (
          <svg width="6" height="6" viewBox="0 0 6 6" fill="none" aria-hidden>
            <circle cx="3" cy="3" r="3" fill="white" />
          </svg>
        )}
      </button>
      {children !== undefined && <span className="ui-radio-text">{children}</span>}
    </label>
  );
});
