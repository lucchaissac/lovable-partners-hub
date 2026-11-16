import { Icon } from './Icon';
import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactElement,
  ReactNode,
} from 'react';
import { cn } from '../lib/cn';
import { SearchInput } from './Input';

// ============================================================
// DropdownMenu — composable primitives
// ============================================================

type MenuCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLElement | null>;
};
const Ctx = createContext<MenuCtx | null>(null);

function useMenuCtx() {
  const c = useContext(Ctx);
  if (!c) throw new Error('DropdownMenu primitives must be inside <DropdownMenu>');
  return c;
}

export type DropdownMenuProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Anchor an existing control without adding a wrapper around it. */
  anchorRef?: React.RefObject<HTMLElement | null>;
};

export function DropdownMenu({
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  anchorRef,
}: DropdownMenuProps) {
  const [internal, setInternal] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internal;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternal(v);
    onOpenChange?.(v);
  };
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const insideEvent = useRef<PointerEvent | null>(null);

  useEffect(() => {
    if (!open) return;
    let disposed = false;
    const onDoc = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || anchorRef?.current?.contains(t) || contentRef.current?.contains(t)) return;
      // Canvas selection prevents the subsequent mouse event. Capture the pointer
      // first, then let React mark clicks in nested portaled menus as inside.
      setTimeout(() => { if (!disposed && insideEvent.current !== e) setOpen(false); }, 0);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc, true);
    document.addEventListener('keydown', onKey);
    return () => {
      disposed = true;
      document.removeEventListener('pointerdown', onDoc, true);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Ctx.Provider value={{ open, setOpen, contentRef, triggerRef: anchorRef || rootRef }}>
      <div ref={rootRef} className="ui-dropdown-root" onPointerDownCapture={event => { insideEvent.current = event.nativeEvent; }}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export type DropdownMenuTriggerProps = {
  children: ReactElement<{
    onClick?: (e: React.MouseEvent) => void;
    active?: boolean;
  }>;
};

export function DropdownMenuTrigger({ children }: DropdownMenuTriggerProps) {
  const ctx = useMenuCtx();
  if (!isValidElement(children)) return children;

  const childOnClick = (children.props as { onClick?: (e: React.MouseEvent) => void }).onClick;

  return cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      childOnClick?.(e);
      ctx.setOpen(!ctx.open);
    },
    active: ctx.open,
  });
}

export type DropdownMenuContentProps = HTMLAttributes<HTMLDivElement> & {
  side?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  width?: number | string;
  /** Fit within 180–320px bounds; 'content' removes the minimum for short action menus. Defaults on when width is omitted. */
  fit?: boolean | 'content';
  /** Use the available viewport height and shift long menus away from its edges. */
  fitViewport?: boolean;
};

