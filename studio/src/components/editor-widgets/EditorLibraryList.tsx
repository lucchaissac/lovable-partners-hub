import {EditorWidgetToolbar} from './EditorWidgetToolbar';
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Dropdown,
  Icon,
  Input,
  SegmentedControl,
  SimplePagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@asset/ui";
import { ContactSelect, ContactSetting } from "./ContactCardDesign";
import {
  LIBRARY_ASSETS,
  libraryPage,
  libraryResults,
  reorderAsset,
  type EditorLibraryValue,
  type LibraryAsset,
  type LibraryRule,
} from "./libraryTableModels";
import "./editor-library-table.css";
export {
  SAMPLE_LIBRARY,
  EMPTY_LIBRARY,
  LIBRARY_ASSETS,
} from "./libraryTableModels";
export type { EditorLibraryValue, LibraryAsset } from "./libraryTableModels";
const fields = [
  { id: "tags", label: "Tags" },
  { id: "type", label: "File Type" },
  { id: "internal", label: "Internal" },
  { id: "views", label: "Views" },
  { id: "shares", label: "Shares" },
];
const ruleSummary = (rule: LibraryRule) =>
  `${fields.find((f) => f.id === rule.field)?.label} ${rule.operator === "excludes" ? "does not contain" : rule.operator === "gt" ? "is greater than" : rule.operator === "lt" ? "is less than" : rule.operator === "eq" ? "is" : "is any of"} ${rule.values.map((v) => (v === "true" ? "Yes" : v === "false" ? "No" : v)).join(", ")}`;
