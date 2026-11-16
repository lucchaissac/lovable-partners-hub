import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Checkbox } from '../Table';

export type TodoBlockItem = {
  id: string;
  label: ReactNode;
  done?: boolean;
};

export type TodoBlockProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  items: TodoBlockItem[];
  onToggle?: (id: string) => void;
};

export function TodoBlock({ title, items, onToggle, className, ...props }: TodoBlockProps) {
  const done = items.filter((i) => i.done).length;
  return (
    <div className={cn('ui-agent-block ui-todo-block', className)} {...props}>
      {title && (
        <div className="ui-agent-block-head">
          <span className="ui-agent-block-title">{title}</span>
          <span className="ui-agent-block-meta">
            {done} / {items.length}
          </span>
        </div>
      )}
      <ul className="ui-todo-block-list">
        {items.map((item) => (
          <li key={item.id} className="ui-todo-block-row" data-done={item.done ? '' : undefined}>
            <Checkbox
              state={item.done ? 'on' : 'off'}
              shape="round"
              onToggle={() => onToggle?.(item.id)}
              ariaLabel={typeof item.label === 'string' ? item.label : 'Todo item'}
            />
            <span className="ui-todo-block-label">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
