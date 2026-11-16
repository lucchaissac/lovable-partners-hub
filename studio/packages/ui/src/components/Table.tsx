import { Icon } from './Icon';
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
  ReactNode,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { cn } from '../lib/cn';
import { Button } from './Button';
import {
  Dropdown,
  type DropdownItem,
  type DropdownProps,
} from './Dropdown';

// ============================================================
// Root <Table> — scrollable container + table element
// ============================================================

export type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  scrollShadow?: boolean;
};

export const Table = forwardRef<HTMLTableElement, TableProps>(function Table(
  { className, scrollShadow = true, children, style, ...props },
  ref,
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [shadowLeft, setShadowLeft] = useState(false);
  const [shadowRight, setShadowRight] = useState(false);
  const [stickyEdge, setStickyEdge] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setShadowLeft(el.scrollLeft > 0);
      setShadowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
      const table = tableRef.current;
      if (table) {
        const stickyCells = table.querySelectorAll<HTMLElement>('thead [data-sticky-left]');
        let edge = 0;
        stickyCells.forEach((c) => {
          const w = c.getBoundingClientRect().width;
          const left = parseFloat((c as HTMLElement).style.left || '0') || 0;
          edge = Math.max(edge, left + w);
        });
        setStickyEdge(edge);
      }
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (tableRef.current) ro.observe(tableRef.current);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      ro.disconnect();
    };
  }, []);

  const setTableRef = useCallback(
    (node: HTMLTableElement | null) => {
      tableRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: HTMLTableElement | null }).current = node;
    },
    [ref],
  );

  return (
    <div className="ui-table-root">
      <div ref={scrollRef} className="ui-table-scroll">
        <table
          ref={setTableRef}
          className={cn('ui-table', className)}
          style={{ tableLayout: 'fixed', ...style }}
          {...props}
        >
          {children}
        </table>
      </div>
      {scrollShadow && shadowLeft && stickyEdge > 0 && (
        <div aria-hidden className="ui-table-shadow-left" style={{ left: stickyEdge }} />
      )}
      {scrollShadow && shadowRight && <div aria-hidden className="ui-table-shadow-right" />}
    </div>
  );
});

// ============================================================
// Sub-primitives
// ============================================================

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TableHeader({ className, ...props }, ref) {
    return <thead ref={ref} className={className} {...props} />;
  },
);

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TableBody({ className, ...props }, ref) {
    return <tbody ref={ref} className={className} {...props} />;
  },
);

export const TableFooter = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TableFooter({ className, ...props }, ref) {
    return <tfoot ref={ref} className={className} {...props} />;
  },
);

export type TableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  selected?: boolean;
  active?: boolean;
};

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  { className, selected, active, onClick, ...props },
  ref,
) {
  return (
    <tr
      ref={ref}
      className={className}
      data-selected={selected || undefined}
      data-active={active || undefined}
      data-clickable={onClick ? '' : undefined}
      onClick={onClick}
      {...props}
    />
  );
});

export type TableCellProps = TdHTMLAttributes<HTMLTableCellElement> & {
  align?: 'left' | 'right' | 'center';
  stickyLeft?: number;
  stickyRight?: boolean;
  /** Mark this cell as the selection / checkbox column. Locks width,
      padding and centering to system tokens. */
  selection?: boolean;
  /** Mark this cell as the row's primary identity column. Renders at
      medium weight to anchor the row for scanning. SimpleTable applies
      this automatically to the first content column. */
  primary?: boolean;
};

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { className, align, stickyLeft, stickyRight, selection, primary, style, ...props },
  ref,
) {
  const sticky = stickyLeft !== undefined;
  const composedStyle: React.CSSProperties = {
    ...(sticky ? { left: stickyLeft } : null),
    ...(selection
      ? { width: TABLE_SELECT_COL_WIDTH, minWidth: TABLE_SELECT_COL_WIDTH, maxWidth: TABLE_SELECT_COL_WIDTH }
      : null),
    ...style,
  };
  return (
    <td
      ref={ref}
      className={className}
      data-align={align}
      data-sticky-left={sticky ? '' : undefined}
      data-sticky-right={stickyRight ? '' : undefined}
      data-select-col={selection ? '' : undefined}
      data-primary={primary ? '' : undefined}
      style={composedStyle}
      {...props}
    />
  );
});

