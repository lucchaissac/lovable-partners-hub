import { Icon } from './Icon';
import { Button } from './Button';
import { Tooltip } from './Tooltip';
import { createContext, forwardRef, useContext, useState } from 'react';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from 'react';
import { cn } from '../lib/cn';

// ============================================================
// Tabs — composable primitives.
//
// Two flavors:
// 1. Composable: <Tabs value/onValueChange> + <TabsList> + <TabsTrigger value>
// 2. SimpleTabs — items list shape
// ============================================================

type TabsCtx = {
  value: string;
  onValueChange?: (v: string) => void;
};
const Ctx = createContext<TabsCtx | null>(null);

export type TabsVariant = 'underline' | 'chip' | 'card';

export type TabsProps = HTMLAttributes<HTMLDivElement> & {
  value: string;
  onValueChange?: (v: string) => void;
  variant?: TabsVariant;
};

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  { className, value, onValueChange, variant = 'underline', ...props },
  ref,
) {
  return (
    <Ctx.Provider value={{ value, onValueChange }}>
      <div
        ref={ref}
        data-variant={variant}
        className={cn('ui-tabs', className)}
        {...props}
      />
    </Ctx.Provider>
  );
});

export type TabsListProps = HTMLAttributes<HTMLDivElement>;
export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(function TabsList(
  { className, style, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role="tablist"
      className={className}
      style={{ display: 'contents', ...style }}
      {...props}
    />
  );
});

/** Wrap a tab and its sibling actions without nesting interactive buttons. */
export const TabsItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function TabsItem(
  { className, ...props }, ref,
) {
  return <div ref={ref} className={cn('ui-tab-item', className)} {...props} />;
});

export type TabsVisibilityToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label: string;
  visible: boolean;
  onVisibilityChange: (visible: boolean) => void;
};

/** Sibling of TabsTrigger inside TabsItem. Hidden pages remain discoverable at rest. */
export const TabsVisibilityToggle = forwardRef<HTMLButtonElement, TabsVisibilityToggleProps>(function TabsVisibilityToggle(
  { className, label, visible, onVisibilityChange, onClick, ...props }, ref,
) {
  const action = visible ? 'Hide page' : 'Show page';
  return <Tooltip label={action} side="bottom"><Button ref={ref} variant="ghost" size="sm"
    className={cn('ui-tab-visibility', className)} data-page-hidden={!visible}
    aria-label={`${action}: ${label}`} leadingIcon={<Icon name={visible ? 'eye' : 'eye-off'} size={16} />}
    onClick={event => { event.stopPropagation(); onClick?.(event); if (!event.defaultPrevented) onVisibilityChange(!visible); }}
    {...props} /></Tooltip>;
});

export type TabsTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(function TabsTrigger(
  { className, value, onClick, children, ...props },
  ref,
) {
  const ctx = useContext(Ctx);
  const active = ctx?.value === value;
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={active}
      data-value={value}
      data-state={active ? 'active' : 'inactive'}
      className={cn('ui-reset', 'ui-tab', className)}
      onClick={(e) => {
        onClick?.(e);
        ctx?.onValueChange?.(value);
      }}
      {...props}
    >
      {children}
    </button>
  );
});

/** Slot for a leading icon inside a TabsTrigger.
 *  Pass `background` (and optionally `color`) to render the icon inside a small
 *  rounded colored container — used by the card variant for page-level navigation. */
export type TabsTriggerIconProps = {
  children: ReactNode;
  color?: string;
  background?: string;
};
export const TabsTriggerIcon = ({ children, color, background }: TabsTriggerIconProps) => {
  const filled = background != null;
  return (
    <span
      className="ui-tab-leading"
      data-tone={filled ? 'filled' : undefined}
      style={filled || color ? { color, background } : undefined}
    >
      {children}
    </span>
  );
};

/** Close button rendered inside a TabsTrigger. Stops click propagation. */
export type TabsTriggerCloseProps = ButtonHTMLAttributes<HTMLButtonElement>;
export const TabsTriggerClose = forwardRef<HTMLButtonElement, TabsTriggerCloseProps>(
  function TabsTriggerClose({ className, onClick, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label="Close tab"
        className={cn('ui-reset', 'ui-tab-close', className)}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        {...props}
      >
        <CloseIcon />
      </button>
    );
  },
);

function CloseIcon({ size = 10 }: { size?: number }) {
  return (
    <Icon name="x" size={size} />
  );
}

/** Drag-handle slot rendered inside a TabsTrigger when the parent SimpleTabs is `reorderable`.
 *  Decorative — actual drag is initiated on the tab button via HTML5 D&D. */
export type TabsTriggerHandleProps = HTMLAttributes<HTMLSpanElement>;
export const TabsTriggerHandle = forwardRef<HTMLSpanElement, TabsTriggerHandleProps>(
  function TabsTriggerHandle({ className, ...props }, ref) {
    return (
      <span ref={ref} aria-hidden className={cn('ui-tab-handle', className)} {...props}>
        <DragHandleIcon />
      </span>
    );
  },
);