export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  function DropdownMenuContent(
    { className, side = 'bottom', align = 'start', width, fit = width === undefined, fitViewport = false, style, children, ...props },
    ref,
  ) {
    const ctx = useMenuCtx();
    const [pos, setPos] = useState<{
      top: number | 'auto';
      left: number | 'auto';
      right: number | 'auto';
      bottom: number | 'auto';
    }>({ top: 0, left: 0, right: 'auto', bottom: 'auto' });
    const [effectiveSide, setEffectiveSide] = useState<'top' | 'bottom'>(side);

    useLayoutEffect(() => {
      if (!ctx.open) return;
      const trigger = ctx.triggerRef.current;
      if (!trigger) return;
      const update = () => {
        const r = trigger.getBoundingClientRect();
        // Auto-flip: if the requested side doesn't have room and the
        // opposite side has more, flip there. Use the measured content
        // height when available, fall back to a 240px estimate so the
        // first paint already sits on the right side.
        const measured = ctx.contentRef.current?.getBoundingClientRect().height ?? 0;
        const need = (measured > 0 ? measured : 240) + 8;
        const spaceBelow = window.innerHeight - r.bottom;
        const spaceAbove = r.top;
        let resolved: 'top' | 'bottom' = side;
        if (side === 'bottom' && spaceBelow < need && spaceAbove > spaceBelow) {
          resolved = 'top';
        } else if (side === 'top' && spaceAbove < need && spaceBelow > spaceAbove) {
          resolved = 'bottom';
        }
        setEffectiveSide(resolved);
        const contentWidth = ctx.contentRef.current?.offsetWidth ?? r.width;
        const centeredLeft = Math.max(8, Math.min(r.left + (r.width - contentWidth) / 2, window.innerWidth - contentWidth - 8));
        if (fitViewport) {
          // When neither side fits, let the menu extend past the trigger
          // rather than cutting its list at an arbitrary fixed height.
          const top = resolved === 'bottom' ? r.bottom + 4 : r.top - measured - 4;
          const left = align === 'center' ? centeredLeft : align === 'start' ? r.left : r.right - contentWidth;
          setPos({
            top: Math.max(8, Math.min(top, window.innerHeight - measured - 8)),
            left: Math.max(8, Math.min(left, window.innerWidth - contentWidth - 8)),
            right: 'auto',
            bottom: 'auto',
          });
          return;
        }
        setPos({
          top: resolved === 'bottom' ? r.bottom + 4 : 'auto',
          bottom: resolved === 'top' ? window.innerHeight - r.top + 4 : 'auto',
          left: align === 'center' ? centeredLeft : align === 'start' ? r.left : 'auto',
          right: align === 'end' ? window.innerWidth - r.right : 'auto',
        });
      };
      update();
      // Re-measure once the content is in the DOM so the flip uses the
      // real height, not the estimate.
      const raf = requestAnimationFrame(update);
      const observer = fitViewport && ctx.contentRef.current ? new ResizeObserver(update) : null;
      if (observer && ctx.contentRef.current) observer.observe(ctx.contentRef.current);
      window.addEventListener('scroll', update, true);
      window.addEventListener('resize', update);
      return () => {
        cancelAnimationFrame(raf);
        observer?.disconnect();
        window.removeEventListener('scroll', update, true);
        window.removeEventListener('resize', update);
      };
    }, [ctx.open, side, align, fitViewport]);

    if (!ctx.open) return null;
    const setRefs = (node: HTMLDivElement | null) => {
      ctx.contentRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };
    const w = typeof width === 'number' ? `${width}px` : width;
    const node = (
      <div
        ref={setRefs}
        className={cn('ui-dropdown-content', className)}
        data-side={effectiveSide}
        data-align={align}
        data-fit={fit || undefined}
        style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          right: pos.right,
          bottom: pos.bottom,
          ...(!fit ? { minWidth: w } : {}),
          ...(fitViewport ? { display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 16px)' } as const : {}),
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
    return createPortal(node, document.body);
  },
);

export type DropdownMenuItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  closeOnSelect?: boolean;
  disabled?: boolean;
};

export const DropdownMenuItem = forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  function DropdownMenuItem(
    { className, closeOnSelect = true, disabled, onClick, children, ...props },
    ref,
  ) {
    const ctx = useMenuCtx();
    return (
      <button
        ref={ref}
        type="button"
        role="menuitem"
        data-disabled={disabled ? '' : undefined}
        className={cn('ui-reset', 'ui-dropdown-item', className)}
        onClick={(e) => {
          if (disabled) return;
          onClick?.(e);
          if (closeOnSelect) ctx.setOpen(false);
        }}
        {...props}
      >
        {children}
      </button>
    );
  },
);

export type DropdownMenuCheckboxItemProps = Omit<DropdownMenuItemProps, 'closeOnSelect'> & {
  checked?: boolean;
};

export const DropdownMenuCheckboxItem = forwardRef<HTMLButtonElement, DropdownMenuCheckboxItemProps>(
  function DropdownMenuCheckboxItem({ checked, children, ...props }, ref) {
    return (
      <DropdownMenuItem ref={ref} closeOnSelect={false} {...props}>
        <span className="ui-checkbox" data-state={checked ? 'on' : 'off'} aria-hidden>
          {checked && (
            <Icon name="check" size={10} color="white" />
          )}
        </span>
        {children}
      </DropdownMenuItem>
    );
  },
);

export const DropdownMenuSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function DropdownMenuSeparator({ className, ...props }, ref) {
    return <div ref={ref} className={cn('ui-dropdown-separator', className)} {...props} />;
  },
);

export const DropdownMenuLabel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function DropdownMenuLabel({ className, ...props }, ref) {
    return <div ref={ref} className={cn('ui-dropdown-label', className)} {...props} />;
  },
);

export type DropdownMenuSearchProps = InputHTMLAttributes<HTMLInputElement> & {
  autoFocusOnOpen?: boolean;
};

export const DropdownMenuSearch = forwardRef<HTMLInputElement, DropdownMenuSearchProps>(
  function DropdownMenuSearch(
    { autoFocusOnOpen = true, className, placeholder = 'Search…', ...props },
    ref,
  ) {
    const ctx = useMenuCtx();
    const innerRef = useRef<HTMLInputElement | null>(null);
    useEffect(() => {
      if (ctx.open && autoFocusOnOpen) {
        requestAnimationFrame(() => innerRef.current?.focus());
      }
    }, [ctx.open, autoFocusOnOpen]);
    const setRefs = (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    };
    return (
      <SearchInput
        ref={setRefs}
        variant="embedded"
        placeholder={placeholder}
        className={className}
        {...props}
      />
    );
  },
);