export type TableHeadProps = ThHTMLAttributes<HTMLTableCellElement> & {
  align?: 'left' | 'right' | 'center';
  stickyLeft?: number;
  stickyRight?: boolean;
  /** Mark this header as the selection / checkbox column. Locks width,
      padding and centering to system tokens. */
  selection?: boolean;
  /** Mark this header as the row's primary identity column. Mirrors the
      `primary` flag on TableCell so the column declares itself end-to-end. */
  primary?: boolean;
};

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(function TableHead(
  { className, align, stickyLeft, stickyRight, selection, primary, style, ...props },
  ref,
) {
  const sticky = stickyLeft !== undefined;
  const composedStyle: React.CSSProperties = {
    ...(sticky ? { left: stickyLeft } : null),
    ...(selection
      ? { width: TABLE_SELECT_COL_WIDTH, minWidth: TABLE_SELECT_COL_WIDTH, maxWidth: TABLE_SELECT_COL_WIDTH }
      : null),
    ...style,
  };
  return (
    <th
      ref={ref}
      className={className}
      data-align={align}
      data-sticky-left={sticky ? '' : undefined}
      data-sticky-right={stickyRight ? '' : undefined}
      data-select-col={selection ? '' : undefined}
      data-primary={primary ? '' : undefined}
      style={composedStyle}
      {...props}
    />
  );
});

/** Width of the selection / checkbox column in pixels. Use this for
    `stickyLeft` on the column that follows the selection column to keep
    every selectable table aligned with the system rhythm. */
export const TABLE_SELECT_COL_WIDTH = 44;

// ============================================================
// TableColumnHeader — column label with optional drag handle + sort indicator.
// Pass `onSort` to render the header as a button so clicking toggles sort
// and the cell gains hover/focus affordances. Without `onSort` it renders
// as a plain span (read-only column label).
// ============================================================

export type TableColumnHeaderProps = HTMLAttributes<HTMLElement> & {
  /** Show the 6-dot drag handle on the leading edge. */
  draggable?: boolean;
  /** Show a sort indicator. 'none' renders nothing; pass 'asc' / 'desc' for arrows. */
  sort?: 'asc' | 'desc' | 'none';
  /** When provided, the header becomes a button that calls this on click. */
  onSort?: () => void;
  /** ARIA label for the sort button. Defaults to "Sort by {children}". */
  sortLabel?: string;
};

export const TableColumnHeader = forwardRef<HTMLElement, TableColumnHeaderProps>(
  function TableColumnHeader(
    { className, draggable, sort = 'none', onSort, sortLabel, children, ...props },
    ref,
  ) {
    const inner = (
      <>
        {draggable && (
          <span className="ui-th-drag" aria-hidden>
            <Icon name="grip-vertical" size={10} />
          </span>
        )}
        <span className="ui-th-label">{children}</span>
        {sort !== 'none' && (
          <span className="ui-th-sort" aria-hidden>
            <Icon name={sort === 'asc' ? 'arrow-up' : 'arrow-down'} size={10} />
          </span>
        )}
      </>
    );

    if (onSort) {
      const ariaSort = sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none';
      const buttonProps = props as ButtonHTMLAttributes<HTMLButtonElement>;
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          className={cn('ui-th-cell ui-th-cell-sortable', className)}
          aria-sort={ariaSort}
          aria-label={
            sortLabel ?? (typeof children === 'string' ? `Sort by ${children}` : undefined)
          }
          {...buttonProps}
          onClick={(e) => {
            buttonProps.onClick?.(e);
            onSort();
          }}
        >
          {inner}
        </button>
      );
    }

    return (
      <span
        ref={ref as React.Ref<HTMLSpanElement>}
        className={cn('ui-th-cell', className)}
        {...(props as HTMLAttributes<HTMLSpanElement>)}
      >
        {inner}
      </span>
    );
  },
);

