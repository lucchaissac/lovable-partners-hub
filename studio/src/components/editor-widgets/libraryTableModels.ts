export type LibraryAsset = {
  id: string;
  name: string;
  type: "Image" | "PDF" | "Link";
  url: string;
  thumbnail?: string;
  tags: string[];
  internal: boolean;
  views: number;
  shares: number;
};
export type LibraryRule = {
  id: string;
  field: "type" | "tags" | "internal" | "views" | "shares";
  operator: "includes" | "excludes" | "gt" | "lt" | "eq";
  values: string[];
};
/** OR between groups, AND within each group, matching staging's And / Or actions. */
export type EditorLibraryValue = {
  source: "selected" | "filtered";
  selected: string[];
  groups: LibraryRule[][];
  view: "grid" | "table" | "carousel";
  pageSize: number;
};
export const LIBRARY_ASSETS: LibraryAsset[] = [
  {
    id: "guide",
    name: "Rollout guide",
    type: "PDF",
    url: "/demo-assets/rollout-guide.pdf",
    thumbnail: "/assets/ramp/workflow.webp",
    tags: ["Onboarding"],
    internal: false,
    views: 24,
    shares: 6,
  },
  {
    id: "card",
    name: "Corporate cards",
    type: "Image",
    url: "/assets/ramp/black-card.webp",
    thumbnail: "/assets/ramp/black-card.webp",
    tags: ["Product"],
    internal: false,
    views: 18,
    shares: 4,
  },
  {
    id: "receipts",
    name: "Receipt collection",
    type: "Image",
    url: "/assets/ramp/receipt-phone.webp",
    thumbnail: "/assets/ramp/receipt-phone.webp",
    tags: ["Product", "Onboarding"],
    internal: false,
    views: 12,
    shares: 3,
  },
  {
    id: "global",
    name: "Global spending",
    type: "Image",
    url: "/assets/ramp/globe.webp",
    thumbnail: "/assets/ramp/globe.webp",
    tags: ["Product"],
    internal: false,
    views: 9,
    shares: 2,
  },
  {
    id: "workflow",
    name: "Approval workflow",
    type: "Image",
    url: "/assets/ramp/workflow.webp",
    thumbnail: "/assets/ramp/workflow.webp",
    tags: ["Operations"],
    internal: true,
    views: 7,
    shares: 1,
  },
  {
    id: "launch",
    name: "Launch checklist",
    type: "PDF",
    url: "/demo-assets/rollout-guide.pdf",
    tags: ["Onboarding", "Operations"],
    internal: true,
    views: 5,
    shares: 0,
  },
  {
    id: "help",
    name: "Asset website",
    type: "Link",
    url: "https://asset.us/",
    tags: ["Onboarding"],
    internal: false,
    views: 33,
    shares: 12,
  },
];
export const SAMPLE_LIBRARY: EditorLibraryValue = {
  source: "selected",
  selected: ["guide", "card", "receipts", "global"],
  groups: [],
  view: "grid",
  pageSize: 6,
};
export const EMPTY_LIBRARY: EditorLibraryValue = {
  ...SAMPLE_LIBRARY,
  selected: [],
};
export function matchesLibraryRule(asset: LibraryAsset, rule: LibraryRule) {
  if (!rule.values.length) return false;
  if (rule.field === "views" || rule.field === "shares") {
    const n = Number(rule.values[0]);
    if (!Number.isFinite(n)) return false;
    return rule.operator === "gt"
      ? asset[rule.field] > n
      : rule.operator === "lt"
        ? asset[rule.field] < n
        : asset[rule.field] === n;
  }
  const values =
    rule.field === "tags" ? asset.tags : [String(asset[rule.field])];
  const matches = values.some((value) => rule.values.includes(value));
  return rule.operator === "excludes" ? !matches : matches;
}
export function libraryResults(
  value: EditorLibraryValue,
  assets: LibraryAsset[],
) {
  if (value.source === "selected")
    return [...new Set(value.selected)].flatMap((id) => {
      const asset = assets.find((item) => item.id === id);
      return asset ? [asset] : [];
    });
  return assets.filter((asset) =>
    value.groups.some(
      (group) =>
        group.length > 0 &&
        group.every((rule) => matchesLibraryRule(asset, rule)),
    ),
  );
}
export function libraryPage<T>(items: T[], page: number, pageSize: number) {
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const current = Math.max(
    1,
    Math.min(Math.floor(page) || 1, Math.ceil(items.length / size) || 1),
  );
  return {
    page: current,
    items: items.slice((current - 1) * size, current * size),
  };
}
export function reorderAsset(ids: string[], source: string, target: string) {
  const from = ids.indexOf(source),
    to = ids.indexOf(target);
  if (from < 0 || to < 0 || from === to) return ids;
  const result = [...ids];
  result.splice(from, 1);
  result.splice(to, 0, source);
  return result;
}