export type DropdownMenuListProps = HTMLAttributes<HTMLDivElement>;
/** Fixed create/action area between the search input and scrolling results. */
export const DropdownMenuPinned = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function DropdownMenuPinned({ className, ...props }, ref) {
    return <div ref={ref} className={cn('ui-dropdown-pinned', className)} {...props} />;
  },
);

export const DropdownMenuList = forwardRef<HTMLDivElement, DropdownMenuListProps>(
  function DropdownMenuList({ className, ...props }, ref) {
    return <div ref={ref} className={cn('ui-dropdown-list', className)} {...props} />;
  },
);

export const DropdownMenuItemIcon = ({ children }: { children: ReactNode }) => (
  <span className="ui-dropdown-item-icon">{children}</span>
);
export const DropdownMenuItemAvatar = ({ children }: { children: ReactNode }) => (
  <span className="ui-dropdown-item-avatar">{children}</span>
);
export const DropdownMenuItemLabel = ({ children }: { children: ReactNode }) => (
  <span className="ui-dropdown-item-label">{children}</span>
);
export const DropdownMenuItemShortcut = ({ children }: { children: ReactNode }) => (
  <span className="ui-dropdown-item-shortcut">{children}</span>
);

function CheckMark({ size = 12 }: { size?: number }) {
  return (
    <Icon name="check" size={size} />
  );
}

// ============================================================
// SimpleDropdown — items/value/onChange convenience wrapper.
// Exported as `Dropdown` for back-compat.
// ============================================================

export type DropdownItem =
  | {
      kind?: 'item';
      id: string;
      label: ReactNode;
      leadingIcon?: ReactNode;
      avatar?: ReactNode;
      trailingHint?: ReactNode;
      disabled?: boolean;
      /** Keep this action above the scrolling results, below search. */
      sticky?: boolean;
      /** Bypass the search filter so this item stays visible even when
       *  the query doesn't match its label. Use for permanent actions
       *  (e.g. "Add agent") that should remain reachable in empty states. */
      alwaysShow?: boolean;
    }
  | { kind: 'separator'; id?: string; alwaysShow?: boolean }
  | { kind: 'header'; id?: string; label: ReactNode; alwaysShow?: boolean };

type Common = {
  trigger: ReactElement<{ onClick?: () => void; active?: boolean }>;
  items: DropdownItem[];
  searchable?: boolean;
  placeholder?: string;
  width?: number | string;
  /** Fit within 180–320px bounds; 'content' removes the minimum for short action menus. Defaults to true. */
  fit?: boolean | 'content';
  align?: 'start' | 'center' | 'end';
  placement?: 'top' | 'bottom';
  /** Show the full menu when possible, scrolling only at the viewport limit. */
  fitViewport?: boolean;
  /** Keep the results viewport stable while filtering, or use 'auto' to show the full list without scrolling. */
  listHeight?: number | 'auto';
  heading?: ReactNode;
  emptyText?: string;
};

type Single = Common & {
  multiple?: false;
  value?: string | null;
  onChange?: (value: string) => void;
};

type Multi = Common & {
  multiple: true;
  value?: string[];
  onChange?: (value: string[]) => void;
};

export type DropdownProps = Single | Multi;

function isItemEntry(
  i: DropdownItem,
): i is Extract<DropdownItem, { kind?: 'item'; id: string }> {
  return i.kind === undefined || i.kind === 'item';
}

// Drop orphan section chrome — headers with no items below them, plus
// leading/trailing/duplicate separators. No-op for clean section structures
// like [header, item, item, separator, header, item]; only kicks in when
// filtering empties out a section.
function pruneOrphanSections(items: DropdownItem[]): DropdownItem[] {
  const out: DropdownItem[] = [];
  let pendingSeparator = false;
  let pendingHeader: DropdownItem | null = null;
  for (const it of items) {
    if (it.kind === 'separator') {
      pendingHeader = null;
      if (out.length > 0) pendingSeparator = true;
    } else if (it.kind === 'header') {
      pendingHeader = it;
    } else {
      if (pendingSeparator) {
        out.push({ kind: 'separator' });
        pendingSeparator = false;
      }
      if (pendingHeader) {
        out.push(pendingHeader);
        pendingHeader = null;
      }
      out.push(it);
    }
  }
  return out;
}