// ============================================================
// TableRowActions — gray pill of actions anchored right, hover-only
// Use inside a TableCell with `stickyRight` so it stays glued to
// the right edge of the row during horizontal scroll.
// ============================================================

export type TableRowActionsProps = HTMLAttributes<HTMLDivElement> & { bare?: boolean };

export const TableRowActions = forwardRef<HTMLDivElement, TableRowActionsProps>(
  function TableRowActions({ className, bare, ...props }, ref) {
    const localRef = useRef<HTMLDivElement>(null);
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        localRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
      },
      [ref],
    );

    // The trailing sticky-right column is sized to fit the pill via the
    // `--ui-table-row-actions-w` CSS variable on the <table>. Each pill
    // contributes its measured width; the variable tracks the max so a
    // row with a wider pill defines the column. Without this, the pill
    // (positioned absolutely with right:8px) overflows leftward over
    // the previous data column.
    useEffect(() => {
      const div = localRef.current;
      const table = div?.closest('table') as HTMLTableElement | null;
      if (!div || !table) return;
      // 8px right inset of the pill inside the cell + 8px breathing room
      // before the preceding data column.
      const PAD = 16;
      const apply = (w: number) => {
        if (w <= 0) return;
        const target = w + PAD;
        const current =
          parseFloat(table.style.getPropertyValue('--ui-table-row-actions-w')) || 0;
        if (target > current) {
          table.style.setProperty('--ui-table-row-actions-w', `${target}px`);
        }
      };
      apply(Math.ceil(div.getBoundingClientRect().width));
      const ro = new ResizeObserver(([entry]) => {
        if (!entry) return;
        apply(Math.ceil(entry.contentRect.width));
      });
      ro.observe(div);
      return () => {
        ro.disconnect();
      };
    }, []);

    return (
      <div
        ref={setRefs}
        className={cn('ui-table-row-actions', className)}
        data-bare={bare ? '' : undefined}
        {...props}
      />
    );
  },
);

// ============================================================
// RowActions — high-level config-driven row CTAs
// Primary + Secondary buttons + optional overflow Dropdown.
// Renders inside the existing TableRowActions hover-fade pill.
// Use inside a <TableCell stickyRight> as the trailing column.
// ============================================================

