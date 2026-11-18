import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactElement } from 'react';
import { createPortal } from 'react-dom';

type TriggerProps = HTMLAttributes<HTMLElement>;
export type TooltipProps = { label: string; description?: string; children: ReactElement<TriggerProps>; enabled?: boolean; onlyWhenTruncated?: boolean; side?: 'right' | 'bottom' | 'top'; maxWidth?: number };

function isTruncated(element: HTMLElement) {
  return [element, ...element.querySelectorAll<HTMLElement>('*')].some(candidate => {
    const style = getComputedStyle(candidate);
    return (['hidden', 'clip'].includes(style.overflowX) && candidate.scrollWidth > candidate.clientWidth)
      || (['hidden', 'clip'].includes(style.overflowY) && candidate.scrollHeight > candidate.clientHeight);
  });
}
/** The shared visual surface, also rendered inline by documentation illustrations. */
export function TooltipBubble({ label, description, className, maxWidth = 180, clampToViewport = false, style, ...props }: HTMLAttributes<HTMLSpanElement> & { label: string; description?: string; maxWidth?: number; clampToViewport?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const anchorLeft = style?.left;
  useLayoutEffect(() => {
    let active = true;
    const measure = () => {
      const tooltip = ref.current;
      if (!active || !tooltip) return;
      tooltip.style.width = 'max-content';
      // Hug the longest wrapped line using the same measurement in every view.
      const range = document.createRange();
      range.selectNodeContents(tooltip);
      const lines = Array.from(range.getClientRects());
      tooltip.toggleAttribute('data-multiline', lines.length > 1);
      const lineWidth = Math.max(...lines.map(rect => rect.width), 0);
      const style = getComputedStyle(tooltip);
      const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
      tooltip.style.width = `${Math.ceil(lineWidth + padding)}px`;
      if (clampToViewport && typeof anchorLeft === 'number') {
        // Keep the bubble attached to its trigger; only shift its actual width at the viewport edge.
        tooltip.style.left = `${anchorLeft}px`;
        const bounds = tooltip.getBoundingClientRect();
        const offset = bounds.left < 8 ? 8 - bounds.left : Math.min(0, innerWidth - 8 - bounds.right);
        tooltip.style.left = `${anchorLeft + offset}px`;
      }
    };
    measure();
    document.fonts.ready.then(measure);
    return () => { active = false; };
  }, [label, description, maxWidth, clampToViewport, anchorLeft]);
  return <span {...props} ref={ref} role="tooltip" className={['ui-tooltip', className].filter(Boolean).join(' ')} style={{ ...style, maxWidth: `min(${maxWidth}px, calc(100vw - 16px))` }}>{label}{description && <span style={{ display: 'block', opacity: .7, fontSize: 12, lineHeight: '18px' }}>{description}</span>}</span>;
}

/** Compact, portaled tooltip for icon controls; also appears on keyboard focus. */
export function Tooltip({ label, description, children, enabled = true, onlyWhenTruncated = false, side = 'right', maxWidth = 180 }: TooltipProps) {
  const id = useId();
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const close = () => setAnchor(null);
  const show = (element: HTMLElement) => {
    if (!enabled || (onlyWhenTruncated && !isTruncated(element))) { close(); return; }
    const rect = element.getBoundingClientRect();
    if (side === 'bottom' || side === 'top') { setAnchor({ top: side === 'top' ? rect.top - 8 : rect.bottom + 8, left: rect.left + rect.width / 2 }); return; }
    setAnchor({ top: Math.min(innerHeight - 24, Math.max(24, rect.top + rect.height / 2)), left: rect.right + 8 });
  };
  useEffect(() => {
    if (!anchor) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', key);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [anchor]);
  return <>{cloneElement(children, {
    'aria-describedby': enabled && anchor ? [children.props['aria-describedby'], id].filter(Boolean).join(' ') : children.props['aria-describedby'],
    onMouseEnter: event => { children.props.onMouseEnter?.(event); show(event.currentTarget); },
    onMouseLeave: event => { children.props.onMouseLeave?.(event); close(); },
    onFocus: event => { children.props.onFocus?.(event); show(event.currentTarget); },
    onBlur: event => { children.props.onBlur?.(event); close(); },
    onClick: event => { close(); children.props.onClick?.(event); },
  })}{enabled && anchor && createPortal(<TooltipBubble id={id} label={label} description={description} maxWidth={maxWidth} clampToViewport style={{ top: anchor.top, left: anchor.left, ...(side === 'top' ? { transform: 'translate(-50%, -100%)' } : side === 'bottom' ? { transform: 'translateX(-50%)' } : {}) }} />, document.body)}</>;
}
