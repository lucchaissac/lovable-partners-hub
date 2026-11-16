import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { animate, useReducedMotion, type AnimationPlaybackControls } from 'framer-motion';

const DEFAULT_WIDTH = 300;
const MIN_WIDTH = 280;
const RAIL_WIDTH = 64;
const MAX_STRETCH = 24;
const RAIL_SQUEEZE = 8;
const STORAGE_KEY = 'lovable:editor-sidebar-width';
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const resistedDistance = (distance: number, limit: number) => limit > 0 ? limit * (1 - Math.exp(-distance * .35 / limit)) : 0;

function savedWidth(key: string) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? clamp(value, MIN_WIDTH, 520) : DEFAULT_WIDTH;
  } catch { return DEFAULT_WIDTH; }
}

/** Paint the drag and release spring directly; persist only the settled, open width. */
export function EditorSidebar({ open, children, rail, railWidth = RAIL_WIDTH, side = 'left', className = 'we-chat', label = 'Asset AI', onCollapse, onExpand }: { open: boolean; onCollapse?: () => void; onExpand?: () => void; children: ReactNode; rail?: ReactNode; railWidth?: number; side?: 'left' | 'right'; className?: string; label?: string }) {
  const storageKey = side === 'right' ? 'asset-ui:threads-panel-width' : STORAGE_KEY;
  const closedWidth = side === 'left' ? railWidth : 0;
  const resizable = side === 'left' || !!onExpand || open;
  const reducedMotion = useReducedMotion();
  const sidebar = useRef<HTMLElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const spring = useRef<AnimationPlaybackControls | null>(null);
  const drag = useRef<{ pointerId: number; startX: number; startWidth: number; width: number; requested: number; startedOpen: boolean; lastTime: number; velocity: number } | null>(null);
  const [preferredWidth, setPreferredWidth] = useState(() => savedWidth(storageKey));
  const [bounds, setBounds] = useState({ min: MIN_WIDTH, max: 520 });
  const width = Math.round(clamp(preferredWidth, bounds.min, bounds.max));
  const initialWidth = useRef(!open ? closedWidth : width);
  const paintedWidth = useRef(initialWidth.current);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    const container = sidebar.current?.parentElement;
    if (!container || !resizable) return;
    const measure = () => {
      const available = container.clientWidth;
      const max = available <= 620 ? Math.min(520, available * .85) : Math.max(MIN_WIDTH, Math.min(520, available - 360));
      const min = Math.min(MIN_WIDTH, max);
      setBounds(previous => previous.min === min && previous.max === max ? previous : { min, max });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [resizable]);

  useLayoutEffect(() => {
    if (!resizable || drag.current) return;
    const target = open ? width : closedWidth;
    if (!mounted.current) { mounted.current = true; paint(target); }
    else {
      // Buttons snap immediately; pointer drags settle in finish().
      spring.current?.stop(); spring.current = null;
      sidebar.current?.removeAttribute('data-settling');
      paint(target);
    }
  }, [open, width, closedWidth, resizable]);

  useEffect(() => () => { cancelAnimationFrame(frame.current); spring.current?.stop(); }, []);

  function positionGlow(clientY: number) {
    const target = handle.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const inset = parseFloat(getComputedStyle(target, '::after').top) || 0;
    const height = Math.max(2, rect.height - inset * 2);
    const center = clamp(clientY - rect.top - inset, Math.min(24, height / 2), height - Math.min(24, height / 2));
    target.style.setProperty('--we-resize-start', `${Math.max(0, center - 160)}px`);
    target.style.setProperty('--we-resize-center', `${center}px`);
    target.style.setProperty('--we-resize-end', `${Math.min(height, center + 160)}px`);
  }

  function paint(next: number) {
    const value = clamp(next, closedWidth, bounds.max);
    // Only the shell stretches. Opacity, parallax and accessible values keep their normal range.
    const visualWidth = clamp(next, Math.max(0, closedWidth - RAIL_SQUEEZE), bounds.max + MAX_STRETCH);
    paintedWidth.current = visualWidth;
    const fadeRange = Math.max(1, Math.min(100, bounds.min - closedWidth));
    const contentOpacity = clamp((value - bounds.min + fadeRange) / fadeRange, 0, 1);
    // Keep a small overlap so one presentation starts arriving before the other disappears.
    const railFadeEnd = bounds.min - fadeRange + 16;
    const railHoldEnd = Math.min(closedWidth + 32, railFadeEnd - 1);
    const railOpacity = rail ? clamp((railFadeEnd - value) / (railFadeEnd - railHoldEnd), 0, 1) : 0;
    const direction = side === 'left' ? -1 : 1;
    sidebar.current?.style.setProperty('--we-chat-width', `${visualWidth}px`);
    sidebar.current?.style.setProperty('--we-chat-content-opacity', String(contentOpacity));
    sidebar.current?.style.setProperty('--we-chat-rail-opacity', String(railOpacity));
    sidebar.current?.style.setProperty('--we-chat-content-offset', `${direction * 8 * (1 - contentOpacity) ** 3}px`);
    sidebar.current?.style.setProperty('--we-chat-rail-offset', `${direction * 4 * (1 - railOpacity) ** 3}px`);
    sidebar.current?.toggleAttribute('data-content-visible', contentOpacity > 0);
    sidebar.current?.toggleAttribute('data-rail-visible', railOpacity > 0);
    handle.current?.setAttribute('aria-valuenow', String(Math.round(value)));
    handle.current?.setAttribute('aria-valuetext', value === closedWidth ? side === 'right' ? 'Closed' : 'Collapsed' : `${Math.round(value)} pixels`);
  }

  function settle(target: number, complete?: () => void, velocity = 0) {
    spring.current?.stop();
    spring.current = null;
    const finish = () => {
      spring.current = null;
      sidebar.current?.removeAttribute('data-settling');
      paint(target);
      complete?.();
    };
    if (reducedMotion || Math.abs(paintedWidth.current - target) < .5) { finish(); return; }
    sidebar.current?.setAttribute('data-settling', '');
    spring.current = animate(paintedWidth.current, target, {
      type: 'spring', stiffness: 520, damping: 38, mass: 1,
      velocity: clamp(velocity, -1400, 1400), restDelta: .3, restSpeed: 3,
      onUpdate: paint, onComplete: finish,
    });
  }

  function save(next: number) {
    setPreferredWidth(next);
    try { localStorage.setItem(storageKey, String(next)); } catch { /* Storage can be unavailable. */ }
  }

  function finish(cancel = false) {
    const current = drag.current;
    if (!current) return;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    paint(current.width);
    drag.current = null;
    sidebar.current?.removeAttribute('data-resizing');
    if (handle.current?.hasPointerCapture(current.pointerId)) handle.current.releasePointerCapture(current.pointerId);
    if (cancel) { settle(current.startedOpen ? width : closedWidth); return; }
    const velocity = performance.now() - current.lastTime < 100 ? current.velocity : 0;
    const threshold = closedWidth + (bounds.min - closedWidth) * .6 + (current.startedOpen ? 0 : 20);
    const projected = current.requested + clamp(velocity * .12, -80, 80);
    if (onCollapse && projected < threshold) {
      settle(closedWidth, onCollapse, velocity);
    } else {
      const target = Math.round(clamp(current.requested, bounds.min, bounds.max));
      settle(target, () => { save(target); if (!current.startedOpen) onExpand?.(); }, velocity);
    }
  }

  return <aside ref={sidebar} className={className} data-side={side} data-collapsed={!open || undefined} data-resizable={resizable || undefined} aria-label={label}
    style={{ '--we-chat-width': `${initialWidth.current}px`, '--we-sidebar-min-width': `${bounds.min}px`, '--we-sidebar-rail-width': `${railWidth}px` } as CSSProperties}>
    <div className="we-sidebar-content" inert={!open || undefined} aria-hidden={!open || undefined}>{children}</div>
    {rail && <div className="we-sidebar-rail" inert={open || undefined} aria-hidden={open || undefined}>{rail}</div>}
    {resizable && <div ref={handle} className="we-chat-resize" role="separator" aria-label={side === 'right' ? `Resize ${label} panel` : 'Resize sidebar'}
      aria-orientation="vertical" aria-valuemin={onCollapse ? closedWidth : Math.round(bounds.min)} aria-valuemax={Math.round(bounds.max)} aria-valuenow={open ? width : closedWidth}
      aria-valuetext={open ? `${width} pixels` : side === 'right' ? 'Closed' : 'Collapsed'} tabIndex={0}
      onPointerEnter={event => positionGlow(event.clientY)}
      onPointerDown={event => {
        if (event.button !== 0 || !event.isPrimary) return;
        event.preventDefault();
        spring.current?.stop(); spring.current = null;
        sidebar.current?.removeAttribute('data-settling');
        positionGlow(event.clientY);
        event.currentTarget.focus();
        const startWidth = sidebar.current!.getBoundingClientRect().width;
        drag.current = { pointerId: event.pointerId, startX: event.clientX, startWidth, width: startWidth, requested: startWidth, startedOpen: open, lastTime: performance.now(), velocity: 0 };
        sidebar.current!.setAttribute('data-resizing', '');
        paint(startWidth);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        positionGlow(event.clientY);
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const now = performance.now();
        const rawWidth = current.startWidth + (event.clientX - current.startX) * (side === 'right' ? -1 : 1);
        const minimum = onCollapse ? closedWidth : bounds.min;
        const requested = clamp(rawWidth, minimum, bounds.max);
        const distance = requested - closedWidth;
        const nextWidth = rawWidth > bounds.max ? bounds.max + resistedDistance(rawWidth - bounds.max, MAX_STRETCH)
          : rawWidth < minimum ? minimum - resistedDistance(minimum - rawWidth, Math.min(RAIL_SQUEEZE, minimum))
          : distance < 80 ? closedWidth + distance ** 2 / 80 : requested;
        const speed = (nextWidth - current.width) / Math.max(1, now - current.lastTime) * 1000;
        current.velocity = current.velocity * .5 + speed * .5;
        current.lastTime = now;
        current.requested = requested;
        current.width = nextWidth;
        if (!frame.current) frame.current = requestAnimationFrame(() => {
          frame.current = 0;
          if (drag.current) paint(drag.current.width);
        });
      }}
      onPointerUp={() => finish()}
      onPointerCancel={() => finish(true)}
      onLostPointerCapture={() => finish()}
      onDoubleClick={() => { const target = Math.round(clamp(DEFAULT_WIDTH, bounds.min, bounds.max)); settle(target, () => { save(target); if (!open) onExpand?.(); }); }}
      onKeyDown={event => {
        if (event.key === 'Escape' && drag.current) { event.preventDefault(); finish(true); return; }
        if (!open && (event.key === 'Enter' || event.key === (side === 'left' ? 'ArrowRight' : 'ArrowLeft'))) {
          event.preventDefault(); onExpand?.(); return;
        }
        const step = (event.shiftKey ? 32 : 8) * (side === 'right' ? -1 : 1);
        const next = event.key === 'ArrowLeft' ? width - step : event.key === 'ArrowRight' ? width + step
          : event.key === 'Home' ? closedWidth : event.key === 'End' ? bounds.max : event.key === 'Enter' ? DEFAULT_WIDTH : null;
        if (next === null) return;
        event.preventDefault();
        if (next < bounds.min && onCollapse) settle(closedWidth, onCollapse);
        else { const target = Math.round(clamp(next, bounds.min, bounds.max)); settle(target, () => save(target)); }
      }} />}
  </aside>;
}
