import { forwardRef } from 'react';
import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Vertical stack of form fields with the standard 16px (--ui-space-4)
 * rhythm used inside Dialog and Panel bodies.
 */
export type FormStackProps = HTMLAttributes<HTMLDivElement>;
export const FormStack = forwardRef<HTMLDivElement, FormStackProps>(function FormStack(
  { className, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn('ui-form-stack', className)} {...props}>
      {children}
    </div>
  );
});

/**
 * Label + control + optional hint/error block. The label uses the system
 * field font (13/500) so it sits naturally above any of our control
 * components.
 */
export type FormFieldProps = LabelHTMLAttributes<HTMLLabelElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
};

export const FormField = forwardRef<HTMLLabelElement, FormFieldProps>(function FormField(
  { label, hint, error, required, className, children, ...props },
  ref,
) {
  return (
    <label ref={ref} className={cn('ui-form-field', className)} {...props}>
      {label && (
        <span
          className="ui-form-field-label"
          data-required={required ? '' : undefined}
        >
          {label}
        </span>
      )}
      {children}
      {error ? (
        <span className="ui-form-field-error">{error}</span>
      ) : (
        hint && <span className="ui-form-field-hint">{hint}</span>
      )}
    </label>
  );
});

/**
 * Inline two-control row (input + trailing button, or trigger + button).
 * Children stretch to share row height; the input expands, the button
 * shrinks to its label.
 */
export type FormRowProps = HTMLAttributes<HTMLDivElement>;
export const FormRow = forwardRef<HTMLDivElement, FormRowProps>(function FormRow(
  { className, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn('ui-form-row', className)} {...props}>
      {children}
    </div>
  );
});
