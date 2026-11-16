import { Icon } from './Icon';
import { forwardRef, useEffect, useMemo, useState } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Dropdown } from './Dropdown';
import type { DropdownItem } from './Dropdown';
import { TriggerField } from './TriggerField';

// ============================================================
// Pagination — composable primitives.
//
// Use:
//   <Pagination>
//     <PaginationContent>
//       <PaginationPrevious onClick={...} disabled={...} />
//       …
//       <PaginationNext onClick={...} disabled={...} />
//     </PaginationContent>
//   </Pagination>
//
// Or use SimplePagination for the common shape.
// ============================================================

export const Pagination = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Pagination({ className, ...props }, ref) {
    return <div ref={ref} className={cn('ui-pagination', className)} {...props} />;
  },
);

export const PaginationContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function PaginationContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn('ui-pagination-nav', className)} {...props} />;
  },
);

type IconKind = 'first' | 'prev' | 'next' | 'last';
function PageIcon({ kind }: { kind: IconKind }) {
  return <Icon name={kind === 'first' ? 'skip-back' : kind === 'last' ? 'skip-forward' : kind === 'prev' ? 'arrow-left' : 'arrow-right'} size={kind === 'first' || kind === 'last' ? 12 : 14} />;
}

type NavBtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind: IconKind;
};
const NavBtn = forwardRef<HTMLButtonElement, NavBtnProps>(function NavBtn(
  { kind, disabled, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      data-disabled={disabled ? '' : undefined}
      className={cn('ui-reset', 'ui-pagination-btn', className)}
      disabled={disabled}
      {...props}
    >
      <PageIcon kind={kind} />
    </button>
  );
});

export type PaginationPrevProps = Omit<NavBtnProps, 'kind'>;
export const PaginationFirst = forwardRef<HTMLButtonElement, PaginationPrevProps>(
  function PaginationFirst({ ['aria-label']: al = 'First page', ...props }, ref) {
    return <NavBtn ref={ref} kind="first" aria-label={al} {...props} />;
  },
);
export const PaginationPrevious = forwardRef<HTMLButtonElement, PaginationPrevProps>(
  function PaginationPrevious({ ['aria-label']: al = 'Previous page', ...props }, ref) {
    return <NavBtn ref={ref} kind="prev" aria-label={al} {...props} />;
  },
);
export const PaginationNext = forwardRef<HTMLButtonElement, PaginationPrevProps>(
  function PaginationNext({ ['aria-label']: al = 'Next page', ...props }, ref) {
    return <NavBtn ref={ref} kind="next" aria-label={al} {...props} />;
  },
);
export const PaginationLast = forwardRef<HTMLButtonElement, PaginationPrevProps>(
  function PaginationLast({ ['aria-label']: al = 'Last page', ...props }, ref) {
    return <NavBtn ref={ref} kind="last" aria-label={al} {...props} />;
  },
);

// ============================================================
// SimplePagination — common shape: page + total + size selector.
// ============================================================

export type SimplePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
};

export function SimplePagination({
  page,
  pageSize,
  total,
  pageSizeOptions = [25, 50, 100],
  onPageChange,
  onPageSizeChange,
}: SimplePaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const [pageInput, setPageInput] = useState<string>(String(page));

  useEffect(() => setPageInput(String(page)), [page]);

  const go = (p: number) => {
    const nextPage = Math.max(1, Math.min(lastPage, p));
    setPageInput(String(nextPage));
    onPageChange?.(nextPage);
  };

  const pageSizeItems = useMemo<DropdownItem[]>(
    () => pageSizeOptions.map((s) => ({ id: String(s), label: String(s) })),
    [pageSizeOptions],
  );

  return (
    <Pagination>
      {onPageSizeChange && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span>Rows</span>
          <Dropdown
            items={pageSizeItems}
            value={String(pageSize)}
            onChange={(v) => onPageSizeChange(Number(v))}
            fit
            align="start"
            placement="top"
            trigger={
              <TriggerField size="sm" aria-label="Rows per page">
                {pageSize}
              </TriggerField>
            }
          />
        </span>
      )}
      <span className="ui-pagination-range" aria-live="polite" aria-atomic="true">
        {`${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()}`}
      </span>
      <PaginationContent>
        <PaginationFirst onClick={() => go(1)} disabled={page <= 1} />
        <PaginationPrevious onClick={() => go(page - 1)} disabled={page <= 1} />
        <span className="ui-pagination-page-group">
          <span>Page</span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Page number"
            className="ui-pagination-input"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={() => {
              const n = Number(pageInput);
              if (!Number.isFinite(n) || n < 1) setPageInput(String(page));
              else go(n);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
          <span>{`of ${lastPage.toLocaleString()}`}</span>
        </span>
        <PaginationNext onClick={() => go(page + 1)} disabled={page >= lastPage} />
        <PaginationLast onClick={() => go(lastPage)} disabled={page >= lastPage} />
      </PaginationContent>
    </Pagination>
  );
}

// Back-compat: existing call sites use `<Pagination page=… total=… />`.
// We forward to SimplePagination when those props are passed, otherwise
// behave as the composable primitive.
export type PaginationProps = SimplePaginationProps;
