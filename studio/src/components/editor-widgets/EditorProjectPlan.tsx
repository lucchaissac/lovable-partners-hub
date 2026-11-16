import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Dropdown,
  FormField,
  Icon,
  Input,
} from "@asset/ui";
import { EditorChecklist, TaskDatePicker } from "./EditorChecklist";
import {
  cloneProjectPlan,
  flattenTasks,
  matchesProjectTask,
  projectProgress,
  SAMPLE_PROJECT,
  type EditorProjectValue,
  type ProjectFilters,
  type ProjectPlan,
} from "./complexWidgetModels";
import "./editor-complex-widgets.css";
import { WidgetTitleField } from "./WidgetTitleField";
import { ProjectFiltersBar } from "./ProjectFiltersBar";
export { SAMPLE_PROJECT } from "./complexWidgetModels";
export type { EditorProjectValue } from "./complexWidgetModels";

function ProjectChecklist({
  plan,
  onChange,
  onRemove,
  panelHost,
  active,
  onPanelChange,
  filter,
}: {
  plan: ProjectPlan;
  onChange: (plan: ProjectPlan) => void;
  onRemove: () => void;
  panelHost: HTMLElement | null;
  active: boolean;
  onPanelChange: (id: string, open: boolean) => void;
  filter: (task: ProjectPlan["tasks"][number]) => boolean;
}) {
  const panelChanged = useCallback(
    (open: boolean) => onPanelChange(plan.id, open),
    [plan.id, onPanelChange],
  );
  return (
    <EditorChecklist
      value={plan}
      onChange={(next) => onChange({ ...plan, ...next })}
      onRemove={onRemove}
      taskFilter={filter}
      showControls={false}
      showViewSwitch={false}
      panelHost={panelHost}
      active={active}
      onPanelChange={panelChanged}
    />
  );
}
export function EditorProjectPlan({
  value,
  onChange,
  panelHost: externalPanelHost,
  active = true,
  onPanelChange,
}: {
  value: EditorProjectValue;
  onChange: (value: EditorProjectValue) => void;
  panelHost?: HTMLElement | null;
  active?: boolean;
  onPanelChange?: (open: boolean) => void;
}) {
  const [filters, setFilters] = useState<ProjectFilters>({
    state: "All",
    audience: "All",
    assignee: "All Tasks",
  });
  const [dateDraft, setDateDraft] =
    useState<Pick<EditorProjectValue, "start" | "end">>();
  const [picker, setPicker] = useState<"workspace" | "template">(),
    [query, setQuery] = useState("");
  const [panelHost, setPanelHost] = useState<HTMLDivElement | null>(null),
    [activePlan, setActivePlan] = useState<string>();
  const panelChanged = useCallback(
    (id: string, open: boolean) =>
      setActivePlan((current) =>
        open ? id : current === id ? undefined : current,
      ),
    [],
  );
  useEffect(() => {
    onPanelChange?.(!!activePlan);
    return () => onPanelChange?.(false);
  }, [activePlan, onPanelChange]);
  const [removed, setRemoved] = useState(false);
  const tasks = flattenTasks(value.plans.flatMap((plan) => plan.tasks));
  const assignees = [
    "All Tasks",
    "Unassigned",
    ...new Set(tasks.flatMap((task) => task.assignees)),
  ];
  const today = new Date().toLocaleDateString("en-CA");
  const filter = (task: ProjectPlan["tasks"][number]): boolean =>
    matchesProjectTask(task, filters, today) || task.subtasks.some(filter);
  const addPlan = (plan: ProjectPlan) => {
    onChange({ ...value, plans: [...value.plans, cloneProjectPlan(plan)] });
    setPicker(undefined);
  };
  const candidates =
    picker === "workspace"
      ? SAMPLE_PROJECT.plans
      : [
          {
            ...SAMPLE_PROJECT.plans[0],
            title: "Customer onboarding",
            source: "Plan template",
          },
          {
            ...SAMPLE_PROJECT.plans[1],
            title: "Launch checklist",
            source: "Plan template",
          },
        ];
  if (removed)
    return (
      <div className="ecw-empty">
        Project removed.
        <Button variant="neutral" size="sm" onClick={() => setRemoved(false)}>
          Undo
        </Button>
      </div>
    );
  return (
    <div className="ecw-layout">
      <section className="ecw-project" aria-label="Project plan widget">
        <header className="ecw-heading">
          <WidgetTitleField
            className="ecw-inline-title ecw-project-title"
            aria-label="Project title"
            placeholder="Untitled"
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
          />
          <Dropdown
            listHeight="auto"
            items={[
              {
                id: "timeline",
                label: value.showTimeline ? "Hide timeline" : "Show timeline",
                leadingIcon: <Icon name="calendar" size={16} />,
              },
              {
                id: "dates",
                label: "Edit dates",
                leadingIcon: <Icon name="pencil" size={16} />,
              },
              {
                id: "remove",
                label: "Remove",
                leadingIcon: <Icon name="trash-2" size={16} />,
              },
            ]}
            onChange={(id) =>
              id === "dates"
                ? setDateDraft({ start: value.start, end: value.end })
                : id === "timeline"
                  ? onChange({ ...value, showTimeline: !value.showTimeline })
                  : setRemoved(true)
            }
            trigger={
              <Button
                variant="ghost"
                size="sm"
                aria-label="Project options"
                leadingIcon={<Icon name="ellipsis" size={16} />}
              />
            }
          />
        </header>
        {value.showTimeline && (
          <div className="ecw-summary">
            <div>
              <small>Start on</small>
              <TaskDatePicker
                label="Project start"
                value={value.start}
                onChange={(start) => onChange({ ...value, start })}
              />
            </div>
            <span>{projectProgress(value.plans)}% complete</span>
            <div>
              <small>End on</small>
              <TaskDatePicker
                label="Project end"
                value={value.end}
                onChange={(end) => onChange({ ...value, end })}
              />
            </div>
          </div>
        )}
        <ProjectFiltersBar value={filters} onChange={setFilters} assignees={assignees} />
        {value.plans.map((plan) => (
          <div className="ecw-subplan" key={plan.id}>
            {plan.source && (
              <small className="ecw-source">
                <Icon name="layout-template" size={14} />
                {plan.source}
              </small>
            )}
            <ProjectChecklist
              plan={plan}
              onChange={(next) =>
                onChange({
                  ...value,
                  plans: value.plans.map((item) =>
                    item.id === plan.id ? next : item,
                  ),
                })
              }
              onRemove={() =>
                onChange({
                  ...value,
                  plans: value.plans.filter((item) => item.id !== plan.id),
                })
              }
              panelHost={externalPanelHost ?? panelHost}
              active={active && (!activePlan || activePlan === plan.id)}
              onPanelChange={panelChanged}
              filter={filter}
            />
            {plan.tasks.length > 0 && !plan.tasks.some(filter) && (
              <p className="ecw-filter-empty">No tasks match these filters.</p>
            )}
          </div>
        ))}
        <Dropdown
          listHeight="auto"
          items={[
            {
              id: "scratch",
              label: "Create from scratch",
              leadingIcon: <Icon name="plus" size={16} />,
            },
            {
              id: "workspace",
              label: "Add from this workspace",
              leadingIcon: <Icon name="layers" size={16} />,
            },
            {
              id: "template",
              label: "Create from a plan template",
              leadingIcon: <Icon name="layout-template" size={16} />,
            },
          ]}
          onChange={(id) => {
            if (id === "scratch")
              addPlan({
                id: "new",
                title: "",
                tasks: [],
                view: "list",
                expandOnPublic: false,
              });
            else {
              setPicker(id as "workspace" | "template");
              setQuery("");
            }
          }}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<Icon name="plus" size={16} />}
            >
              Add plan
            </Button>
          }
        />
      </section>
      {!externalPanelHost && (
        <div ref={setPanelHost} className="ecw-panel-host" />
      )}
      {dateDraft && (
        <Dialog
          open
          overlayClassName="ecw-dialog-overlay"
          onClose={() => setDateDraft(undefined)}
          width={440}
          ariaLabel="Edit project dates"
          dividers
        >
          <DialogHeader
            title="Edit dates"
            onClose={() => setDateDraft(undefined)}
          />
          <DialogBody>
            <FormField label="Start date">
              <TaskDatePicker
                label="Start date"
                value={dateDraft.start}
                onChange={(start) => setDateDraft({ ...dateDraft, start })}
              />
            </FormField>
            <FormField label="End date">
              <TaskDatePicker
                label="End date"
                value={dateDraft.end}
                onChange={(end) => setDateDraft({ ...dateDraft, end })}
              />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button variant="neutral" onClick={() => setDateDraft(undefined)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onChange({ ...value, ...dateDraft });
                setDateDraft(undefined);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </Dialog>
      )}
      {picker && (
        <Dialog
          open
          overlayClassName="ecw-dialog-overlay"
          onClose={() => setPicker(undefined)}
          width={560}
          ariaLabel={
            picker === "workspace"
              ? "Add from this workspace"
              : "Plan templates"
          }
          dividers
        >
          <DialogHeader
            title={
              picker === "workspace"
                ? "Add from this workspace"
                : "Plan templates"
            }
            onClose={() => setPicker(undefined)}
          />
          <DialogBody>
            <Input
              aria-label="Search plans"
              placeholder="Search plans"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              leadingIcon={<Icon name="search" size={16} />}
            />
            <div className="ecw-picker">
              {candidates
                .filter((plan) =>
                  plan.title.toLowerCase().includes(query.toLowerCase()),
                )
                .map((plan) => (
                  <div key={plan.id}>
                    <Icon name="list-checks" size={18} />
                    <div>
                      <strong>{plan.title}</strong>
                      <small>{flattenTasks(plan.tasks).length} tasks</small>
                    </div>
                    <Button
                      size="sm"
                      variant="neutral"
                      onClick={() => addPlan(plan)}
                    >
                      Add
                    </Button>
                  </div>
                ))}
            </div>
            <p className="ecw-muted">Sample plans for this preview.</p>
          </DialogBody>
        </Dialog>
      )}
    </div>
  );
}
