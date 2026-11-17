import { Icon } from './Icon';
import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import {useNumberScrub} from './numberScrub';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputTone = 'default' | 'ai';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  inputSize?: InputSize;
  /** Visual tint. `ai` adds a soft purple border + halo for AI / prompt fields. */
  tone?: InputTone;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    inputSize = 'md',
    tone = 'default',
    leadingIcon,
    trailingIcon,
    invalid,
    disabled,
    className,
    ...props
  },
  ref,
) {
  const scrub=useNumberScrub();
  return (
    <span
      onPointerDown={scrub}
      className={cn('ui-input', className)}
      data-size={inputSize}
      data-tone={tone === 'ai' ? 'ai' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-invalid={invalid ? '' : undefined}
    >
      {leadingIcon && <span className="ui-input-icon">{leadingIcon}</span>}
      <input
        ref={ref}
        disabled={disabled}
        className="ui-input-field"
        {...props}
      />
      {trailingIcon && <span className="ui-input-icon">{trailingIcon}</span>}
    </span>
  );
});

export type SearchInputVariant = 'default' | 'embedded';

export type SearchInputProps = Omit<InputProps, 'leadingIcon' | 'type'> & {
  /** Visual treatment.
   *  - `default` (default): full input chrome — border, radius, hover/focus halo.
   *  - `embedded`: chromeless, intended for the top of dropdowns / pickers / panels.
   *    Strips border + radius, adds a subtle bottom divider, and uses calmer
   *    body typography + breathing room around the search icon. */
  variant?: SearchInputVariant;
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { placeholder = 'Search', variant = 'default', className, ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      type="search"
      placeholder={placeholder}
      className={cn('ui-search', variant === 'embedded' && 'ui-input--embedded', className)}
      leadingIcon={
        <Icon name="search" size={14} />
      }
      {...props}
    />
  );
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
  autoResize?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, disabled, className, rows = 3, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      disabled={disabled}
      data-disabled={disabled ? '' : undefined}
      data-invalid={invalid ? '' : undefined}
      className={cn('ui-textarea', className)}
      {...props}
    />
  );
});
