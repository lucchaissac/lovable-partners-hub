import { Icon } from './Icon';
import { forwardRef, useEffect, useRef } from 'react';
import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type DialogSize = 'sm' | 'md' | 'lg';

export type DialogProps = HTMLAttributes<HTMLDivElement> & {
  /** Opens and closes instantly; no default entrance or exit animation. */
  open: boolean;
  onClose?: () => void;
  size?: DialogSize;
  /** Separate header and footer from the body with shared borders. */
  dividers?: boolean;
  /** Show a dim backdrop. Default: true. */
  overlay?: boolean;
  /** Close when overlay is clicked. Default: true. */
  closeOnOverlayClick?: boolean;
  /** Close when Escape is pressed. Default: true. */
  closeOnEscape?: boolean;
  /** Override max width. Takes precedence over `size`. */
  width?: number | string;
  /** Optional className for the overlay element. */
  overlayClassName?: string;
  /** Accessible label when no DialogHeader/title is rendered. */
  ariaLabel?: string;
};

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(function Dialog(
  {
    open,
    onClose,
    size = 'md',
    dividers = false,
    overlay = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    width,
    overlayClassName,
    ariaLabel,
    className,
    style,
    children,
    ...props
  },
  ref,
) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !closeOnEscape || !onClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, closeOnEscape, onClose]);

  // Lightweight focus trap: keep Tab within the dialog while open.
  useEffect(() => {
    if (!open) return;
    const node = dialogRef.current;
    if (!node) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('data-focus-skip'));

    const initial = focusables()[0];
    initial?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener('keydown', onKeyDown);
    return () => {
      node.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  const widthValue =
    width != null ? (typeof width === 'number' ? `${width}px` : width) : undefined;

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!closeOnOverlayClick || !onClose) return;
    if (e.target === e.currentTarget) onClose();
  };

  const setRefs = (node: HTMLDivElement | null) => {
    dialogRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
  };

  // The size rules set this variable on the dialog itself. Setting it on the
  // overlay is only inherited and therefore loses to the default size rule.
  const dialogStyle = widthValue != null
    ? { ...style, ['--ui-dialog-w' as string]: widthValue }
    : style;

  return (
    <div
      className={cn('ui-dialog-overlay', overlayClassName)}
      data-open={open ? '' : undefined}
      data-overlay={overlay ? '' : 'hidden'}
      onClick={handleOverlayClick}
      aria-hidden={!open}
    >
      <div
        ref={setRefs}
        className={cn('ui-dialog', className)}
        data-size={size}
        data-dividers={dividers ? '' : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        style={dialogStyle}
        {...props}
      >
        {children}
      </div>
    </div>
  );
});

export type DialogHeaderProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  title?: ReactNode;
  description?: ReactNode;
  onClose?: () => void;
  showClose?: boolean;
};

export function DialogHeader({
  title,
  description,
  onClose,
  showClose = true,
  className,
  children,
  ...props
}: DialogHeaderProps) {
  return (
    <div className={cn('ui-dialog-header', className)} {...props}>
      <div className="ui-dialog-header-text">
        {title && <DialogTitle>{title}</DialogTitle>}
        {description && <DialogDescription>{description}</DialogDescription>}
        {children}
      </div>
      {showClose && onClose && (
        <button
          type="button"
          className="ui-dialog-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}

export type DialogTitleProps = HTMLAttributes<HTMLHeadingElement>;
export function DialogTitle({ className, children, ...props }: DialogTitleProps) {
  return (
    <h2 className={cn('ui-dialog-title', className)} {...props}>
      {children}
    </h2>
  );
}

export type DialogDescriptionProps = HTMLAttributes<HTMLParagraphElement>;
export function DialogDescription({ className, children, ...props }: DialogDescriptionProps) {
  return (
    <p className={cn('ui-dialog-description', className)} {...props}>
      {children}
    </p>
  );
}

export type DialogBodyProps = HTMLAttributes<HTMLDivElement>;
export function DialogBody({ className, children, ...props }: DialogBodyProps) {
  return (
    <div className={cn('ui-dialog-body', className)} {...props}>
      {children}
    </div>
  );
}

export type DialogFooterProps = HTMLAttributes<HTMLDivElement>;
export function DialogFooter({ className, children, ...props }: DialogFooterProps) {
  return (
    <div className={cn('ui-dialog-footer', className)} {...props}>
      {children}
    </div>
  );
}