export function EditorLibraryList({
  value,
  onChange,
  assets = LIBRARY_ASSETS,
  panelHost,
  active = true,
  onPanelChange,
}: {
  value: EditorLibraryValue;
  onChange: (value: EditorLibraryValue) => void;
  assets?: LibraryAsset[];
  panelHost?: HTMLElement | null;
  active?: boolean;
  onPanelChange?: (open: boolean) => void;
}) {
  const [panel, setPanel] = useState(false),
    [picker, setPicker] = useState(false),
    [query, setQuery] = useState(""),
    [pending, setPending] = useState<string[]>([]),
    [preview, setPreview] = useState<LibraryAsset>(),
    [confirm, setConfirm] = useState(false),
    [page, setPage] = useState(1);
  useEffect(() => {
    if (!active) setPanel(false);
  }, [active]);
  useEffect(() => {
    onPanelChange?.(panel);
    return () => onPanelChange?.(false);
  }, [panel, onPanelChange]);
  const [editing, setEditing] = useState<{
    group: number;
    rule: LibraryRule;
  } | null>(null);
  const [drop, setDrop] = useState<string>();
  const drag = useRef<{ id: string; target?: string } | null>(null);
  const results = libraryResults(value, assets),
    paged = libraryPage(
      results,
      page,
      value.view === "carousel" ? 1 : value.pageSize,
    );
  const patch = (next: Partial<EditorLibraryValue>) => {
    onChange({ ...value, ...next });
    setPage(1);
  };
  const openPicker = () => {
    setPending([]);
    setQuery("");
    setPicker(true);
  };
  const addRule = (group: number) => {
    setPanel(true);
    setEditing({
      group,
      rule: {
        id: crypto.randomUUID(),
        field: "type",
        operator: "includes",
        values: [],
      },
    });
  };
  const commitRule = () => {
    if (!editing || !editing.rule.values.length) return;
    const groups = value.groups.map((group) => [...group]);
    groups[editing.group] ??= [];
    const index = groups[editing.group].findIndex(
      (rule) => rule.id === editing.rule.id,
    );
    if (index < 0) groups[editing.group].push(editing.rule);
    else groups[editing.group][index] = editing.rule;
    patch({ groups });
    setEditing(null);
  };
  const closePanel = () => {
    setPanel(false);
    setEditing(null);
  };
  const reorder = (id: string, target: string) =>
    patch({ selected: reorderAsset(value.selected, id, target) });
  const dataPanel = (
    <aside className="elt-panel" aria-label="Library list data">
      <header>
        <strong>Library list data</strong>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Close library data"
          leadingIcon={<Icon name="panel-right" size={18} />}
          onClick={closePanel}
        />
      </header>
      <div className="elt-panel-body">
        {editing ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<Icon name="chevron-left" size={16} />}
              onClick={() => setEditing(null)}
            >
              Back
            </Button>
            <ContactSetting label="Filter">
              <ContactSelect
                label="Filter field"
                value={editing.rule.field}
                options={fields}
                onChange={(field) =>
                  setEditing({
                    ...editing,
                    rule: {
                      ...editing.rule,
                      field: field as LibraryRule["field"],
                      operator:
                        field === "views" || field === "shares"
                          ? "gt"
                          : "includes",
                      values: [],
                    },
                  })
                }
              />
            </ContactSetting>
            <ContactSelect
              label="Filter operator"
              value={editing.rule.operator}
              options={
                editing.rule.field === "views" ||
                editing.rule.field === "shares"
                  ? [
                      { id: "gt", label: "is greater than" },
                      { id: "lt", label: "is less than" },
                      { id: "eq", label: "is" },
                    ]
                  : [
                      {
                        id: "includes",
                        label:
                          editing.rule.field === "internal"
                            ? "is"
                            : "is any of",
                      },
                      {
                        id: "excludes",
                        label:
                          editing.rule.field === "internal"
                            ? "is not"
                            : "does not contain",
                      },
                    ]
              }
              onChange={(operator) =>
                setEditing({
                  ...editing,
                  rule: {
                    ...editing.rule,
                    operator: operator as LibraryRule["operator"],
                  },
                })
              }
            />
            {editing.rule.field === "views" ||
            editing.rule.field === "shares" ? (
              <Input
                aria-label="Filter value"
                type="number"
                min={0}
                value={editing.rule.values[0] ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    rule: {
                      ...editing.rule,
                      values:
                        e.target.value === ""
                          ? []
                          : [String(Math.max(0, Number(e.target.value)))],
                    },
                  })
                }
              />
            ) : (
              <div className="elt-rule-values">
                {(editing.rule.field === "type"
                  ? ["PDF", "Image", "Link"]
                  : editing.rule.field === "internal"
                    ? ["true", "false"]
                    : [...new Set(assets.flatMap((a) => a.tags))]
                ).map((v) => (
                  <label key={v}>
                    <Checkbox
                      tabIndex={0}
                      ariaLabel={
                        v === "true"
                          ? "Internal"
                          : v === "false"
                            ? "External"
                            : v
                      }
                      state={editing.rule.values.includes(v) ? "on" : "off"}
                      onToggle={() =>
                        setEditing({
                          ...editing,
                          rule: {
                            ...editing.rule,
                            values: editing.rule.values.includes(v)
                              ? editing.rule.values.filter((x) => x !== v)
                              : [...editing.rule.values, v],
                          },
                        })
                      }
                    />
                    <span>
                      {v === "true"
                        ? "Internal"
                        : v === "false"
                          ? "External"
                          : v}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <Button disabled={!editing.rule.values.length} onClick={commitRule}>
              Apply filter
            </Button>
          </>
        ) : (
          <>
            <small className="elt-muted">Source</small>
            <div className="elt-row">
              <span>
                <Icon
                  name={value.source === "selected" ? "check" : "filter"}
                  size={16}
                />{" "}
                {value.source === "selected"
                  ? "Selected assets"
                  : "Filtered list"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirm(true)}
              >
                Change
              </Button>
            </div>
            <p className="elt-muted">
              {value.source === "selected"
                ? "A fixed set of assets in the order you set."
                : "Assets matching these rules get shown. Updated automatically."}
            </p>
            <ContactSetting label="View">
              <SegmentedControl
                aria-label="Library view"
                size="sm"
                value={value.view}
                onChange={(view) =>
                  patch({ view: view as EditorLibraryValue["view"] })
                }
                items={[
                  { value: "grid", label: "Grid" },
                  { value: "table", label: "Table" },
                  { value: "carousel", label: "Carousel" },
                ]}
              />
            </ContactSetting>
            {value.view !== "carousel" && (
              <ContactSetting label="Items per page">
                <ContactSelect
                  label="Items per page"
                  value={String(value.pageSize)}
                  options={[3, 6, 12].map((n) => ({
                    id: String(n),
                    label: String(n),
                  }))}
                  onChange={(n) => patch({ pageSize: Number(n) })}
                />
              </ContactSetting>
            )}
            {value.source === "selected" ? (
              <>
                <div className="elt-row">
                  <strong>Assets</strong>
                  <span>{results.length}</span>
                </div>
                <div className="elt-asset-order">
                  {results.map((asset, index) => (
                    <div
                      key={asset.id}
                      data-library-asset-id={asset.id}
                      data-drop={drop === asset.id || undefined}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Reorder ${asset.name}`}
                        className="elt-grip"
                        leadingIcon={<Icon name="grip-vertical" size={14} />}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          e.preventDefault();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          drag.current = { id: asset.id };
                        }}
                        onPointerMove={(e) => {
                          if (!drag.current) return;
                          const hit = document
                            .elementFromPoint(e.clientX, e.clientY)
                            ?.closest<HTMLElement>("[data-library-asset-id]");
                          drag.current.target =
                            hit &&
                            e.currentTarget
                              .closest(".elt-asset-order")
                              ?.contains(hit)
                              ? hit.dataset.libraryAssetId
                              : undefined;
                          setDrop(drag.current.target);
                        }}
                        onPointerUp={(e) => {
                          const d = drag.current;
                          drag.current = null;
                          setDrop(undefined);
                          if (e.currentTarget.hasPointerCapture(e.pointerId))
                            e.currentTarget.releasePointerCapture(e.pointerId);
                          if (d?.target) reorder(d.id, d.target);
                        }}
                        onPointerCancel={() => {
                          drag.current = null;
                          setDrop(undefined);
                        }}
                        onLostPointerCapture={() => {
                          drag.current = null;
                          setDrop(undefined);
                        }}
                      />
                      <span className="elt-asset-name">{asset.name}</span>
                      <Dropdown
                        listHeight="auto"
                        items={[
                          { id: "up", label: "Move up", disabled: index === 0 },
                          {
                            id: "down",
                            label: "Move down",
                            disabled: index === results.length - 1,
                          },
                          { id: "remove", label: "Remove asset" },
                        ]}
                        onChange={(action) =>
                          action === "remove"
                            ? patch({
                                selected: value.selected.filter(
                                  (id) => id !== asset.id,
                                ),
                              })
                            : reorder(
                                asset.id,
                                results[index + (action === "up" ? -1 : 1)].id,
                              )
                        }
                        trigger={
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Options for ${asset.name}`}
                            leadingIcon={<Icon name="ellipsis" size={16} />}
                          />
                        }
                      />
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="neutral"
                  leadingIcon={<Icon name="plus" size={16} />}
                  onClick={openPicker}
                >
                  Add assets
                </Button>
              </>
            ) : (
              <>
                <strong>Filters</strong>
                {value.groups.map((group, g) => (
                  <div className="elt-rule-group" key={g}>
                    {g > 0 && <small>Or</small>}
                    {group.map((rule, r) => (
                      <div key={rule.id}>
                        {r > 0 && <small>And</small>}
                        <div className="elt-row">
                          <button
                            className="elt-rule"
                            onClick={() =>
                              setEditing({
                                group: g,
                                rule: structuredClone(rule),
                              })
                            }
                          >
                            {ruleSummary(rule)}
                          </button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Remove ${ruleSummary(rule)}`}
                            leadingIcon={<Icon name="x" size={14} />}
                            onClick={() =>
                              patch({
                                groups: value.groups
                                  .map((items, i) =>
                                    i === g
                                      ? items.filter(
                                          (item) => item.id !== rule.id,
                                        )
                                      : items,
                                  )
                                  .filter((items) => items.length),
                              })
                            }
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="neutral"
                      onClick={() => addRule(g)}
                    >
                      And
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="neutral"
                  onClick={() => addRule(value.groups.length)}
                >
                  {value.groups.length ? "Or" : "Add rules"}
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
  return (
    <div className="elt-layout">
      <section className="elt-library" aria-label="Library list widget">
        <EditorWidgetToolbar className="elt-widget-toolbar">
          <Icon name="layout-grid" size={16} />
          <span>Library list</span>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Edit library data"
            leadingIcon={<Icon name="database" size={16} />}
            onClick={() => setPanel(!panel)}
          />
        </EditorWidgetToolbar>
        {results.length === 0 ? (
          <div className="elt-empty">
            <Icon name="library" size={28} />
            <strong>
              {value.source === "filtered"
                ? value.groups.length
                  ? "No matching assets"
                  : "No rules yet"
                : "No assets selected"}
            </strong>
            <p>
              {value.source === "filtered"
                ? "Add rules to choose which library assets show here."
                : "Choose assets from your library."}
            </p>
            <Button
              onClick={() =>
                value.source === "selected"
                  ? openPicker()
                  : addRule(value.groups.length)
              }
            >
              {value.source === "selected" ? "Add assets" : "Add rules"}
            </Button>
          </div>
        ) : value.view === "table" ? (
          <Table aria-label="Library assets">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>File type</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.items.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <button
                      className="elt-asset-link"
                      onClick={() => setPreview(asset)}
                    >
                      <Icon
                        name={
                          asset.type === "Image"
                            ? "image"
                            : asset.type === "PDF"
                              ? "file-text"
                              : "link"
                        }
                        size={18}
                      />
                      {asset.name}
                    </button>
                  </TableCell>
                  <TableCell>{asset.type}</TableCell>
                  <TableCell>{asset.tags.join(", ")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className={`elt-assets elt-assets--${value.view}`}>
            {paged.items.map((asset) => (
              <button
                className="elt-asset"
                key={asset.id}
                onClick={() => setPreview(asset)}
              >
                <div className="elt-asset-cover">
                  {asset.thumbnail ? (
                    <img src={asset.thumbnail} alt="" />
                  ) : (
                    <Icon
                      name={asset.type === "PDF" ? "file-text" : "link"}
                      size={40}
                    />
                  )}
                  <span className="elt-asset-open">
                    {asset.type === "PDF"
                      ? "View PDF"
                      : asset.type === "Link"
                        ? "View link"
                        : "View image"}
                  </span>
                </div>
                <div className="elt-asset-caption">
                  <span>{asset.name}</span>
                  <small>{asset.type}</small>
                </div>
              </button>
            ))}
          </div>
        )}
        {results.length > 0 &&
          (value.view === "carousel" ? (
            <div className="elt-carousel-nav">
              <Button
                variant="neutral"
                size="sm"
                aria-label="Previous asset"
                disabled={paged.page === 1}
                leadingIcon={<Icon name="chevron-left" size={16} />}
                onClick={() => setPage(paged.page - 1)}
              />
              <span>
                {paged.page} / {results.length}
              </span>
              <Button
                variant="neutral"
                size="sm"
                aria-label="Next asset"
                disabled={paged.page === results.length}
                leadingIcon={<Icon name="chevron-right" size={16} />}
                onClick={() => setPage(paged.page + 1)}
              />
            </div>
          ) : (
            results.length > value.pageSize && (
              <SimplePagination
                page={paged.page}
                total={results.length}
                pageSize={value.pageSize}
                onPageChange={setPage}
              />
            )
          ))}
        {results.length > 0 && value.source === "selected" && (
          <Button
            variant="ghost"
            className="elt-add-assets"
            leadingIcon={<Icon name="plus" size={16} />}
            onClick={openPicker}
          >
            Add assets
          </Button>
        )}
      </section>
      {panel && (panelHost ? createPortal(dataPanel, panelHost) : dataPanel)}
      {picker &&
        createPortal(
          <Dialog
            open
            width={800}
            onClose={() => setPicker(false)}
            ariaLabel="Add assets"
            overlayClassName="widget-pilot-overlay"
          >
            <DialogHeader title="Add assets" onClose={() => setPicker(false)} />
            <DialogBody>
              <Input
                aria-label="Search assets"
                placeholder="Search assets..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                leadingIcon={<Icon name="search" size={16} />}
              />
              <div className="elt-picker">
                {assets
                  .filter((a) =>
                    a.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((asset) => (
                    <div key={asset.id}>
                      {value.selected.includes(asset.id) ? (
                        <span
                          className="elt-already-added"
                          aria-label={`${asset.name} already added`}
                        >
                          <Icon name="check" size={18} />
                        </span>
                      ) : (
                        <Checkbox
                          tabIndex={0}
                          ariaLabel={`Select ${asset.name}`}
                          state={pending.includes(asset.id) ? "on" : "off"}
                          onToggle={() =>
                            setPending(
                              pending.includes(asset.id)
                                ? pending.filter((id) => id !== asset.id)
                                : [...pending, asset.id],
                            )
                          }
                        />
                      )}
                      <button onClick={() => setPreview(asset)}>
                        {asset.thumbnail ? (
                          <img src={asset.thumbnail} alt="" />
                        ) : (
                          <Icon name="file-text" size={22} />
                        )}
                        <span>
                          {asset.name}
                          <small>
                            {asset.type} · {asset.tags.join(", ")}
                            {value.selected.includes(asset.id)
                              ? " · Already added"
                              : ""}
                          </small>
                        </span>
                      </button>
                    </div>
                  ))}
              </div>
              {!assets.some((a) =>
                a.name.toLowerCase().includes(query.toLowerCase()),
              ) && <p>No assets found.</p>}
            </DialogBody>
            <DialogFooter>
              <span className="elt-muted">
                {pending.length
                  ? `${pending.length} selected`
                  : "Select assets to add them to this list"}
              </span>
              <Button variant="neutral" onClick={() => setPicker(false)}>
                Cancel
              </Button>
              <Button
                disabled={!pending.length}
                onClick={() => {
                  patch({
                    selected: [
                      ...value.selected,
                      ...pending.filter((id) => !value.selected.includes(id)),
                    ],
                  });
                  setPicker(false);
                }}
              >
                Add {pending.length === 1 ? "asset" : "assets"}
              </Button>
            </DialogFooter>
          </Dialog>,
          document.body,
        )}
      {confirm &&
        createPortal(
          <Dialog
            open
            width={440}
            ariaLabel="Change how this list is built?"
            onClose={() => setConfirm(false)}
            overlayClassName="widget-pilot-overlay"
          >
            <DialogHeader title="Change how this list is built?" />
            <DialogBody>
              Switching to{" "}
              {value.source === "selected"
                ? "a filtered list removes your selected assets. Rules will decide what shows instead."
                : "selected assets removes your rules. You’ll pick exactly which assets show instead."}
            </DialogBody>
            <DialogFooter>
              <Button variant="neutral" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  patch({
                    source:
                      value.source === "selected" ? "filtered" : "selected",
                    selected: [],
                    groups: [],
                  });
                  setConfirm(false);
                }}
              >
                Switch to{" "}
                {value.source === "selected"
                  ? "filtered list"
                  : "selected assets"}
              </Button>
            </DialogFooter>
          </Dialog>,
          document.body,
        )}
      {preview &&
        createPortal(
          <Dialog
            open
            width={800}
            ariaLabel={preview.name}
            onClose={() => setPreview(undefined)}
            overlayClassName="widget-pilot-overlay"
          >
            <DialogHeader
              title={preview.name}
              onClose={() => setPreview(undefined)}
            />
            <DialogBody>
              {preview.type === "PDF" ? (
                <iframe
                  className="elt-pdf"
                  src={preview.url}
                  title={preview.name}
                />
              ) : preview.type === "Image" ? (
                <img
                  className="elt-preview-image"
                  src={preview.url}
                  alt={preview.name}
                />
              ) : (
                <p>{preview.url}</p>
              )}
            </DialogBody>
            <DialogFooter>
              <a
                className="elt-asset-link"
                href={preview.url}
                target="_blank"
                rel="noreferrer"
                download={preview.type !== "Link" || undefined}
              >
                <Icon
                  name={preview.type === "Link" ? "external-link" : "download"}
                  size={16}
                />
                {preview.type === "Link" ? "Open link" : "Download"}
              </a>
            </DialogFooter>
          </Dialog>,
          document.body,
        )}
    </div>
  );
}
