import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type SourceItem = {
  id: string;
  label: ReactNode;
  href?: string;
  icon?: ReactNode;
};

export type SourcesBlockProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  sources: SourceItem[];
};

export function SourcesBlock({
  title = 'Sources',
  sources,
  className,
  ...props
}: SourcesBlockProps) {
  return (
    <div className={cn('ui-agent-block ui-sources-block', className)} {...props}>
      {title && <div className="ui-sources-block-title">{title}</div>}
      <div className="ui-sources-block-list">
        {sources.map((s) => {
          const Tag = s.href ? 'a' : 'span';
          return (
            <Tag
              key={s.id}
              href={s.href}
              target={s.href ? '_blank' : undefined}
              rel={s.href ? 'noreferrer' : undefined}
              className="ui-sources-block-chip"
            >
              {s.icon && <span className="ui-sources-block-chip-icon">{s.icon}</span>}
              <span>{s.label}</span>
            </Tag>
          );
        })}
      </div>
    </div>
  );
}
