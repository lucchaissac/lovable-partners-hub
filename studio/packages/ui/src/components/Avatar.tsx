import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';

export type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarTone =
  | 'blue'
  | 'purple'
  | 'dark'
  | 'muted'
  | 'red'
  | 'green'
  | 'pink'
  | 'cyan'
  | 'yellow'
  | 'lime'
  | 'auto';

export type AvatarProps = HTMLAttributes<HTMLSpanElement> & {
  name: string;
  size?: AvatarSize;
  tone?: AvatarTone;
  src?: string;
  /** Reveal the name on hover/focus. Use when no label is shown alongside. */
  tooltip?: boolean;
};

const TONES: Exclude<AvatarTone, 'auto'>[] = [
  'blue',
  'purple',
  'dark',
  'red',
  'green',
  'pink',
  'cyan',
  'yellow',
  'lime',
];

function hashTone(name: string): Exclude<AvatarTone, 'auto'> {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

function initials(name: string, max: number): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, max).toLowerCase();
  return (parts[0][0] + parts[parts.length - 1][0]).slice(0, max).toLowerCase();
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { name, size = 'md', tone = 'auto', src, tooltip, className, tabIndex, onMouseEnter, onMouseLeave, onFocus, onBlur, ...props },
  ref,
) {
  const resolvedTone = tone === 'auto' ? hashTone(name) : tone;
  const max = size === 'sm' ? 1 : 2;
  const label = useMemo(() => initials(name, max), [name, max]);
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = src && !imgFailed;

  const localRef = useRef<HTMLSpanElement | null>(null);
  const setRefs = useCallback(
    (node: HTMLSpanElement | null) => {
      localRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: HTMLSpanElement | null }).current = node;
    },
    [ref],
  );

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const updateCoords = useCallback(() => {
    const node = localRef.current;
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
    <span
      ref={setRefs}
      data-size={size}
      data-tone={showImage ? 'muted' : resolvedTone}
      data-tooltip={tooltip ? '' : undefined}
      aria-label={name}
      tabIndex={tooltip ? (tabIndex ?? 0) : tabIndex}
      className={cn('ui-avatar', className)}
      onMouseEnter={(e) => {
        if (tooltip) setOpen(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (tooltip) setOpen(false);
        onMouseLeave?.(e);
      }}
      onFocus={(e) => {
        if (tooltip) setOpen(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        if (tooltip) setOpen(false);
        onBlur?.(e);
      }}
      {...props}
    >
      {showImage ? (
        <img src={src} alt="" onError={() => setImgFailed(true)} />
      ) : (
        label
      )}
      {tooltip && open && coords && typeof document !== 'undefined' &&
        createPortal(
          <span
            className="ui-avatar-tooltip"
            role="tooltip"
            style={{ top: coords.top, left: coords.left }}
          >
            {name}
          </span>,
          document.body,
        )}
    </span>
  );
});