export function Dropdown(props: DropdownProps) {
  const {
    trigger,
    items,
    searchable = false,
    placeholder = 'Search…',
    width = 220,
    fit = true,
    align = 'start',
    placement = 'bottom',
    fitViewport = false,
    listHeight,
    heading,
    emptyText = 'No results',
  } = props;

  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return pruneOrphanSections(items);
    const q = query.toLowerCase();
    const matched = items.filter(
      (it) =>
        !isItemEntry(it) ||
        it.alwaysShow ||
        (typeof it.label === 'string' ? it.label.toLowerCase().includes(q) : true),
    );
    return pruneOrphanSections(matched);
  }, [items, query]);

  const isSelected = (id: string): boolean => {
    if (props.multiple) return (props.value ?? []).includes(id);
    return props.value === id;
  };

  const choose = (id: string) => {
    if (props.multiple) {
      const cur = props.value ?? [];
      const next = cur.includes(id) ? cur.filter((v) => v !== id) : [...cur, id];
      props.onChange?.(next);
    } else {
      props.onChange?.(id);
    }
  };

  // Items that match the user's query, ignoring alwaysShow actions.
  // alwaysShow items (e.g. "Add agent") shouldn't make hasResults true,
  // otherwise the empty state would never fire and "No results" would
  // never appear alongside the action.
  const realResults = filtered.filter(
    (it) => isItemEntry(it) && !it.alwaysShow,
  );
  const hasResults = realResults.length > 0;

  const renderItem = (it: DropdownItem, i: number) => {
              if (it.kind === 'separator') {
                return <DropdownMenuSeparator key={`sep-${i}`} />;
              }
              if (it.kind === 'header') {
                return <DropdownMenuLabel key={`h-${i}`}>{it.label}</DropdownMenuLabel>;
              }
              const selected = isSelected(it.id);
              if (props.multiple) {
                return (
                  <DropdownMenuCheckboxItem
                    key={it.id}
                    checked={selected}
                    disabled={it.disabled}
                    onClick={() => choose(it.id)}
                  >
                    {it.avatar && <DropdownMenuItemAvatar>{it.avatar}</DropdownMenuItemAvatar>}
                    {!it.avatar && it.leadingIcon && (
                      <DropdownMenuItemIcon>{it.leadingIcon}</DropdownMenuItemIcon>
                    )}
                    <DropdownMenuItemLabel>{it.label}</DropdownMenuItemLabel>
                    {it.trailingHint && (
                      <DropdownMenuItemShortcut>{it.trailingHint}</DropdownMenuItemShortcut>
                    )}
                  </DropdownMenuCheckboxItem>
                );
              }
              return (
                <DropdownMenuItem
                  key={it.id}
                  disabled={it.disabled}
                  onClick={() => choose(it.id)}
                >
                  {it.avatar && <DropdownMenuItemAvatar>{it.avatar}</DropdownMenuItemAvatar>}
                  {!it.avatar && it.leadingIcon && (
                    <DropdownMenuItemIcon>{it.leadingIcon}</DropdownMenuItemIcon>
                  )}
                  <DropdownMenuItemLabel>{it.label}</DropdownMenuItemLabel>
                  {it.trailingHint && (
                    <DropdownMenuItemShortcut>{it.trailingHint}</DropdownMenuItemShortcut>
                  )}
                  {selected && (
                    <DropdownMenuItemIcon>
                      <CheckMark />
                    </DropdownMenuItemIcon>
                  )}
                </DropdownMenuItem>
              );
            };
  const pinned = filtered.filter(it => (!it.kind || it.kind === 'item') && it.sticky);
  const scrolling = filtered.filter(it => !((!it.kind || it.kind === 'item') && it.sticky));

  return (
    <DropdownMenu onOpenChange={(o) => !o && setQuery('')}>
      <DropdownMenuTrigger>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side={placement} align={align} width={width} fit={fit} fitViewport={fitViewport}>
        {searchable && (
          <DropdownMenuSearch
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
          />
        )}
        {!searchable && heading && <DropdownMenuLabel>{heading}</DropdownMenuLabel>}
        {pinned.length > 0 && <DropdownMenuPinned>{pinned.map(renderItem)}</DropdownMenuPinned>}
        <DropdownMenuList style={fitViewport ? { height: 'auto', maxHeight: 'none', minHeight: 0, overflowY: 'auto' } : listHeight === undefined ? undefined : listHeight === 'auto'
          ? { height: 'auto', maxHeight: 'none', overflowY: 'visible' }
          : { height: listHeight, maxHeight: 'calc(100vh - 100px)' }}>
          {!hasResults && filtered.length === 0 && (
            <div className="ui-dropdown-empty">{emptyText}</div>
          )}
          {scrolling.map(renderItem)}
        </DropdownMenuList>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
