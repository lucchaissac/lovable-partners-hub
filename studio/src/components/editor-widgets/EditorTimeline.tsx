import { useRef, useState } from "react";
import { Button, Dropdown, Icon } from "@asset/ui";
import { TaskDatePicker } from "./EditorChecklist";
import {
  moveStage,
  timelineProgress,
  type EditorTimelineValue,
  type TimelineStage,
} from "./complexWidgetModels";
import "./editor-complex-widgets.css";
import { WidgetTitleField } from "./WidgetTitleField";
export { SAMPLE_TIMELINE } from "./complexWidgetModels";
export type { EditorTimelineValue } from "./complexWidgetModels";

export function EditorTimeline({
  value,
  onChange,
}: {
  value: EditorTimelineValue;
  onChange: (value: EditorTimelineValue) => void;
}) {
  const [target, setTarget] = useState<string>();
  const drag = useRef<
    { id: string; x: number; y: number; target?: string } | undefined
  >(undefined);
  const patch = (id: string, patch: Partial<TimelineStage>) =>
    onChange({
      ...value,
      stages: value.stages.map((stage) =>
        stage.id === id ? { ...stage, ...patch } : stage,
      ),
    });
  const move = (id: string, target: string) =>
    onChange({ ...value, stages: moveStage(value.stages, id, target) });
  return (
    <section className="ecw-timeline" aria-label="Timeline widget">
      <div className="ecw-summary">
        <div>
          <small>Start on</small>
          <TaskDatePicker
            label="Timeline start"
            value={value.start}
            onChange={(start) => onChange({ ...value, start })}
          />
        </div>
        <span>{timelineProgress(value.stages)}% complete</span>
        <div>
          <small>End on</small>
          <TaskDatePicker
            label="Timeline end"
            value={value.end}
            onChange={(end) => onChange({ ...value, end })}
          />
        </div>
      </div>
      <div className="ecw-stages">
        {value.stages.map((stage, index) => (
          <article
            className="ecw-stage"
            key={stage.id}
            data-stage-id={stage.id}
            data-drop={target === stage.id || undefined}
          >
            <div className="ecw-stage-actions">
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Reorder ${stage.name}`}
                className="ecw-stage-grip"
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  drag.current = {
                    id: stage.id,
                    x: event.clientX,
                    y: event.clientY,
                  };
                }}
                onPointerMove={(event) => {
                  const active = drag.current;
                  if (
                    !active ||
                    Math.hypot(
                      event.clientX - active.x,
                      event.clientY - active.y,
                    ) < 5
                  )
                    return;
                  const candidate = document
                    .elementFromPoint(event.clientX, event.clientY)
                    ?.closest<HTMLElement>("[data-stage-id]");
                  const root = event.currentTarget.closest(".ecw-stages");
                  active.target =
                    candidate &&
                    root?.contains(candidate) &&
                    candidate.dataset.stageId !== active.id
                      ? candidate.dataset.stageId
                      : undefined;
                  setTarget(active.target);
                }}
                onPointerUp={(event) => {
                  const active = drag.current;
                  drag.current = undefined;
                  setTarget(undefined);
                  if (event.currentTarget.hasPointerCapture(event.pointerId))
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  if (active?.target) move(active.id, active.target);
                }}
                onPointerCancel={() => {
                  drag.current = undefined;
                  setTarget(undefined);
                }}
                onLostPointerCapture={() => {
                  drag.current = undefined;
                  setTarget(undefined);
                }}
                leadingIcon={<Icon name="grip-vertical" size={14} />}
              />
              <Dropdown
                listHeight="auto"
                items={[
                  { id: "up", label: "Move up", disabled: index === 0 },
                  {
                    id: "down",
                    label: "Move down",
                    disabled: index === value.stages.length - 1,
                  },
                  { id: "duplicate", label: "Duplicate" },
                  {
                    id: "remove",
                    label: "Remove stage",
                    leadingIcon: <Icon name="trash-2" size={14} />,
                  },
                ]}
                onChange={(action) => {
                  if (action === "remove")
                    onChange({
                      ...value,
                      stages: value.stages.filter(
                        (item) => item.id !== stage.id,
                      ),
                    });
                  if (action === "duplicate")
                    onChange({
                      ...value,
                      stages: [
                        ...value.stages.slice(0, index + 1),
                        { ...stage, id: crypto.randomUUID() },
                        ...value.stages.slice(index + 1),
                      ],
                    });
                  if (action === "up" || action === "down")
                    move(
                      stage.id,
                      value.stages[index + (action === "up" ? -1 : 1)].id,
                    );
                }}
                trigger={
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Options for ${stage.name}`}
                    leadingIcon={<Icon name="ellipsis" size={14} />}
                  />
                }
              />
            </div>
            <input
              className="ecw-stage-progress"
              type="range"
              min={0}
              max={100}
              step={1}
              aria-label={`Progress for ${stage.name}`}
              aria-valuetext={`${stage.progress}% complete`}
              value={stage.progress}
              onChange={(event) =>
                patch(stage.id, { progress: Number(event.target.value) })
              }
            />
            <WidgetTitleField
              className="ecw-inline-title ecw-stage-title"
              aria-label={`Stage name ${stage.id}`}
              placeholder="Stage name"
              value={stage.name}
              onChange={(event) =>
                patch(stage.id, { name: event.target.value })
              }
            />
            <div className="ecw-stage-dates">
              <TaskDatePicker
                label={`Start date for ${stage.name}`}
                value={stage.start}
                onChange={(start) => patch(stage.id, { start })}
              />
              <TaskDatePicker
                label={`End date for ${stage.name}`}
                value={stage.end}
                onChange={(end) => patch(stage.id, { end })}
              />
            </div>
            <textarea
              className="ecw-description"
              aria-label={`Description for ${stage.name}`}
              placeholder="Add description…"
              value={stage.description}
              onChange={(event) =>
                patch(stage.id, { description: event.target.value })
              }
            />
          </article>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        leadingIcon={<Icon name="plus" size={16} />}
        onClick={() =>
          onChange({
            ...value,
            stages: [
              ...value.stages,
              {
                id: crypto.randomUUID(),
                name: "",
                progress: 0,
                description: "",
              },
            ],
          })
        }
      >
        Add stage
      </Button>
    </section>
  );
}