export type RowAction = {
  label: ReactNode;
  onClick?: (e: ReactMouseEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
};

export type RowActionsProps = {
  primary?: RowAction;
  secondary?: RowAction;
  /** Items shown inside the overflow (…) dropdown. Omit to hide overflow. */
  menu?: DropdownItem[];
  /** aria-label for the overflow trigger. Default: "More actions". */
  menuLabel?: string;
  onMenuSelect?: (id: string) => void;
  /** Stop click propagation on the wrapper so row click handlers don't fire. Default true. */
  stopPropagation?: boolean;
  className?: string;
};

function OverflowIcon() {
  return (
    <Icon name="ellipsis" size={14} />
  );
}

function ActionButton({
  variant,
  action,
}: {
  variant: 'primary' | 'neutral';
  action: RowAction;
}) {
  return (
    <Button
      variant={variant}
      size="md"
      onClick={action.onClick}
      disabled={action.disabled}
      loading={action.loading}
      aria-label={action.ariaLabel}
      leadingIcon={action.leadingIcon}
    >
      {action.label}
    </Button>
  );
}

export const RowActions = forwardRef<HTMLDivElement, RowActionsProps>(
  function RowActions(
    {
      primary,
      secondary,
      menu,
      menuLabel = 'More actions',
      onMenuSelect,
      stopPropagation = true,
      className,
    },
    ref,
  ) {
    const overflow = menu !== undefined;
    return (
      <TableRowActions
        ref={ref}
        className={className}
        onClick={
          stopPropagation
            ? (e) => e.stopPropagation()
            : undefined
        }
      >
        {primary && <ActionButton variant="primary" action={primary} />}
        {secondary && <ActionButton variant="neutral" action={secondary} />}
        {overflow && (
          <Dropdown
            align="end"
            placement="bottom"
            fit="content"
            listHeight="auto"
            items={menu!}
            onChange={onMenuSelect}
            trigger={
              <Button variant="ghost" size="md" aria-label={menuLabel}>
                <OverflowIcon />
              </Button>
            }
          />
        )}
      </TableRowActions>
    );
  },
);

export type TableCaptionProps = HTMLAttributes<HTMLTableCaptionElement>;
export const TableCaption = forwardRef<HTMLTableCaptionElement, TableCaptionProps>(
  function TableCaption({ className, ...props }, ref) {
    return <caption ref={ref} className={className} {...props} />;
  },
);

// ============================================================
// Checkbox
// ============================================================

export type CheckboxState = 'on' | 'off' | 'indeterminate';
export type CheckboxShape = 'square' | 'round';

export type CheckboxProps = {
  state: CheckboxState;
  /** square for tables/forms, round for task lists. Default: square. */
  shape?: CheckboxShape;
  onToggle?: () => void;
  onPointerDown?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerEnter?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onClick?: (e: ReactMouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
  tabIndex?: number;
  className?: string;
};

export function Checkbox({
  state,
  shape = 'square',
  onToggle,
  onPointerDown,
  onPointerEnter,
  onClick,
  ariaLabel,
  tabIndex = -1,
  className,
}: CheckboxProps) {
  const checked = state === 'on';
  const indet = state === 'indeterminate';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indet ? 'mixed' : checked}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      data-state={state}
      data-shape={shape}
      className={cn('ui-checkbox', className)}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onClick={(e) => {
        onClick?.(e);
        onToggle?.();
      }}
    >
      {checked && (
        <Icon name="check" size={10} color="white" />
      )}
      {indet && (
        <Icon name="minus" size={10} color="white" />
      )}
    </button>
  );
}

// ============================================================
// useTableSelection — opt-in selection logic
// ============================================================

export type UseTableSelectionOptions = {
  ids: string[];
  value?: string[];
  defaultValue?: string[];
  onChange?: (ids: string[]) => void;
};

