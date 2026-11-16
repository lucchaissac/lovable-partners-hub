import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type PageHeaderTone = 'light' | 'dark';

export type PageHeaderProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  title: ReactNode;
  /** Optional center slot. When provided the header becomes a 3-column grid
   *  (title · center · actions) and `center` is pinned to the page mid-axis. */
  center?: ReactNode;
  actions?: ReactNode;
  /** `dark` rescopes the surface tokens so children (Button ghost/neutral,
   *  SegmentedControl, etc.) render against a dark backdrop. */
  tone?: PageHeaderTone;
};

export const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(function PageHeader(
  { title, center, actions, tone = 'light', className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-tone={tone}
      data-layout={center ? 'three-col' : 'two-col'}
      className={cn('ui-page-header', className)}
      {...props}
    >
      <span className="ui-page-header-title">{title}</span>
      {center && <div className="ui-page-header-center">{center}</div>}
      {actions && <div className="ui-page-header-actions">{actions}</div>}
    </div>
  );
});
