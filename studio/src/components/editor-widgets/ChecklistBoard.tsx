import { useState } from 'react';
import { Button, Dropdown, Icon } from '@asset/ui';
import type { EditorTask } from '../../studio/workspaceTaskTypes';

const columns = ['To-do', 'In-progress', 'Completed'] as const;
export type TaskColumn = typeof columns[number];
export const taskColumn = (task: EditorTask): TaskColumn => task.complete ? 'Completed' : task.status;

export function ChecklistBoard({ tasks, onSelect, onAdd, dateLabel }: {
  tasks: EditorTask[];
  onSelect: (id: string) => void;
  onAdd: (column: TaskColumn) => void;
  dateLabel: (value: EditorTask['due']) => string | undefined;
}) {
  const [column, setColumn] = useState<TaskColumn>(() => tasks[0] ? taskColumn(tasks[0]) : 'To-do');
  const groups = columns.map(id => ({ id, tasks: tasks.filter(task => taskColumn(task) === id) }));
  const current = groups.find(group => group.id === column)!;

  return <>
    <div className="ewt-board-compact-controls">
      <Dropdown
        value={column}
        listHeight="auto"
        items={groups.map(group => ({ id: group.id, label: `${group.id} · ${group.tasks.length}` }))}
        onChange={id => setColumn(id as TaskColumn)}
        trigger={<Button variant="neutral" size="sm" aria-label="Task status view" trailingIcon={<Icon name="chevron-down" size={14} />}>
          {column} · {current.tasks.length}
        </Button>}
      />
    </div>
    <div className="ewt-board">
      {groups.map(group => <section key={group.id} aria-label={`${group.id} tasks`} data-active={group.id === column || undefined}>
        <h4>{group.id}<span>{group.tasks.length}</span></h4>
        {!group.tasks.length && <p className="ewt-board-empty">No tasks yet</p>}
        {group.tasks.map(item => <button type="button" className="ewt-task-card" key={item.id} onClick={() => onSelect(item.id)}>
          <strong>{item.name || 'Untitled task'}</strong>
          {item.due && <span>{dateLabel(item.due)}</span>}
          {!!item.subtasks.length && <small>{item.subtasks.filter(task => task.complete).length}/{item.subtasks.length} subtasks</small>}
        </button>)}
        <Button variant="ghost" size="sm" leadingIcon={<Icon name="plus" size={14} />} onClick={() => onAdd(group.id)}>Add task</Button>
      </section>)}
    </div>
  </>;
}