export function useTableSelection({
  ids,
  value,
  defaultValue,
  onChange,
}: UseTableSelectionOptions) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<Set<string>>(() => new Set(defaultValue ?? []));
  const selection = useMemo(
    () => (isControlled ? new Set(value) : internal),
    [isControlled, value, internal],
  );

  const indexById = useMemo(() => {
    const m = new Map<string, number>();
    ids.forEach((id, i) => m.set(id, i));
    return m;
  }, [ids]);

  const anchorRef = useRef<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const commit = useCallback(
    (next: Set<string>) => {
      if (!isControlled) setInternal(next);
      onChange?.(Array.from(next));
    },
    [isControlled, onChange],
  );

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(selection);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      anchorRef.current = id;
      commit(next);
    },
    [selection, commit],
  );

  const rangeTo = useCallback(
    (id: string, additive: boolean) => {
      const anchor = anchorRef.current ?? id;
      const a = indexById.get(anchor) ?? 0;
      const b = indexById.get(id) ?? 0;
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      const range = ids.slice(lo, hi + 1);
      const next = additive ? new Set(selection) : new Set<string>();
      range.forEach((r) => next.add(r));
      commit(next);
    },
    [ids, indexById, selection, commit],
  );

  const selectAll = useCallback(() => commit(new Set(ids)), [ids, commit]);
  const clear = useCallback(() => commit(new Set()), [commit]);

  const headerState: CheckboxState = useMemo(() => {
    if (selection.size === 0) return 'off';
    if (selection.size >= ids.length && ids.every((id) => selection.has(id))) return 'on';
    return 'indeterminate';
  }, [selection, ids]);

  const dragRef = useRef<{ mode: 'add' | 'remove'; touched: Set<string> } | null>(null);
  useEffect(() => {
    const end = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  const onCheckboxPointerDown = useCallback(
    (id: string, e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      const mode: 'add' | 'remove' = selection.has(id) ? 'remove' : 'add';
      dragRef.current = { mode, touched: new Set([id]) };
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [selection],
  );

  const onRowPointerEnter = useCallback(
    (id: string) => {
      const drag = dragRef.current;
      if (!drag || drag.touched.has(id)) return;
      drag.touched.add(id);
      const next = new Set(selection);
      if (drag.mode === 'add') next.add(id);
      else next.delete(id);
      commit(next);
    },
    [selection, commit],
  );

  const onCheckboxClick = useCallback(
    (id: string, e: ReactMouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (e.shiftKey) {
        e.preventDefault();
        rangeTo(id, true);
      } else {
        toggle(id);
      }
      const idx = indexById.get(id) ?? 0;
      setActiveIndex(idx);
    },
    [rangeTo, toggle, indexById],
  );

  const onRowClick = useCallback(
    (id: string, e: ReactMouseEvent<HTMLTableRowElement>) => {
      const meta = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const idx = indexById.get(id) ?? 0;
      setActiveIndex(idx);
      if (meta || shift) {
        e.preventDefault();
        if (shift) rangeTo(id, true);
        else toggle(id);
      }
    },
    [indexById, rangeTo, toggle],
  );

  const onTableKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTableElement>) => {
      if (ids.length === 0) return;
      const meta = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      if (meta && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }
      if (e.key === 'Escape') {
        if (selection.size > 0) {
          e.preventDefault();
          clear();
        }
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        const next = Math.min(ids.length - 1, Math.max(0, activeIndex + dir));
        setActiveIndex(next);
        const id = ids[next];
        if (shift) rangeTo(id, true);
        else if (!meta) anchorRef.current = id;
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        toggle(ids[activeIndex]);
      }
    },
    [ids, activeIndex, selection, selectAll, clear, rangeTo, toggle],
  );

  return {
    selection,
    isSelected: (id: string) => selection.has(id),
    activeIndex,
    headerState,
    selectAll,
    clear,
    toggle,
    onCheckboxPointerDown,
    onRowPointerEnter,
    onCheckboxClick,
    onRowClick,
    onTableKeyDown,
  };
}

export type UseTableSelection = ReturnType<typeof useTableSelection>;

// ============================================================
// SimpleTable — convenience wrapper for columns/rows API
// ============================================================

export type SimpleTableColumn<Row> = {
  id: string;
  header: ReactNode;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  cell: (row: Row) => ReactNode;
  /** Override the auto-emphasis. Defaults to `i === 0` (first column gets
      medium weight). Set `false` on a leading utility column (avatar-only,
      drag handle, status-dot-only) to skip; set `true` on a later column
      to move the anchor. */
  primary?: boolean;
};

export type SimpleTableProps<Row> = {
  columns: SimpleTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  stickyFirstColumn?: boolean;
  onRowClick?: (row: Row) => void;
  selectable?: boolean;
  selectedIds?: string[];
  defaultSelectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
};

