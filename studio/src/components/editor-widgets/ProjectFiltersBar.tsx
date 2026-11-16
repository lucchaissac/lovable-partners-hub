import { useRef, useState } from 'react';
import { Button, Dropdown, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, Icon, Radio, RadioGroup, SegmentedControl, Tabs, TabsList, TabsTrigger } from '@asset/ui';
import type { ProjectFilters } from './complexWidgetModels';

const states = ['All', 'Open', 'Overdue', 'Completed'];
const audiences = ['All', 'Internal', 'External'];

export function ProjectFiltersBar({ value, onChange, assignees }: {
  value: ProjectFilters;
  onChange: (value: ProjectFilters) => void;
  assignees: string[];
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const count = Number(value.audience !== 'All') + Number(value.assignee !== 'All Tasks');
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <>
    <div className="ecw-project-filters">
      <Tabs value={value.state} onValueChange={state => onChange({ ...value, state })}>
        <TabsList aria-label="Project task filter">
          {states.map(state => <TabsTrigger key={state} value={state}>{state}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      <span />
      <SegmentedControl size="sm" animateSelection aria-label="Task audience" value={value.audience}
        onChange={audience => onChange({ ...value, audience })} items={audiences.map(id => ({ value: id, label: id }))} />
      <Dropdown value={value.assignee} listHeight="auto" items={assignees.map(id => ({ id, label: id }))}
        onChange={assignee => onChange({ ...value, assignee })}
        trigger={<Button variant="neutral" size="sm" trailingIcon={<Icon name="chevron-down" size={14} />}>Assignees <strong>{value.assignee}</strong></Button>} />
    </div>
    <div className="ecw-compact-filters">
      <div className="ecw-compact-filter-bar">
        <Dropdown value={value.state} listHeight="auto" items={states.map(id => ({ id, label: `${id} tasks` }))}
          onChange={state => onChange({ ...value, state })}
          trigger={<Button variant="ghost" size="sm" aria-label="Project task filter" trailingIcon={<Icon name="chevron-down" size={14} />}>{value.state} tasks</Button>} />
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger>
            <Button ref={trigger} variant="neutral" size="sm" aria-label={`Task filters${count ? `, ${count} active` : ''}`}
              leadingIcon={<Icon name="sliders-horizontal" size={14} />}>Filters{count ? ` · ${count}` : ''}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" width={260} className="ecw-filter-popover" role="dialog" aria-label="Task filters"
            onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
            <strong>Audience</strong>
            <RadioGroup aria-label="Task audience" value={value.audience} onChange={audience => onChange({ ...value, audience })}>
              {audiences.map(id => <Radio key={id} value={id} autoFocus={value.audience === id}>{id === 'All' ? 'All audiences' : id}</Radio>)}
            </RadioGroup>
            <strong>Assignee</strong>
            <RadioGroup aria-label="Task assignee" value={value.assignee} onChange={assignee => onChange({ ...value, assignee })}>
              {assignees.map(id => <Radio key={id} value={id}>{id === 'All Tasks' ? 'All assignees' : id}</Radio>)}
            </RadioGroup>
            <footer>
              <Button variant="ghost" size="sm" disabled={!count} onClick={() => onChange({ ...value, audience: 'All', assignee: 'All Tasks' })}>Reset</Button>
              <Button variant="primary" size="sm" onClick={close}>Done</Button>
            </footer>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!!count && <p className="ecw-active-filters">{[value.audience !== 'All' ? value.audience : '', value.assignee !== 'All Tasks' ? value.assignee : ''].filter(Boolean).join(' · ')}</p>}
    </div>
  </>;
}
