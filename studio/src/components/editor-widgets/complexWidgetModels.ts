import type {
  EditorChecklistValue,
  EditorTask,
  TaskDate,
} from "../../studio/workspaceTaskTypes";

export type ProjectPlan = EditorChecklistValue & {
  id: string;
  source?: string;
};
export type EditorProjectValue = {
  title: string;
  start?: TaskDate;
  end?: TaskDate;
  showTimeline: boolean;
  plans: ProjectPlan[];
};
export type ProjectFilters = {
  state: string;
  audience: string;
  assignee: string;
};
export const flattenTasks = (tasks: EditorTask[]): EditorTask[] =>
  tasks.flatMap((task) => [task, ...flattenTasks(task.subtasks)]);
export function matchesProjectTask(
  task: EditorTask,
  filters: ProjectFilters,
  today: string,
): boolean {
  const state =
    filters.state === "All" ||
    (filters.state === "Open" && !task.complete) ||
    (filters.state === "Completed" && task.complete) ||
    (filters.state === "Overdue" &&
      !task.complete &&
      !!task.due?.date &&
      task.due.date < today);
  const audience =
    filters.audience === "All" ||
    (filters.audience === "Internal") === task.internal;
  return (
    state &&
    audience &&
    (filters.assignee === "All Tasks" ||
      (filters.assignee === "Unassigned" && !task.assignees.length) ||
      task.assignees.includes(filters.assignee))
  );
}
export function projectProgress(plans: ProjectPlan[]) {
  const tasks = flattenTasks(plans.flatMap((plan) => plan.tasks));
  return tasks.length
    ? Math.round(
        (tasks.filter((task) => task.complete).length / tasks.length) * 100,
      )
    : 0;
}
export const sampleTask = (
  id: string,
  name: string,
  patch: Partial<EditorTask> = {},
): EditorTask => ({
  id,
  name,
  status: "To-do",
  complete: false,
  internal: false,
  assignees: [],
  description: "",
  subtasks: [],
  comments: [],
  ...patch,
});
export const SAMPLE_PROJECT: EditorProjectValue = {
  title: "Rollout project",
  showTimeline: true,
  start: { date: "2026-10-26" },
  end: { date: "2026-11-13" },
  plans: [
    {
      id: "planning",
      title: "Plan your rollout",
      view: "list",
      expandOnPublic: false,
      tasks: [
        sampleTask("kickoff", "Confirm rollout goals", {
          complete: true,
          assignees: ["Sam Taylor"],
          due: { date: "2026-10-26" },
        }),
        sampleTask("policy", "Review spending policy", {
          status: "In-progress",
          internal: true,
          assignees: ["Morgan Chen"],
          due: { date: "2026-10-27" },
          description: "Review approval owners and spending limits.",
          subtasks: [sampleTask("limits", "Confirm team limits")],
        }),
      ],
    },
    {
      id: "launch",
      title: "Launch with your team",
      view: "list",
      expandOnPublic: false,
      tasks: [
        sampleTask("invite", "Invite your first team", {
          due: { date: "2026-11-10" },
        }),
        sampleTask("review", "Review the first week", {
          assignees: ["Sam Taylor"],
          due: { date: "2026-11-13" },
        }),
      ],
    },
  ],
};
export const EMPTY_PROJECT: EditorProjectValue = {
  title: "",
  showTimeline: true,
  plans: [],
};
export function cloneProjectPlan(plan: ProjectPlan): ProjectPlan {
  const cloneTask = (task: EditorTask): EditorTask => ({
    ...structuredClone(task),
    id: crypto.randomUUID(),
    subtasks: task.subtasks.map(cloneTask),
  });
  return {
    ...structuredClone(plan),
    id: crypto.randomUUID(),
    tasks: plan.tasks.map(cloneTask),
  };
}

export type TimelineStage = {
  id: string;
  name: string;
  start?: TaskDate;
  end?: TaskDate;
  progress: number;
  description: string;
};
export type EditorTimelineValue = {
  start?: TaskDate;
  end?: TaskDate;
  stages: TimelineStage[];
};
export function timelineProgress(stages: TimelineStage[]) {
  return stages.length
    ? Math.round(
        stages.reduce(
          (total, stage) => total + Math.max(0, Math.min(100, stage.progress)),
          0,
        ) / stages.length,
      )
    : 0;
}
export function moveStage(stages: TimelineStage[], id: string, target: string) {
  const source = stages.findIndex((stage) => stage.id === id),
    destination = stages.findIndex((stage) => stage.id === target);
  if (source < 0 || destination < 0 || source === destination) return stages;
  const next = [...stages];
  const [stage] = next.splice(source, 1);
  next.splice(destination, 0, stage);
  return next;
}
export const SAMPLE_TIMELINE: EditorTimelineValue = {
  start: { date: "2026-10-26" },
  end: { date: "2026-11-13" },
  stages: [
    {
      id: "plan",
      name: "Kickoff and planning",
      start: { date: "2026-10-26" },
      end: { date: "2026-10-30" },
      progress: 100,
      description: "Align on goals, ownership and your launch date.",
    },
    {
      id: "configure",
      name: "Configure your workspace",
      start: { date: "2026-11-02" },
      end: { date: "2026-11-06" },
      progress: 50,
      description: "Review policies and run a pilot with your team.",
    },
    {
      id: "launch",
      name: "Launch and review",
      start: { date: "2026-11-09" },
      end: { date: "2026-11-13" },
      progress: 0,
      description: "Invite everyone and review the first week.",
    },
  ],
};

