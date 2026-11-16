import { Icon } from './Icon';
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type FilterChipSize = 'sm' | 'md';

export type FilterChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Label de la propriété filtrée, ex: "Owners" */
  label: ReactNode;
  /** Valeur courante du filtre, ex: "all" ou "My Accounts". Affichée à droite du label. */
  value?: ReactNode;
  /** Icône / avatar à gauche du label */
  leading?: ReactNode;
  /** Si défini, affiche un × cliquable à droite (sinon, chevron). */
  onClear?: (e: MouseEvent<HTMLSpanElement>) => void;
  /** Affiche un état "actif" (filtre appliqué) */
  active?: boolean;
  size?: FilterChipSize;
};

export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(function FilterChip(
  {
    label,
    value,
    leading,
    onClear,
    active,
    size = 'md',
    disabled,
    className,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      data-size={size}
      data-active={active ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      disabled={disabled}
      className={cn('ui-reset', 'ui-filter-chip', className)}
      {...props}
    >
      {leading && <span className="ui-filter-chip-leading">{leading}</span>}
      <span className="ui-filter-chip-label">{label}</span>
      {value !== undefined && value !== null && value !== '' && (
        <span className="ui-filter-chip-value">{value}</span>
      )}
      {onClear ? (
        <span
          role="button"
          aria-label="Clear filter"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onClear(e);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onClear(e as unknown as MouseEvent<HTMLSpanElement>);
            }
          }}
          className="ui-filter-chip-clear"
        >
          <Icon name="x" size="100%" />
        </span>
      ) : (
        <span className="ui-filter-chip-chevron" aria-hidden="true">
          <Icon name="chevron-down" size="100%" />
        </span>
      )}
    </button>
  );
});
