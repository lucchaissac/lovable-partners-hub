import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type SegmentedControlSize = 'sm' | 'md';
export type SegmentedControlTone = 'light' | 'dark';

export type SegmentedControlItem = {
  value: string;
  label?: ReactNode;
  leadingIcon?: ReactNode;
  /** Render as a square icon-only button. Tightens padding so the icon visually centers in a square. */
  iconOnly?: boolean;
  disabled?: boolean;
};

export type SegmentedControlProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  items: SegmentedControlItem[];
  value: string;
  onChange: (value: string) => void;
  size?: SegmentedControlSize;
  /** `dark` rescopes the surface tokens locally — black track, dark active
   *  card, white-on-black labels. Same spacing as the default light variant. */
  tone?: SegmentedControlTone;
  /** Add a label-width underline to the selected pill. */
  variant?: 'default' | 'underline';
  /** Fade clipped content in OKLCH onto the unchanged track surface, instead of ellipsis truncation. */
  fadeOverflow?: boolean;
  /** Equal-width slots in a horizontally scrollable track. Size the track in its parent. */
  visibleItems?: number;
  /** Scroll content-sized items inside the width supplied by the parent. */
  scrollable?: boolean;
  /** Slide one shared selection surface between items, with subtle hover attraction. */
  animateSelection?: boolean;
};

