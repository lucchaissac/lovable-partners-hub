import { Icon } from './Icon';
import { forwardRef, useEffect } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

/* ============================================================
   Panel — slide-in drawer (right or left).
   Single design language used across the app:
   - Panel:               outer shell
   - PanelHeader:         32px chrome row (nav, actions, close)
   - PanelTitleBlock:     eyebrow + title + meta + actions row
   - PanelBody:           scrollable content (24px gutters)
   - PanelFooter:         flex-shrink: 0 footer (composer / actions)
   - PanelSection:        titled content block with consistent spacing
   - PanelField:          label/value row
   - PanelInlineActions:  primary actions row right under the title
   - PanelMedia:          16:10 hero placeholder
   - PanelStatGrid:       3-column stat grid
   - PanelActivityList:   avatar + text + timestamp feed
   - PanelEmptyBlock:     dashed-bordered placeholder ("Add a description…")
   - PanelComposer:       composer wrapped for footer use (compose + attach)
   - PanelNavCounter:     "n of m" indicator next to prev/next
   ============================================================ */

export type PanelProps = HTMLAttributes<HTMLDivElement> & {
  open: boolean;
  onClose?: () => void;
  side?: 'right' | 'left';
  width?: number | string;
  /** Show a dim backdrop behind the panel. Default: true */
  overlay?: boolean;
  /** Close when overlay is clicked. Default: true */
  closeOnOverlayClick?: boolean;
  /** Close when Escape is pressed. Default: true */
  closeOnEscape?: boolean;
};

export const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel(
  {
    open,
    onClose,
    side = 'right',
    width = 560,
    overlay = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    className,
    children,
    style,
    ...props
  },
  ref,
) {
  useEffect(() => {
    if (!open || !closeOnEscape || !onClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, closeOnEscape, onClose]);

  const widthValue = typeof width === 'number' ? `${width}px` : width;

  return (
    <>
      {overlay && (
        <div
          className="ui-panel-overlay"
          data-open={open ? '' : undefined}
          onClick={closeOnOverlayClick ? onClose : undefined}
          aria-hidden="true"
        />
      )}
      <div
        ref={ref}
        className={cn('ui-panel', className)}
        data-open={open ? '' : undefined}
        data-side={side}
        style={{ ['--ui-panel-w' as string]: widthValue, ...style }}
        role="dialog"
        aria-modal="true"
        {...props}
      >
        {children}
      </div>
    </>
  );
});

export type PanelHeaderProps = HTMLAttributes<HTMLDivElement> & {
  leading?: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
  showClose?: boolean;
  /** Hide the bottom border. Useful when the title block follows immediately. */
  borderless?: boolean;
};

