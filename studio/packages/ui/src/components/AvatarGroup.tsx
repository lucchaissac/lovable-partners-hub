import { Children, forwardRef, isValidElement, cloneElement, useCallback, useEffect, useRef, useState } from 'react';
import type { HTMLAttributes, ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import type { AvatarProps, AvatarSize } from './Avatar';

export type AvatarGroupProps = HTMLAttributes<HTMLDivElement> & {
  /** Nombre max d'avatars affichés. Au-delà, un "+N" résiduel. */
  max?: number;
  /** Taille appliquée à tous les avatars enfants. */
  size?: AvatarSize;
  /** Reveal each visible avatar's name on hover/focus. Default: true (children stand alone). */
  tooltips?: boolean;
};

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(function AvatarGroup(
  { max = 3, size = 'md', tooltips = true, className, children, ...props },
  ref,
) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<AvatarProps>[];
  const visible = items.slice(0, max);
  const hidden = items.slice(max);
  const overflow = hidden.length;
  const hiddenNames = hidden.map((c) => c.props?.name).filter(Boolean) as string[];

  const overflowRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const updateCoords = useCallback(() => {
    const node = overflowRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setCoords({ top: rect.top, left: rect.left + rect.width / 2 });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateCoords();
    const onScroll = () => updateCoords();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, updateCoords]);

  return (
    <div
      ref={ref}
      data-size={size}
      className={cn('ui-avatar-group', className)}
      {...props}
    >
      {visible.map((child, i) =>
        cloneElement(child, {
          size,
          tooltip: child.props.tooltip ?? tooltips,
          key: child.key ?? i,
          className: cn('ui-avatar-group-item', child.props.className),
        }),
      )}
      {overflow > 0 && (
        <span
          ref={overflowRef}
          data-size={size}
          data-tone="muted"
          className="ui-avatar ui-avatar-group-item ui-avatar-group-overflow"
          aria-label={
            hiddenNames.length
              ? `+${overflow} more: ${hiddenNames.join(', ')}`
              : `+${overflow} more`
          }
          tabIndex={hiddenNames.length ? 0 : -1}
          onMouseEnter={() => hiddenNames.length && setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => hiddenNames.length && setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          +{overflow}
          {hiddenNames.length > 0 && open && coords && typeof document !== 'undefined' &&
            createPortal(
              <span
                className="ui-avatar-group-tooltip"
                role="tooltip"
                style={{ top: coords.top, left: coords.left }}
              >
                {hiddenNames.map((n) => (
                  <span key={n} className="ui-avatar-group-tooltip-row">
                    {n}
                  </span>
                ))}
              </span>,
              document.body,
            )}
        </span>
      )}
    </div>
  );
});
