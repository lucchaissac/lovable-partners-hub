import { useEffect, useRef, useState } from 'react';
import type { PointerEventHandler } from 'react';

type Point = { x: number; y: number };
type Bounds = { top: number; bottom: number; left: number; right: number };
type Corridor = [Point, Point, Point];

/** Triangle from the last trigger position to the submenu's two near corners. */
export function getSubmenuCorridor(origin: Point, menu: Bounds): Corridor | null {
  const direction = origin.x < menu.left ? 1 : origin.x > menu.right ? -1 : 0;
  if (!direction) return null;
  // A small buffer forgives pointer jitter and the menu's rounded corners.
  const endX = (direction === 1 ? menu.left : menu.right) + direction * 8;
  return [{ x: origin.x - direction * 8, y: origin.y }, { x: endX, y: menu.top - 8 }, { x: endX, y: menu.bottom + 8 }];
}

export function isWithinSubmenuCorridor(point: Point, origin: Point, menu: Bounds) {
  const corridor = getSubmenuCorridor(origin, menu);
  if (!corridor) return false;
  const [start, upper, lower] = corridor;
  const progress = (point.x - start.x) / (upper.x - start.x);
  if (progress < 0 || progress > 1) return false;
  const top = start.y + (upper.y - start.y) * progress;
  const bottom = start.y + (lower.y - start.y) * progress;
  return point.y >= top && point.y <= bottom;
}

/** Preserve a flyout while crossing sibling rows on the way to its contents. */
export function useSubmenuHover(open: boolean, onOpenChange: (open: boolean) => void, visualize = false) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const origin = useRef<Point | null>(null);
  const [inTransit, setInTransit] = useState(false);
  const [corridor, setCorridor] = useState<Corridor | null>(null);

  useEffect(() => {
    if (!open) { origin.current = null; setInTransit(false); setCorridor(null); return; }
    const updateCorridor = () => {
      if (!visualize) return;
      const bounds = menuRef.current?.getBoundingClientRect();
      setCorridor(origin.current && bounds ? getSubmenuCorridor(origin.current, bounds) : null);
    };
    updateCorridor();
    const close = () => { origin.current = null; setInTransit(false); if (visualize) setCorridor(null); onOpenChange(false); };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const target = event.target as Node;
      const point = { x: event.clientX, y: event.clientY };
      if (triggerRef.current?.contains(target)) {
        origin.current = point; setInTransit(false); updateCorridor(); return;
      }
      if (menuRef.current?.contains(target)) {
        origin.current = null; setInTransit(false); updateCorridor(); return;
      }
      const bounds = menuRef.current?.getBoundingClientRect();
      if (origin.current && bounds && isWithinSubmenuCorridor(point, origin.current, bounds)) {
        setInTransit(true);
        updateCorridor();
        // The whole corridor is safe, including pauses over sibling rows.
        // Keep it open until the pointer actually leaves this area.
        return;
      }
      close();
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', close);
    window.addEventListener('blur', close);
    // Only the explanatory overlay needs to be cleared when its viewport moves.
    if (visualize) { window.addEventListener('scroll', close, true); window.addEventListener('resize', close); }
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', close);
      window.removeEventListener('blur', close);
      if (visualize) { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); }
    };
  }, [open, onOpenChange, visualize]);

  const onTriggerEnter: PointerEventHandler<HTMLButtonElement> = event => {
    if (event.pointerType !== 'mouse') return;
    origin.current = { x: event.clientX, y: event.clientY };
    onOpenChange(true);
  };
  return { triggerRef, menuRef, onTriggerEnter, inTransit, corridor };
}