export type QuoteAdjustment = { amount: number; type: "percent" | "fixed" };
export type QuoteLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: QuoteAdjustment;
  frequency: "Annual" | "Monthly" | "One-time";
};
export type QuoteSection = {
  id: string;
  title: string;
  lines: QuoteLine[];
  discount: QuoteAdjustment;
  showSubtotal: boolean;
};
export type QuoteOption = {
  id: string;
  name: string;
  billingFrequency?: QuoteLine["frequency"];
  sections: QuoteSection[];
  discount: QuoteAdjustment;
  tax: number;
  showTotals: boolean;
};
export type QuoteTerms = {
  length: string;
  start: string;
  end: string;
  billingStart: string;
  billingTerms: string;
  paymentTerm: string;
  paymentMethods: string;
  marketing: string[];
  additional: string;
};
export type EditorQuoteValue = {
  title: string;
  currency: string;
  options: QuoteOption[];
  selected: string;
  status: "draft" | "published";
  terms: QuoteTerms;
};
const cents = (value: number) =>
  Math.round(Math.max(0, Number.isFinite(value) ? value : 0) * 100);
export function adjustedCents(subtotal: number, discount: QuoteAdjustment) {
  const deduction =
    discount.type === "percent"
      ? Math.round(
          (subtotal * Math.min(100, Math.max(0, discount.amount))) / 100,
        )
      : cents(discount.amount);
  return Math.max(0, subtotal - deduction);
}
export function quoteLineTotal(line: QuoteLine) {
  return adjustedCents(
    Math.round(cents(line.unitPrice) * Math.max(0, line.quantity)),
    line.discount,
  );
}
export function quoteSectionTotal(section: QuoteSection) {
  return adjustedCents(
    section.lines.reduce((sum, line) => sum + quoteLineTotal(line), 0),
    section.discount,
  );
}
export function quoteOptionTotal(option: QuoteOption) {
  const subtotal = option.sections.reduce(
      (sum, section) => sum + quoteSectionTotal(section),
      0,
    ),
    net = adjustedCents(subtotal, option.discount);
  return {
    subtotal,
    net,
    tax: Math.round((net * Math.max(0, option.tax)) / 100),
    total: net + Math.round((net * Math.max(0, option.tax)) / 100),
  };
}
export const freshQuoteSection = (): QuoteSection => ({
  id: crypto.randomUUID(),
  title: "",
  lines: [],
  discount: { amount: 0, type: "percent" },
  showSubtotal: true,
});
export const freshQuoteOption = (): QuoteOption => ({
  id: crypto.randomUUID(),
  name: "Untitled",
  billingFrequency: "Annual",
  sections: [freshQuoteSection()],
  discount: { amount: 0, type: "percent" },
  tax: 0,
  showTotals: true,
});
export const EMPTY_QUOTE: EditorQuoteValue = {
  title: "",
  currency: "USD",
  selected: "option-1",
  status: "draft",
  options: [
    {
      id: "option-1",
      name: "Untitled",
      billingFrequency: "Annual",
      sections: [
        {
          id: "section-1",
          title: "",
          lines: [],
          discount: { amount: 0, type: "percent" },
          showSubtotal: true,
        },
      ],
      discount: { amount: 0, type: "percent" },
      tax: 0,
      showTotals: true,
    },
  ],
  terms: {
    length: "12 months",
    start: "",
    end: "",
    billingStart: "",
    billingTerms: "Annual",
    paymentTerm: "Net 30",
    paymentMethods: "Bank transfer",
    marketing: [],
    additional: "",
  },
};
export const SAMPLE_QUOTE: EditorQuoteValue = {
  ...EMPTY_QUOTE,
  title: "Rollout proposal",
  options: [
    {
      ...EMPTY_QUOTE.options[0],
      name: "Team plan",
      sections: [
        {
          ...EMPTY_QUOTE.options[0].sections[0],
          title: "Software and onboarding",
          lines: [
            {
              id: "software",
              name: "Team platform",
              quantity: 25,
              unitPrice: 120,
              frequency: "Annual",
              discount: { amount: 10, type: "percent" },
            },
            {
              id: "services",
              name: "Onboarding workshop",
              quantity: 1,
              unitPrice: 500,
              frequency: "One-time",
              discount: { amount: 0, type: "percent" },
            },
          ],
        },
      ],
    },
  ],
};
