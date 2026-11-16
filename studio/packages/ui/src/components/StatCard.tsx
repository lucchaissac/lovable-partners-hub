import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type StatCardTrend = 'up' | 'down' | 'flat';

export type StatCardProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: ReactNode;
  /** Small line shown under the value, e.g. "vs last week" */
  description?: ReactNode;
  /** Delta string ("+12%", "-3", "0"). Tone follows `trend`. */
  delta?: ReactNode;
  trend?: StatCardTrend;
  /** Optional accessory (icon or pill) at the top-right of the card. */
  trailing?: ReactNode;
  /** Visually highlight the card (selected stat). */
  selected?: boolean;
};

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(function StatCard(
  {
    label,
    value,
    description,
    delta,
    trend = 'flat',
    trailing,
    selected,
    className,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      data-selected={selected ? '' : undefined}
      data-clickable={props.onClick ? '' : undefined}
      className={cn('ui-stat-card', className)}
      {...props}
    >
      <div className="ui-stat-card-head">
        <div className="ui-stat-card-label">{label}</div>
        {trailing && <div className="ui-stat-card-trailing">{trailing}</div>}
      </div>
      <div className="ui-stat-card-value">{value}</div>
      {(delta || description) && (
        <div className="ui-stat-card-foot">
          {delta && (
            <span className="ui-stat-card-delta" data-trend={trend}>
              {delta}
            </span>
          )}
          {description && <span className="ui-stat-card-description">{description}</span>}
        </div>
      )}
    </div>
  );
});