export const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(
  function SegmentedControl(
    { items, value, onChange, size = 'md', tone = 'light', variant = 'default', fadeOverflow = false, visibleItems, scrollable: scrollableProp = false, animateSelection = false, className, style, onKeyDown, onPointerLeave, ...props },
    ref,
  ) {
    const root = useRef<HTMLDivElement>(null);
    const viewport = useRef<HTMLDivElement>(null);
    const current = useRef<HTMLSpanElement>(null);
    const currentPosition = useRef<{ value: string; left: number; width: number } | null>(null);
    const motionRevision = useRef(0);
    useImperativeHandle(ref, () => root.current!);
    const equalItems = visibleItems != null && visibleItems > 0;
    const scrollable = scrollableProp || equalItems;
    useLayoutEffect(() => {
      const track = viewport.current ?? root.current;
      if (!track || !scrollable) return;
      // Reveal only inside this track, without scrolling the surrounding page.
      const reveal = () => {
        const active = track.querySelector<HTMLButtonElement>('[aria-selected="true"]');
        if (!active) return;
        const viewport = track.getBoundingClientRect();
        const item = active.getBoundingClientRect();
        const inset = fadeOverflow ? 24 : 2;
        // Preview frames can be scaled; scrollLeft is always in unscaled CSS pixels.
        const scale = viewport.width / track.offsetWidth || 1;
        const left = (item.left - viewport.left) / scale;
        const right = (item.right - viewport.left) / scale;
        if (left < inset) track.scrollLeft += left - inset;
        else if (right > track.clientWidth - inset) track.scrollLeft += right - track.clientWidth + inset;
      };
      reveal();
      const observer = new ResizeObserver(reveal);
      observer.observe(track);
      return () => observer.disconnect();
    }, [value, scrollable, fadeOverflow]);
    useLayoutEffect(() => {
      const track = viewport.current ?? root.current;
      const surface = root.current;
      if (!track || !surface || !fadeOverflow) return;
      const labels = Array.from(track.querySelectorAll<HTMLElement>('.ui-segmented-label-text'));
      const update = () => {
        surface.toggleAttribute('data-overflow-start', track.scrollLeft > 1);
        surface.toggleAttribute('data-overflow-end', track.scrollWidth - track.clientWidth - track.scrollLeft > 1);
        labels.forEach(label => label.toggleAttribute('data-truncated', label.scrollWidth > label.clientWidth + 1));
      };
      update();
      const observer = new ResizeObserver(update);
      observer.observe(track);
      labels.forEach(label => observer.observe(label));
      track.addEventListener('scroll', update, { passive: true });
      return () => { observer.disconnect(); track.removeEventListener('scroll', update); };
    }, [items, fadeOverflow]);
    useLayoutEffect(() => {
      const surface = root.current;
      const track = viewport.current;
      const indicator = current.current;
      if (!animateSelection) {
        currentPosition.current = null;
        motionRevision.current++;
        surface?.removeAttribute('data-current-ready');
        surface?.removeAttribute('data-current-moving');
        return;
      }
      if (!surface || !track || !indicator) return;
      const measure = () => {
        const active = track.querySelector<HTMLButtonElement>('[aria-selected="true"]');
        if (!active || !track.offsetWidth) return;
        const bounds = track.getBoundingClientRect();
        const item = active.getBoundingClientRect();
        const scale = bounds.width / track.offsetWidth || 1;
        const next = { value, left: (item.left - bounds.left) / scale + track.scrollLeft, width: item.width / scale };
        const previous = currentPosition.current;
        if (previous?.value === value && Math.abs(previous.left - next.left) < .1 && Math.abs(previous.width - next.width) < .1) return;
        currentPosition.current = next;
        if (previous && previous.value !== value) surface.setAttribute('data-current-moving', '');
        indicator.style.left = `${next.left}px`;
        indicator.style.width = `${next.width}px`;
        // The first measurement is placed immediately. Later measurements use
        // the same duration/easing as the editor's Internal / Editor / Shared pill.
        const animations = indicator.getAnimations();
        surface.setAttribute('data-current-ready', '');
        const revision = ++motionRevision.current;
        if (!animations.length) surface.removeAttribute('data-current-moving');
        else void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
          if (surface.isConnected && motionRevision.current === revision) surface.removeAttribute('data-current-moving');
        });
      };
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(track);
      track.querySelectorAll('button').forEach(button => observer.observe(button));
      return () => { observer.disconnect(); };
    }, [animateSelection, items, value]);
    const clearAttraction = () => {
      root.current?.style.removeProperty('--ui-segmented-hover-attraction');
      root.current?.style.removeProperty('--ui-segmented-hover-stretch');
    };
    const attract = (button: HTMLButtonElement) => {
      const track = viewport.current;
      const active = track?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
      if (!animateSelection || !track || !active) return;
      const from = active.getBoundingClientRect();
      const to = button.getBoundingClientRect();
      const scale = track.getBoundingClientRect().width / track.offsetWidth || 1;
      const distance = (to.left + to.width / 2 - from.left - from.width / 2) / scale;
      const attraction = Math.max(-4, Math.min(4, distance * .025));
      root.current?.style.setProperty('--ui-segmented-hover-attraction', `${attraction / 2}px`);
      root.current?.style.setProperty('--ui-segmented-hover-stretch', `${1 + Math.abs(attraction) / (from.width / scale || 1)}`);
    };
    const buttons = items.map((item) => {
      const active = item.value === value;
      const iconOnly = item.iconOnly || (item.label == null && item.leadingIcon != null);
      return (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={active}
          tabIndex={scrollable ? (active ? 0 : -1) : undefined}
          title={scrollable && typeof item.label === 'string' ? item.label : undefined}
          data-state={active ? 'active' : undefined}
          data-disabled={item.disabled ? '' : undefined}
          data-icon-only={iconOnly ? '' : undefined}
          disabled={item.disabled}
          onPointerEnter={event => { if (!item.disabled && event.pointerType !== 'touch') attract(event.currentTarget); }}
          onClick={() => { clearAttraction(); if (!item.disabled) onChange(item.value); }}
          className="ui-segmented-item"
        >
          {item.leadingIcon && (
            <span className="ui-segmented-item-icon">{item.leadingIcon}</span>
          )}
          {item.label != null && <span className="ui-segmented-label" style={iconOnly ? { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' } : undefined}><span className="ui-segmented-label-text">{item.label}</span></span>}
        </button>
      );
    });
    return (
      <div
        ref={root}
        role="tablist"
        data-size={size}
        data-tone={tone}
        data-variant={variant}
        data-scrollable={scrollable || undefined}
        data-equal-items={equalItems || undefined}
        data-fade-overflow={fadeOverflow || undefined}
        data-animated={animateSelection || undefined}
        className={cn('ui-segmented', className)}
        style={{ '--ui-segmented-visible-items': visibleItems, ...style } as CSSProperties}
        onPointerLeave={event => { clearAttraction(); onPointerLeave?.(event); }}
        onKeyDown={event => {
          onKeyDown?.(event);
          if (event.defaultPrevented || !scrollable || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'));
          const current = buttons.indexOf(event.target as HTMLButtonElement);
          if (current < 0) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next]?.focus({ preventScroll: true });
          buttons[next]?.click();
        }}
        {...props}
      >
        {fadeOverflow || animateSelection ? <div ref={viewport} className="ui-segmented-viewport">
          {animateSelection && <span ref={current} className="ui-segmented-current" aria-hidden="true"><span className="ui-segmented-current-surface" /></span>}
          {buttons}
        </div> : buttons}
      </div>
    );
  },
);
