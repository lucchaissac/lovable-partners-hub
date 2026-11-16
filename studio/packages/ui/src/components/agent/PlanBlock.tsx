import { useCallback, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Button } from '../Button';
import { Checkbox } from '../Table';

export type PlanBlockTag = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
};

export type PlanBlockItem = {
  id: string;
  title: ReactNode;
  /** Long-form content shown when the row is expanded. */
  description?: ReactNode;
  /** Inline tags below the description (e.g., "Table", "Image"). */
  tags?: PlanBlockTag[];
  /** Round-checkbox state. Omit to render the row without a checkbox. */
  included?: boolean;
  defaultOpen?: boolean;
};

export type PlanBlockProps = HTMLAttributes<HTMLDivElement> & {
  /** Header above the list (e.g., "Page: Asset Product Overview"). */
  title?: ReactNode;
  items: PlanBlockItem[];
  onToggleIncluded?: (id: string) => void;
  onSkip?: () => void;
  onConfirm?: () => void;
  skipLabel?: string;
  confirmLabel?: string;
};

export function PlanBlock({
  title,
  items,
  onToggleIncluded,
  onSkip,
  onConfirm,
  skipLabel = 'Skip',
  confirmLabel = 'Confirm',
  className,
  ...props
}: PlanBlockProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.defaultOpen).map((i) => i.id)),
  );
  const toggleOpen = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const showActions = !!onSkip || !!onConfirm;

  return (
    <div className={cn('ui-plan-block', className)} {...props}>
      {title && <div className="ui-plan-block-title">{title}</div>}
      <ul className="ui-plan-block-list">
        {items.map((item) => {
          const open = openIds.has(item.id);
          const excluded = item.included === false;
          const ariaLabel =
            typeof item.title === 'string' ? item.title : 'Plan item';
          return (
            <li
              key={item.id}
              className="ui-plan-block-row"
              data-excluded={excluded ? '' : undefined}
              data-open={open ? '' : undefined}
            >
              <div className="ui-plan-block-row-head">
                {item.included !== undefined && (
                  <Checkbox
                    state={item.included ? 'on' : 'off'}
                    shape="round"
                    onToggle={() => onToggleIncluded?.(item.id)}
                    ariaLabel={ariaLabel}
                  />
                )}
                <button
                  type="button"
                  className="ui-plan-block-row-trigger"
                  aria-expanded={open}
                  onClick={() => toggleOpen(item.id)}
                >
                  <span className="ui-plan-block-row-title">{item.title}</span>
                  <span
                    className="ui-plan-block-row-chevron"
                    aria-hidden
                    data-open={open ? '' : undefined}
                  />
                </button>
              </div>
              {open && (item.description || item.tags?.length) && (
                <div className="ui-plan-block-row-body">
                  {item.description && (
                    <div className="ui-plan-block-row-description">
                      {item.description}
                    </div>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="ui-plan-block-row-tags">
                      {item.tags.map((t) => (
                        <span key={t.id} className="ui-plan-block-row-tag">
                          {t.icon && (
                            <span
                              className="ui-plan-block-row-tag-icon"
                              aria-hidden
                            >
                              {t.icon}
                            </span>
                          )}
                          <span>{t.label}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {showActions && (
        <div className="ui-plan-block-actions">
          {onSkip && (
            <Button variant="neutral" size="md" onClick={onSkip}>
              {skipLabel}
            </Button>
          )}
          {onConfirm && (
            <Button variant="primary" size="md" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
