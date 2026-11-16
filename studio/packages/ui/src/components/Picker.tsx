import { useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { cn } from '../lib/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './Dropdown';
import { SearchInput } from './Input';

// ============================================================
// Picker — a richer dropdown picker built on the DropdownMenu
// primitives. Supports a search input, multiple titled columns of
// items, optional per-item Edit action, and a footer action row.
//
// Consumers describe items declaratively via PickerColumn[]; the
// component handles search, layout, anchoring, focus and outside-
// click behavior. Use this for view pickers, project pickers,
// template pickers, or any "pick from a structured list" surface.
// ============================================================

export type PickerItem = {
  id: string;
  label: ReactNode;
  /** Secondary line shown beneath the label (e.g. owner, ts, hint). */
  description?: ReactNode;
  /** Square icon shown to the left. Tinted with `iconColor` when set. */
  leadingIcon?: ReactNode;
  /** Tints the leadingIcon container background and the glyph color. */
  iconColor?: string;
  /** Avatar shown in place of `leadingIcon`. Takes precedence over icon. */
  avatar?: ReactNode;
  /** Small avatar rendered next to `leadingIcon`, before the label.
   *  Use this for ownership / creator hints (pass an Avatar with
   *  `tooltip` to surface the creator name on hover). */
  metaAvatar?: ReactNode;
  /** Reveals an "Edit" affordance on hover; calls Picker.onEdit. */
  editable?: boolean;
  disabled?: boolean;
};

export type PickerColumn = {
  id: string;
  label: ReactNode;
  items: PickerItem[];
  /** Shown when the column has no matching items. */
  emptyText?: string;
};

export type PickerFooter = {
  label: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
};

export type PickerProps = {
  trigger: ReactElement<{ onClick?: () => void; active?: boolean }>;
  columns: PickerColumn[];
  searchPlaceholder?: string;
  /** Shown when search returns no items across every column. */
  emptyText?: string;
  footer?: PickerFooter;
  /** Marks one item as the current selection across all columns. */
  selectedId?: string;
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
  align?: 'start' | 'end';
  side?: 'top' | 'bottom';
  /** Width of the popover. Default 680px. */
  width?: number | string;
  /** Optional className applied to the popover content root. */
  className?: string;
};

function tint(color: string, pct: number) {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

export function Picker({
  trigger,
  columns,
  searchPlaceholder = 'Search…',
  emptyText = 'No results',
  footer,
  selectedId,
  onSelect,
  onEdit,
  align = 'start',
  side = 'bottom',
  width = 680,
  className,
}: PickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return columns;
    return columns.map((col) => ({
      ...col,
      items: col.items.filter((it) =>
        typeof it.label === 'string' ? it.label.toLowerCase().includes(q) : true,
      ),
    }));
  }, [columns, query]);

  const empty = filtered.every((c) => c.items.length === 0);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery('');
      }}
    >
      <DropdownMenuTrigger>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align={align}
        width={width}
        fit={false}
        className={cn('ui-picker', className)}
      >
        <SearchInput
          autoFocus
          variant="embedded"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {empty ? (
          <div className="ui-picker-empty">{emptyText}</div>
        ) : (
          <div className="ui-picker-columns" data-cols={columns.length}>
            {filtered.map((col) => (
              <div key={col.id} className="ui-picker-column">
                <div className="ui-picker-col-label">{col.label}</div>
                <div className="ui-picker-col-list">
                  {col.items.length === 0 ? (
                    <div className="ui-picker-col-empty">
                      {col.emptyText ?? 'No items'}
                    </div>
                  ) : (
                    col.items.map((item) => (
                      <PickerRow
                        key={item.id}
                        item={item}
                        active={item.id === selectedId}
                        onSelect={() => {
                          if (item.disabled) return;
                          onSelect(item.id);
                          close();
                        }}
                        onEdit={
                          onEdit && item.editable
                            ? () => {
                                onEdit(item.id);
                                close();
                              }
                            : undefined
                        }
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {footer && (
          <button
            type="button"
            className="ui-picker-footer"
            onClick={() => {
              close();
              footer.onClick();
            }}
          >
            {footer.icon && (
              <span className="ui-picker-footer-icon">{footer.icon}</span>
            )}
            <span>{footer.label}</span>
          </button>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PickerRow({
  item,
  active,
  onSelect,
  onEdit,
}: {
  item: PickerItem;
  active?: boolean;
  onSelect: () => void;
  onEdit?: () => void;
}) {
  const fg = item.iconColor ?? 'var(--ui-text-muted)';
  return (
    <div
      className="ui-picker-row"
      data-active={active ? '' : undefined}
      data-disabled={item.disabled ? '' : undefined}
    >
      <button
        type="button"
        className="ui-picker-row-main"
        onClick={onSelect}
        disabled={item.disabled}
      >
        {item.avatar ? (
          <span className="ui-picker-row-avatar">{item.avatar}</span>
        ) : item.leadingIcon ? (
          <span
            className="ui-picker-row-icon"
            style={
              item.iconColor
                ? { background: tint(fg, 14), color: fg }
                : undefined
            }
          >
            {item.leadingIcon}
          </span>
        ) : null}
        {item.metaAvatar && (
          <span className="ui-picker-row-meta-avatar">{item.metaAvatar}</span>
        )}
        <span className="ui-picker-row-text">
          <span className="ui-picker-row-label">{item.label}</span>
          {item.description && (
            <span className="ui-picker-row-meta">{item.description}</span>
          )}
        </span>
      </button>
      {onEdit && (
        <button
          type="button"
          className="ui-picker-row-edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          Edit
        </button>
      )}
    </div>
  );
}