export function SimpleTable<Row>({
  columns,
  rows,
  rowKey,
  stickyFirstColumn = false,
  onRowClick,
  selectable = false,
  selectedIds,
  defaultSelectedIds,
  onSelectionChange,
}: SimpleTableProps<Row>) {
  const ids = useMemo(() => rows.map(rowKey), [rows, rowKey]);
  const sel = useTableSelection({
    ids,
    value: selectedIds,
    defaultValue: defaultSelectedIds,
    onChange: onSelectionChange,
  });

  return (
    <Table
      tabIndex={selectable ? 0 : -1}
      onKeyDown={selectable ? sel.onTableKeyDown : undefined}
    >
      <colgroup>
        {selectable && <col style={{ width: TABLE_SELECT_COL_WIDTH }} />}
        {columns.map((c) => (
          <col
            key={c.id}
            style={{ width: typeof c.width === 'number' ? `${c.width}px` : c.width }}
          />
        ))}
      </colgroup>
      <TableHeader>
        <TableRow>
          {selectable && (
            <TableHead selection stickyLeft={0}>
              <Checkbox
                state={sel.headerState}
                ariaLabel={sel.headerState === 'on' ? 'Deselect all rows' : 'Select all rows'}
                onToggle={() => (sel.headerState === 'on' ? sel.clear() : sel.selectAll())}
              />
            </TableHead>
          )}
          {columns.map((c, i) => {
            const isSticky = stickyFirstColumn && i === 0;
            const left = selectable ? TABLE_SELECT_COL_WIDTH : 0;
            const isPrimary = c.primary ?? i === 0;
            return (
              <TableHead
                key={c.id}
                align={c.align}
                stickyLeft={isSticky ? left : undefined}
                primary={isPrimary}
              >
                <TableColumnHeader>{c.header}</TableColumnHeader>
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, rIdx) => {
          const id = rowKey(row);
          const selected = selectable && sel.isSelected(id);
          return (
            <TableRow
              key={id}
              selected={selected || undefined}
              active={selectable && rIdx === sel.activeIndex}
              onPointerEnter={selectable ? () => sel.onRowPointerEnter(id) : undefined}
              onClick={(e) => {
                if (selectable) sel.onRowClick(id, e);
                if (!e.defaultPrevented && onRowClick) onRowClick(row);
              }}
            >
              {selectable && (
                <TableCell
                  selection
                  stickyLeft={0}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    state={sel.isSelected(id) ? 'on' : 'off'}
                    ariaLabel={`${sel.isSelected(id) ? 'Deselect' : 'Select'} row ${rIdx + 1}`}
                    onClick={(e) => sel.onCheckboxClick(id, e)}
                    onPointerDown={(e) => sel.onCheckboxPointerDown(id, e)}
                  />
                </TableCell>
              )}
              {columns.map((c, i) => {
                const isSticky = stickyFirstColumn && i === 0;
                const left = selectable ? TABLE_SELECT_COL_WIDTH : 0;
                const isPrimary = c.primary ?? i === 0;
                return (
                  <TableCell
                    key={c.id}
                    align={c.align}
                    stickyLeft={isSticky ? left : undefined}
                    primary={isPrimary}
                  >
                    {c.cell(row)}
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// Back-compat type alias for the old API.
export type TableColumn<Row> = SimpleTableColumn<Row>;

// ============================================================
// Inline-edit cells — flat read mode with hover affordance,
// edit mode opens an input or a Dropdown anchored to the cell.
// Use inside a TableCell as the cell content.
// ============================================================

export type EditableTextCellProps = {
  value: string;
  onChange: (next: string) => void;
  /** Custom display node when not editing (e.g. with an icon). Defaults to the value. */
  display?: ReactNode;
  /** Shown in read mode when the value is empty. Defaults to em-dash. */
  emptyLabel?: ReactNode;
  /** Placeholder for the underlying input when editing. */
  placeholder?: string;
  /** ARIA label for the trigger button. Falls back to "Edit". */
  ariaLabel?: string;
  className?: string;
};

export function EditableTextCell({
  value,
  onChange,
  display,
  emptyLabel = '—',
  placeholder,
  ariaLabel,
  className,
}: EditableTextCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        className={cn('ui-edit-input', className)}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== value) onChange(draft);
          setEditing(false);
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (draft !== value) onChange(draft);
            setEditing(false);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  const isEmpty = value == null || value === '';
  return (
    <button
      type="button"
      className={cn('ui-edit-cell', className)}
      aria-label={ariaLabel ?? 'Edit'}
      onClick={(e) => {
        e.stopPropagation();
        setDraft(value ?? '');
        setEditing(true);
      }}
    >
      <span className="ui-edit-cell-text">
        {display ?? (isEmpty ? <span className="ui-edit-cell-empty">{emptyLabel}</span> : value)}
      </span>
    </button>
  );
}

type EditableSelectCellCommon = {
  items: DropdownItem[];
  /** Custom display node. Falls back to the matched item's label or `emptyLabel`. */
  display?: ReactNode;
  /** Shown when no item matches `value`. Defaults to em-dash. */
  emptyLabel?: ReactNode;
  /** ARIA label for the trigger button. Falls back to "Change". */
  ariaLabel?: string;
  className?: string;
} & Pick<DropdownProps, 'searchable' | 'placeholder' | 'width' | 'fit' | 'align' | 'placement'>;

type EditableSelectCellSingle = EditableSelectCellCommon & {
  multiple?: false;
  value: string | null | undefined;
  onChange: (id: string) => void;
};

type EditableSelectCellMulti = EditableSelectCellCommon & {
  multiple: true;
  value: string[];
  onChange: (ids: string[]) => void;
};

export type EditableSelectCellProps =
  | EditableSelectCellSingle
  | EditableSelectCellMulti;

function findDropdownItem(items: DropdownItem[], id: string | null | undefined) {
  if (!id) return undefined;
  for (const it of items) {
    if ((it.kind === undefined || it.kind === 'item') && 'id' in it && it.id === id) {
      return it as Extract<DropdownItem, { kind?: 'item'; id: string }>;
    }
  }
  return undefined;
}

/** Trigger button used by EditableSelectCell. Consumes the `active` prop
 *  injected by Dropdown so it doesn't leak to the DOM as an unknown attribute. */
const EditableCellTrigger = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(function EditableCellTrigger({ active, className, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn('ui-edit-cell', className)}
      data-active={active ? '' : undefined}
      {...props}
    >
      {children}
    </button>
  );
});

export function EditableSelectCell(props: EditableSelectCellProps) {
  const {
    items,
    display,
    emptyLabel = '—',
    ariaLabel,
    className,
    searchable,
    placeholder,
    width = 220,
    fit = true,
    align,
    placement,
  } = props;

  let fallback: ReactNode;
  if (props.multiple) {
    const selected = props.value
      .map((id) => findDropdownItem(items, id))
      .filter((it): it is Extract<DropdownItem, { kind?: 'item'; id: string }> => !!it);
    if (selected.length === 0) {
      fallback = <span className="ui-edit-cell-text ui-edit-cell-empty">{emptyLabel}</span>;
    } else if (selected.length === 1) {
      const it = selected[0];
      fallback = (
        <>
          {it.avatar && <span className="ui-edit-cell-lead">{it.avatar}</span>}
          {it.leadingIcon && <span className="ui-edit-cell-lead">{it.leadingIcon}</span>}
          <span className="ui-edit-cell-text">{it.label}</span>
        </>
      );
    } else {
      fallback = (
        <span className="ui-edit-cell-text">
          {selected.map((s) => s.label).join(', ')}
        </span>
      );
    }
  } else {
    const item = findDropdownItem(items, props.value);
    fallback = item ? (
      <>
        {item.avatar && <span className="ui-edit-cell-lead">{item.avatar}</span>}
        {item.leadingIcon && <span className="ui-edit-cell-lead">{item.leadingIcon}</span>}
        <span className="ui-edit-cell-text">{item.label}</span>
      </>
    ) : (
      <span className="ui-edit-cell-text ui-edit-cell-empty">{emptyLabel}</span>
    );
  }

  const trigger = (
    <EditableCellTrigger
      className={className}
      aria-label={ariaLabel ?? 'Change'}
    >
      {display ?? fallback}
    </EditableCellTrigger>
  );

  const commonDropdownProps = {
    items,
    searchable,
    placeholder,
    width,
    fit,
    align,
    placement,
    trigger,
  };

  return (
    <span
      className="ui-edit-cell-wrap"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {props.multiple ? (
        <Dropdown
          {...commonDropdownProps}
          multiple
          value={props.value}
          onChange={props.onChange}
        />
      ) : (
        <Dropdown
          {...commonDropdownProps}
          value={props.value ?? undefined}
          onChange={props.onChange}
        />
      )}
    </span>
  );
}