export function PanelHeader({
  leading,
  actions,
  onClose,
  showClose = true,
  borderless,
  className,
  children,
  ...props
}: PanelHeaderProps) {
  return (
    <div
      className={cn('ui-panel-header', className)}
      data-borderless={borderless ? '' : undefined}
      {...props}
    >
      {leading && <div className="ui-panel-header-leading">{leading}</div>}
      {children && <div className="ui-panel-header-children">{children}</div>}
      <div className="ui-panel-header-spacer" />
      {actions && <div className="ui-panel-header-actions">{actions}</div>}
      {showClose && onClose && (
        <button
          type="button"
          className="ui-panel-header-close"
          onClick={onClose}
          aria-label="Close panel"
        >
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   PanelTitleBlock — canonical title region used after PanelHeader.
   Renders eyebrow + title + meta + optional inline actions.
   ────────────────────────────────────────────────────────────── */

export type PanelTitleBlockProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  eyebrow?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
};

export function PanelTitleBlock({
  eyebrow,
  title,
  meta,
  actions,
  className,
  ...props
}: PanelTitleBlockProps) {
  return (
    <div className={cn('ui-panel-titleblock', className)} {...props}>
      <div className="ui-panel-titleblock-text">
        {eyebrow && <div className="ui-panel-titleblock-eyebrow">{eyebrow}</div>}
        <div className="ui-panel-titleblock-title">{title}</div>
        {meta && <div className="ui-panel-titleblock-meta">{meta}</div>}
      </div>
      {actions && <div className="ui-panel-titleblock-actions">{actions}</div>}
    </div>
  );
}

/* Legacy minimal title — kept for backward compat */
export type PanelTitleProps = HTMLAttributes<HTMLDivElement>;
export function PanelTitle({ className, children, ...props }: PanelTitleProps) {
  return (
    <div className={cn('ui-panel-title-row', className)} {...props}>
      <div className="ui-panel-title-text">{children}</div>
    </div>
  );
}

export type PanelBodyProps = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
};
export function PanelBody({ padded = true, className, children, ...props }: PanelBodyProps) {
  return (
    <div
      className={cn('ui-panel-body', className)}
      data-padded={padded ? '' : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

export type PanelFooterProps = HTMLAttributes<HTMLDivElement> & {
  /** Visual treatment. 'plain' = transparent (default in app), 'subtle' = muted bg. */
  variant?: 'plain' | 'subtle';
};
export function PanelFooter({ variant = 'plain', className, children, ...props }: PanelFooterProps) {
  return (
    <div
      className={cn('ui-panel-footer', className)}
      data-variant={variant}
      {...props}
    >
      {children}
    </div>
  );
}

export type PanelFieldProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value?: ReactNode;
  /** Stack label above value instead of side-by-side. */
  stacked?: boolean;
};
export function PanelField({
  label,
  value,
  stacked,
  className,
  children,
  ...props
}: PanelFieldProps) {
  return (
    <div
      className={cn('ui-panel-field', className)}
      data-stacked={stacked ? '' : undefined}
      {...props}
    >
      <div className="ui-panel-field-label">{label}</div>
      <div className="ui-panel-field-value">{value ?? children}</div>
    </div>
  );
}

export type PanelSectionProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  /** Trailing element on the section title row (e.g. small action button). */
  action?: ReactNode;
  /** Removes the top margin (use for the first section in a body). */
  flush?: boolean;
};
export function PanelSection({
  title,
  action,
  flush,
  className,
  children,
  ...props
}: PanelSectionProps) {
  return (
    <div
      className={cn('ui-panel-section', className)}
      data-flush={flush ? '' : undefined}
      {...props}
    >
      {(title || action) && (
        <div className="ui-panel-section-head">
          {title && <div className="ui-panel-section-title">{title}</div>}
          {action && <div className="ui-panel-section-action">{action}</div>}
        </div>
      )}
      <div className="ui-panel-section-body">{children}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   PanelInlineActions — primary action row right under the title.
   ────────────────────────────────────────────────────────────── */

export type PanelInlineActionsProps = HTMLAttributes<HTMLDivElement>;
export function PanelInlineActions({ className, children, ...props }: PanelInlineActionsProps) {
  return (
    <div className={cn('ui-panel-inline-actions', className)} {...props}>
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   PanelMedia — 16:10 aspect-ratio media placeholder.
   ────────────────────────────────────────────────────────────── */

export type PanelMediaProps = HTMLAttributes<HTMLDivElement> & {
  ratio?: string;
};
export function PanelMedia({
  ratio = '16 / 10',
  className,
  style,
  children,
  ...props
}: PanelMediaProps) {
  return (
    <div
      className={cn('ui-panel-media', className)}
      style={{ aspectRatio: ratio, ...style }}
      aria-hidden={!children}
      {...props}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   PanelStatGrid — 3-column stat grid (used inside Analytics sections).
   ────────────────────────────────────────────────────────────── */

export type PanelStatGridProps = HTMLAttributes<HTMLDivElement> & {
  columns?: number;
};
export function PanelStatGrid({
  columns = 3,
  className,
  style,
  children,
  ...props
}: PanelStatGridProps) {
  return (
    <div
      className={cn('ui-panel-stat-grid', className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   PanelActivityItem — avatar + text/meta line in an activity feed.
   ────────────────────────────────────────────────────────────── */

export type PanelActivityItemProps = HTMLAttributes<HTMLDivElement> & {
  avatar?: ReactNode;
  primary: ReactNode;
  meta?: ReactNode;
};
export function PanelActivityItem({
  avatar,
  primary,
  meta,
  className,
  ...props
}: PanelActivityItemProps) {
  return (
    <div className={cn('ui-panel-activity-item', className)} {...props}>
      {avatar && <div className="ui-panel-activity-avatar">{avatar}</div>}
      <div className="ui-panel-activity-text">
        <div className="ui-panel-activity-primary">{primary}</div>
        {meta && <div className="ui-panel-activity-meta">{meta}</div>}
      </div>
    </div>
  );
}

export type PanelActivityListProps = HTMLAttributes<HTMLDivElement>;
export function PanelActivityList({ className, children, ...props }: PanelActivityListProps) {
  return (
    <div className={cn('ui-panel-activity-list', className)} {...props}>
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   PanelEmptyBlock — soft dashed/outlined block with hint text.
   Use for "Add description…" or "No sub-tasks yet" etc.
   ────────────────────────────────────────────────────────────── */

export type PanelEmptyBlockProps = HTMLAttributes<HTMLDivElement> & {
  icon?: ReactNode;
};
export function PanelEmptyBlock({
  icon,
  className,
  children,
  ...props
}: PanelEmptyBlockProps) {
  return (
    <div className={cn('ui-panel-empty-block', className)} {...props}>
      {icon && <div className="ui-panel-empty-block-icon">{icon}</div>}
      <div className="ui-panel-empty-block-text">{children}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   PanelNavCounter — "n of m" pill aligned next to nav buttons.
   ────────────────────────────────────────────────────────────── */

export type PanelNavCounterProps = HTMLAttributes<HTMLSpanElement> & {
  current: number;
  total: number;
};
export function PanelNavCounter({
  current,
  total,
  className,
  ...props
}: PanelNavCounterProps) {
  return (
    <span className={cn('ui-panel-nav-counter', className)} {...props}>
      {current} of {total}
    </span>
  );
}
