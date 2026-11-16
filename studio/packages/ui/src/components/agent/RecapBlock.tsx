import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type RecapBlockProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  icon?: ReactNode;
  items: ReactNode[];
};

export function RecapBlock({ title, icon, items, className, ...props }: RecapBlockProps) {
  return (
    <div className={cn('ui-agent-block ui-recap-block', className)} {...props}>
      <div className="ui-agent-block-head">
        {icon && <span className="ui-recap-block-icon">{icon}</span>}
        <span className="ui-agent-block-title">{title}</span>
      </div>
      <ul className="ui-recap-block-list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