function DragHandleIcon() {
  return (
    <Icon name="grip-vertical" size={12} />
  );
}

export type TabsAddProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Reflects open-state when used as a `DropdownMenuTrigger` child. */
  active?: boolean;
};
export const TabsAdd = forwardRef<HTMLButtonElement, TabsAddProps>(function TabsAdd(
  { className, children, active, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      data-variant="add"
      data-active={active ? '' : undefined}
      className={cn('ui-reset', 'ui-tab', className)}
      {...props}
    >
      <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
      <span>{children ?? 'Add view'}</span>
    </button>
  );
});

// ============================================================
// SimpleTabs — convenience wrapper (underline variant)
// ============================================================

export type TabItem = {
  id: string;
  label: ReactNode;
  leadingIcon?: ReactNode;
  /** Icon foreground color (any CSS color, including Asset token vars). */
  iconColor?: string;
  /** Icon container background tint. When set, the icon renders inside a
   *  small rounded container — the "card variant with icons" treatment. */
  iconBackground?: string;
  /** Excludes this tab from drag-reorder and remove actions. Use for system
   *  tabs that must keep their position (e.g. "Home" or default views). */
  locked?: boolean;
  /** Per-tab override of the global `removable` prop. Set `false` to keep
   *  this tab non-removable even when management mode is on. */
  removable?: boolean;
};

export type SimpleTabsProps = {
  items: TabItem[];
  activeId: string;
  onSelect?: (id: string) => void;
  onAdd?: () => void;
  addLabel?: ReactNode;
  /** Replace the internal "Add" button. Use this when the consumer needs to
   *  wrap it in a richer trigger (e.g. a DropdownMenu). When provided, both
   *  `onAdd` and `addLabel` are ignored. */
  addElement?: ReactNode;
  variant?: TabsVariant;
  /** Enable drag-to-reorder. Tabs marked `locked` are not draggable. */
  reorderable?: boolean;
  /** Enable per-tab remove buttons (revealed on hover/focus). Per-tab
   *  `removable: false` overrides; `locked` excludes the tab. */
  removable?: boolean;
  /** Fired on drop. The consumer should place `fromId` immediately before
   *  `toId` in the new order and pass the updated `items` back. */
  onReorder?: (fromId: string, toId: string) => void;
  /** Fired when a tab's remove button is clicked or activated. */
  onRemove?: (id: string) => void;
};

export function SimpleTabs({
  items,
  activeId,
  onSelect,
  onAdd,
  addLabel = 'Add view',
  addElement,
  variant = 'underline',
  reorderable = false,
  removable = false,
  onReorder,
  onRemove,
}: SimpleTabsProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const managed = reorderable || removable;

  return (
    <Tabs value={activeId} onValueChange={onSelect} variant={variant}>
      <TabsList>
        {items.map((it) => {
          const canDrag = reorderable && !it.locked;
          const canRemove = (it.removable ?? removable) && !it.locked;
          return (
            <TabsTrigger
              key={it.id}
              value={it.id}
              data-managed={managed ? '' : undefined}
              draggable={canDrag || undefined}
              data-dragging={draggingId === it.id ? '' : undefined}
              data-drop-target={
                overId === it.id && draggingId != null && draggingId !== it.id
                  ? ''
                  : undefined
              }
              onDragStart={
                canDrag
                  ? (e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', it.id);
                      setDraggingId(it.id);
                    }
                  : undefined
              }
              onDragOver={
                canDrag
                  ? (e) => {
                      if (draggingId == null || draggingId === it.id) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setOverId(it.id);
                    }
                  : undefined
              }
              onDragLeave={
                canDrag
                  ? () => setOverId((prev) => (prev === it.id ? null : prev))
                  : undefined
              }
              onDrop={
                canDrag
                  ? (e) => {
                      e.preventDefault();
                      const fromId =
                        e.dataTransfer.getData('text/plain') || draggingId;
                      setDraggingId(null);
                      setOverId(null);
                      if (fromId && fromId !== it.id) onReorder?.(fromId, it.id);
                    }
                  : undefined
              }
              onDragEnd={
                canDrag
                  ? () => {
                      setDraggingId(null);
                      setOverId(null);
                    }
                  : undefined
              }
            >
              {canDrag && <TabsTriggerHandle />}
              {it.leadingIcon && (
                <TabsTriggerIcon color={it.iconColor} background={it.iconBackground}>
                  {it.leadingIcon}
                </TabsTriggerIcon>
              )}
              <span>{it.label}</span>
              {canRemove && (
                <TabsTriggerClose
                  aria-label={`Remove ${typeof it.label === 'string' ? it.label : 'tab'}`}
                  onClick={() => onRemove?.(it.id)}
                />
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {addElement ?? (onAdd && <TabsAdd onClick={onAdd}>{addLabel}</TabsAdd>)}
    </Tabs>
  );
}