export type CellStyle = {
  background: string;
  color: string;
  size: number;
  weight: number;
  italic: boolean;
  underline: boolean;
  spacing: number;
  line: number;
  uppercase: boolean;
  align: "left" | "center" | "right";
  vertical: "top" | "middle" | "bottom";
};
export const DEFAULT_CELL_STYLE: CellStyle = {
  background: "#ffffff",
  color: "#171b25",
  size: 16,
  weight: 400,
  italic: false,
  underline: false,
  spacing: 0,
  line: 1.4,
  uppercase: false,
  align: "left",
  vertical: "top",
};
export type TableCellValue = {
  id: string;
  text: string;
  style: Partial<CellStyle>;
};
export type EditorTableValue = {
  columns: string[];
  rows: { id: string; cells: TableCellValue[] }[];
};
export type TableSelection = {
  row: string;
  column: string;
  scope: "cell" | "row" | "column";
};
export function makeTable(texts: string[][]): EditorTableValue {
  const width = Math.max(1, ...texts.map((row) => row.length));
  return {
    columns: Array.from({ length: width }, (_, c) => `col-${c}`),
    rows: (texts.length ? texts : [[""]]).map((row, r) => ({
      id: `row-${r}`,
      cells: Array.from({ length: width }, (_, c) => ({
        id: `cell-${r}-${c}`,
        text: row[c] ?? "",
        style: {},
      })),
    })),
  };
}
export const SAMPLE_TABLE = makeTable([
  ["Stage", "Owner", "Status"],
  ["Kickoff", "Example team", "Complete"],
  ["Review", "Example owner", "In progress"],
]);
export const EMPTY_TABLE = makeTable([
  ["", "", ""],
  ["", "", ""],
  ["", "", ""],
]);
export function columnName(index: number): string {
  let result = "";
  do {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  } while (index >= 0);
  return result;
}
export function styleTableSelection(
  value: EditorTableValue,
  selection: TableSelection,
  patch: Partial<CellStyle> | null,
) {
  return {
    ...value,
    rows: value.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell, index) => {
        const affected =
          selection.scope === "column"
            ? value.columns[index] === selection.column
            : selection.scope === "row"
              ? row.id === selection.row
              : row.id === selection.row &&
                value.columns[index] === selection.column;
        return affected
          ? {
              ...cell,
              style: patch === null ? {} : { ...cell.style, ...patch },
            }
          : cell;
      }),
    })),
  };
}
export function changeTableStructure(
  value: EditorTableValue,
  axis: "row" | "column",
  index: number,
  action: "before" | "after" | "remove",
  id = crypto.randomUUID(),
): EditorTableValue {
  const length = axis === "row" ? value.rows.length : value.columns.length;
  if (index < 0 || index >= length || (action === "remove" && length <= 1))
    return value;
  const at = index + (action === "after" ? 1 : 0),
    remove = action === "remove" ? 1 : 0;
  if (axis === "row") {
    const rows = [...value.rows];
    rows.splice(
      at,
      remove,
      ...(remove
        ? []
        : [
            {
              id,
              cells: value.columns.map((_, c) => ({
                id: `${id}-${c}`,
                text: "",
                style: {},
              })),
            },
          ]),
    );
    return { ...value, rows };
  }
  const columns = [...value.columns];
  columns.splice(at, remove, ...(remove ? [] : [id]));
  return {
    columns,
    rows: value.rows.map((row) => {
      const cells = [...row.cells];
      cells.splice(
        at,
        remove,
        ...(remove ? [] : [{ id: `${id}-${row.id}`, text: "", style: {} }]),
      );
      return { ...row, cells };
    }),
  };
}
