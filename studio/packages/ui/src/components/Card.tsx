import { forwardRef } from 'react';
import type { CSSProperties, HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type CardVariant = 'bordered' | 'flat' | 'ghost';
export type CardDirection = 'vertical' | 'horizontal';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Visual surface.
   * - `bordered` (default): framed card with padding — for grids of summary cards.
   * - `flat`: transparent — for image-led gallery cards (the surface lives in CardMedia).
   * - `ghost`: transparent row that highlights on hover — for list rows.
   */
  variant?: CardVariant;
  /** Stack children vertically (default) or horizontally (list-card layout). */
  direction?: CardDirection;
  /**
   * Render hover/cursor/focus affordances. Card stays a `<div>` so it can
   * safely contain interactive children — Enter/Space activate the click.
   */
  clickable?: boolean;
  /** Visually highlight as the active selection (accent border). */
  selected?: boolean;
  /**
   * Multi-select state — orthogonal to `selected`. A `selected` card is
   * the one being inspected (e.g. open in a side panel); a `checked` card
   * is one of N picked from a grid. Both keep `CardOverlay` revealed.
   */
  checked?: boolean;
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = 'bordered',
    direction = 'vertical',
    clickable,
    selected,
    checked,
    className,
    children,
    onClick,
    onKeyDown,
    role,
    tabIndex,
    ...props
  },
  ref,
) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (!clickable || !onClick) return;
    if (e.defaultPrevented) return;
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e as unknown as MouseEvent<HTMLDivElement>);
    }
  };

  return (
    <div
      ref={ref}
      className={cn('ui-card', className)}
      data-variant={variant}
      data-direction={direction}
      data-clickable={clickable ? '' : undefined}
      data-selected={selected ? '' : undefined}
      data-checked={checked ? '' : undefined}
      role={role ?? (clickable ? 'button' : undefined)}
      tabIndex={tabIndex ?? (clickable ? 0 : undefined)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </div>
  );
});

export type CardMediaProps = HTMLAttributes<HTMLDivElement> & {
  /** Aspect ratio (CSS value: '16 / 10', '1 / 1', etc.). Mutually exclusive with `size`. */
  aspectRatio?: string;
  /** Fixed square size (px) — for horizontal list cards. */
  size?: number;
  /** Optional <img> source. Overrides children for the media body. */
  src?: string;
  /** Alt text when `src` is provided. */
  alt?: string;
};

export const CardMedia = forwardRef<HTMLDivElement, CardMediaProps>(function CardMedia(
  { aspectRatio = '16 / 10', size, src, alt = '', className, style, children, ...props },
  ref,
) {
  const mediaStyle: CSSProperties = size
    ? { width: size, height: size, ...style }
    : { aspectRatio, ...style };

  return (
    <div
      ref={ref}
      className={cn('ui-card-media', className)}
      style={mediaStyle}
      aria-hidden={src ? undefined : true}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        children
      )}
    </div>
  );
});

export type CardBodyProps = HTMLAttributes<HTMLDivElement>;
export function CardBody({ className, children, ...props }: CardBodyProps) {
  return (
    <div className={cn('ui-card-body', className)} {...props}>
      {children}
    </div>
  );
}

export type CardTitleProps = HTMLAttributes<HTMLDivElement>;
export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <div className={cn('ui-card-title', className)} {...props}>
      {children}
    </div>
  );
}

export type CardDescriptionProps = HTMLAttributes<HTMLDivElement>;
export function CardDescription({ className, children, ...props }: CardDescriptionProps) {
  return (
    <div className={cn('ui-card-description', className)} {...props}>
      {children}
    </div>
  );
}

export type CardMetaItem = {
  icon?: ReactNode;
  label?: ReactNode;
  /** Render the chunk faded when value is zero/empty. */
  muted?: boolean;
};

export type CardMetaProps = HTMLAttributes<HTMLDivElement> & {
  items?: CardMetaItem[];
};

export function CardMeta({ items, className, children, ...props }: CardMetaProps) {
  return (
    <div className={cn('ui-card-meta', className)} {...props}>
      {items
        ? items.map((it, i) => (
            <span
              key={i}
              className="ui-card-meta-item"
              data-empty={it.muted ? '' : undefined}
            >
              {it.icon}
              {it.label}
            </span>
          ))
        : children}
    </div>
  );
}

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;
export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div className={cn('ui-card-footer', className)} {...props}>
      {children}
    </div>
  );
}

export type CardActionsProps = HTMLAttributes<HTMLDivElement> & {
  /** Hide the actions until the card is hovered or focused. Default: true. */
  hideUntilHover?: boolean;
};
export function CardActions({
  hideUntilHover = true,
  className,
  children,
  ...props
}: CardActionsProps) {
  return (
    <div
      className={cn('ui-card-actions', className)}
      data-card-actions={hideUntilHover ? '' : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================
// CardOverlay — absolute layer over the card (typically over CardMedia).
// Reveals on hover / focus-within / selected / checked. Use for the
// hover-only checkbox + action cluster on gallery cards.
// ============================================================

export type CardOverlayProps = HTMLAttributes<HTMLDivElement> & {
  /** Insets the overlay by this many pixels. Default: `8` (token rhythm). */
  inset?: number;
  /** Default `space-between` (checkbox left, actions right). */
  justify?: 'start' | 'center' | 'end' | 'space-between';
  /** Default `start`. */
  align?: 'start' | 'center' | 'end';
};
export const CardOverlay = forwardRef<HTMLDivElement, CardOverlayProps>(
  function CardOverlay(
    { className, inset = 8, justify = 'space-between', align = 'start', style, ...props },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={cn('ui-card-overlay', className)}
        data-justify={justify}
        data-align={align}
        style={{ inset, ...style }}
        {...props}
      />
    );
  },
);

// ============================================================
// CardBadge — small persistent pin on a card (typically top-right of
// CardMedia). Visible regardless of hover state — used for favorite
// stars, status dots, "new" markers.
// ============================================================

export type CardBadgePlacement =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left';
export type CardBadgeProps = HTMLAttributes<HTMLDivElement> & {
  /** Default `top-right`. */
  placement?: CardBadgePlacement;
  /** Hide the badge while the card is hovered (so an overlay can take its slot). Default: `true`. */
  hideOnHover?: boolean;
};
export const CardBadge = forwardRef<HTMLDivElement, CardBadgeProps>(
  function CardBadge(
    { className, placement = 'top-right', hideOnHover = true, ...props },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={cn('ui-card-badge', className)}
        data-placement={placement}
        data-hide-on-hover={hideOnHover ? '' : undefined}
        aria-hidden={undefined}
        {...props}
      />
    );
  },
);
