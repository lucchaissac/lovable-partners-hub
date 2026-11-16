import {usePresentationWidgetDesign,WidgetCellDesign} from './EditorWidgetDesign';
import {EditorWidgetToolbar} from './EditorWidgetToolbar';
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  Button,
  Dropdown,
  Icon,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@asset/ui";
import {
  ContactColor,
  ContactSelect,
  ContactSetting,
  NumberField,
} from "./ContactCardDesign";
import {
  changeTableStructure,
  columnName,
  DEFAULT_CELL_STYLE,
  styleTableSelection,
  type CellStyle,
  type EditorTableValue,
  type TableSelection,
} from "./libraryTableModels";
import "./editor-library-table.css";
export { SAMPLE_TABLE, EMPTY_TABLE } from "./libraryTableModels";
export type { EditorTableValue } from "./libraryTableModels";
export function EditorTable({
  value,
  onChange,
  panelHost,
  active = true,
  onPanelChange,
}: {
  value: EditorTableValue;
  onChange: (value: EditorTableValue) => void;
  panelHost?: HTMLElement | null;
  active?: boolean;
  onPanelChange?: (open: boolean) => void;
}) {
  const presentationDesign=usePresentationWidgetDesign();
  const [selected, setSelected] = useState<TableSelection>({
      row: value.rows[0].id,
      column: value.columns[0],
      scope: "cell",
    }),
    [panel, setPanel] = useState(false);
  useEffect(() => {
    if (!active) setPanel(false);
  }, [active]);
  useEffect(() => {
    onPanelChange?.(panel);
    return () => onPanelChange?.(false);
  }, [panel, onPanelChange]);
  const [past, setPast] = useState<EditorTableValue[]>([]),
    [future, setFuture] = useState<EditorTableValue[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const rowIndex = Math.max(
      0,
      value.rows.findIndex((row) => row.id === selected.row),
    ),
    columnIndex = Math.max(0, value.columns.indexOf(selected.column));
  const selection = {
    ...selected,
    row: value.rows[rowIndex].id,
    column: value.columns[columnIndex],
  };
  const cell = value.rows[rowIndex].cells[columnIndex],
    style = { ...DEFAULT_CELL_STYLE, ...cell.style };
  const address = `${columnName(columnIndex)}${rowIndex + 1}`;
  const label =
    selection.scope === "row"
      ? `Row - ${rowIndex + 1}`
      : selection.scope === "column"
        ? `Column - ${columnName(columnIndex)}`
        : `Cell - ${address}`;
  const commit = (next: EditorTableValue) => {
    if (next === value) return;
    setPast((items) => [...items.slice(-99), value]);
    setFuture([]);
    onChange(next);
  };
  const undo = () => {
    if (!past.length) return;
    setFuture((items) => [value, ...items]);
    onChange(past[past.length - 1]);
    setPast(past.slice(0, -1));
  };
  const redo = () => {
    if (!future.length) return;
    setPast((items) => [...items, value]);
    onChange(future[0]);
    setFuture(future.slice(1));
  };
  const patch = (changes: Partial<CellStyle>) =>
    commit(styleTableSelection(value, selection, changes));
  const select = (
    row: number,
    column: number,
    scope: TableSelection["scope"],
    open = false,
  ) => {
    setSelected({
      row: value.rows[row].id,
      column: value.columns[column],
      scope,
    });
    if (open) setPanel(true);
  };
  const focusCell = (row: number, column: number) => {
    const r = Math.max(0, Math.min(value.rows.length - 1, row)),
      c = Math.max(0, Math.min(value.columns.length - 1, column));
    root.current
      ?.querySelector<HTMLTextAreaElement>(
        `textarea[data-row="${r}"][data-column="${c}"]`,
      )
      ?.focus();
  };
  const design = presentationDesign?<WidgetCellDesign label={label} value={style} onChange={patch} onClose={()=>setPanel(false)} onReset={()=>commit(styleTableSelection(value,selection,null))}/> : (
    <aside className="elt-panel" aria-label="Cells Design">
      <header>
        <strong>
          {selection.scope === "cell" ? "Cell Design" : "Cells Design"}
        </strong>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Close cell design"
          leadingIcon={<Icon name="panel-right" size={18} />}
          onClick={() => setPanel(false)}
        />
      </header>
      <div className="elt-panel-body">
        <strong>{label}</strong>
        <ContactSetting label="Background">
          <ContactColor
            label="Cell background"
            value={style.background}
            onChange={(background) => patch({ background })}
          />
        </ContactSetting>
        <div className="ewb-setting-group">
          <span>Font</span>
          <div className="ewb-font-row">
            <ContactColor
              label="Cell text color"
              value={style.color}
              onChange={(color) => patch({ color })}
            />
            <NumberField
              label="Cell font size"
              min={8}
              max={96}
              value={style.size}
              onChange={(size) => patch({ size })}
            />
            <ContactSelect
              label="Cell font weight"
              value={String(style.weight)}
              options={[
                { id: "400", label: "Regular" },
                { id: "500", label: "Medium" },
                { id: "600", label: "Bold" },
              ]}
              onChange={(weight) => patch({ weight: Number(weight) })}
            />
          </div>
        </div>
        <ContactSetting label="Decoration">
          {(["bold", "italic", "underline"] as const).map((mark) => (
            <Button
              key={mark}
              variant="neutral"
              size="sm"
              aria-label={`Cell ${mark}`}
              active={mark === "bold" ? style.weight >= 600 : style[mark]}
              leadingIcon={<Icon name={mark} size={14} />}
              onClick={() =>
                patch(
                  mark === "bold"
                    ? { weight: style.weight >= 600 ? 400 : 600 }
                    : { [mark]: !style[mark] },
                )
              }
            />
          ))}
        </ContactSetting>
        <ContactSetting label="Letter spacing">
          <NumberField
            label="Cell letter spacing"
            min={-2}
            max={10}
            step={0.1}
            value={style.spacing}
            onChange={(spacing) => patch({ spacing })}
          />
        </ContactSetting>
        <ContactSetting label="Line spacing">
          <NumberField
            label="Cell line spacing"
            min={0.8}
            max={3}
            step={0.1}
            value={style.line}
            onChange={(line) => patch({ line })}
          />
        </ContactSetting>
        <ContactSetting label="Text alignment">
          {(["left", "center", "right"] as const).map((align) => (
            <Button
              key={align}
              variant="neutral"
              size="sm"
              aria-label={`Align ${align}`}
              active={style.align === align}
              leadingIcon={<Icon name={`align-${align}`} size={14} />}
              onClick={() => patch({ align })}
            />
          ))}
        </ContactSetting>
        <ContactSetting label="Vertical alignment">
          <ContactSelect
            label="Vertical alignment"
            value={style.vertical}
            options={[
              { id: "top", label: "Top" },
              { id: "middle", label: "Middle" },
              { id: "bottom", label: "Bottom" },
            ]}
            onChange={(vertical) =>
              patch({ vertical: vertical as CellStyle["vertical"] })
            }
          />
        </ContactSetting>

      </div>
      <footer>
        <Button
          onClick={() => commit(styleTableSelection(value, selection, null))}
        >
          Reset {label} changes
        </Button>
      </footer>
    </aside>
  );
  return (
    <div
      className="elt-layout"
      ref={root}
      onKeyDown={(event) => {
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "z"
        ) {
          event.preventDefault();
          event.shiftKey ? redo() : undo();
        }
      }}
    >
      <section className="elt-table-widget" aria-label="Editable table widget">
        <EditorWidgetToolbar className="elt-widget-toolbar">
          <Icon name="table" size={16} />
          <span>Table</span>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Edit cell design"
            leadingIcon={<Icon name="paintbrush-vertical" size={16} />}
            onClick={() => setPanel(!panel)}
          />
          <Dropdown
            listHeight="auto"
            items={[
              { id: "row-before", label: "Insert row above" },
              { id: "row-after", label: "Insert row below" },
              { id: "column-before", label: "Insert column left" },
              { id: "column-after", label: "Insert column right" },
              {
                id: "row-remove",
                label: "Delete row",
                disabled: value.rows.length === 1,
              },
              {
                id: "column-remove",
                label: "Delete column",
                disabled: value.columns.length === 1,
              },
            ]}
            onChange={(action) => {
              const [axis, operation] = action.split("-") as [
                "row" | "column",
                "before" | "after" | "remove",
              ];
              commit(
                changeTableStructure(
                  value,
                  axis,
                  axis === "row" ? rowIndex : columnIndex,
                  operation,
                ),
              );
            }}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                aria-label="Table actions"
                leadingIcon={<Icon name="ellipsis" size={16} />}
              />
            }
          />
          <span className="elt-toolbar-spacer" />
          <Button
            variant="ghost"
            size="sm"
            aria-label="Undo table change"
            disabled={!past.length}
            leadingIcon={<Icon name="undo-2" size={16} />}
            onClick={undo}
          />
          <Button
            variant="ghost"
            size="sm"
            aria-label="Redo table change"
            disabled={!future.length}
            leadingIcon={<Icon name="redo-2" size={16} />}
            onClick={redo}
          />
        </EditorWidgetToolbar>
        <Table
          className="elt-editable-table"
          aria-label="Editable cells"
          style={{ minWidth: Math.max(360, value.columns.length * 150) }}
        >
          <TableHeader>
            <TableRow>
              <TableHead className="elt-table-axis" />
              <>
                {value.columns.map((column, c) => (
                  <TableHead key={column}>
                    <button
                      className="elt-axis-button"
                      aria-label={`Design column ${columnName(c)}`}
                      aria-pressed={
                        selection.scope === "column" &&
                        selection.column === column
                      }
                      onClick={() => select(rowIndex, c, "column", true)}
                    >
                      {columnName(c)}
                    </button>
                  </TableHead>
                ))}
              </>
            </TableRow>
          </TableHeader>
          <TableBody>
            {value.rows.map((row, r) => (
              <TableRow key={row.id}>
                <TableCell className="elt-table-axis">
                  <button
                    className="elt-axis-button"
                    aria-label={`Design row ${r + 1}`}
                    aria-pressed={
                      selection.scope === "row" && selection.row === row.id
                    }
                    onClick={() => select(r, columnIndex, "row", true)}
                  >
                    {r + 1}
                  </button>
                </TableCell>
                {row.cells.map((item, c) => {
                  const cellStyle = { ...DEFAULT_CELL_STYLE, ...item.style };
                  const active =
                    selection.scope === "row"
                      ? selection.row === row.id
                      : selection.scope === "column"
                        ? selection.column === value.columns[c]
                        : selection.row === row.id &&
                          selection.column === value.columns[c];
                  const css: CSSProperties = {
                    background: cellStyle.background,
                    verticalAlign: cellStyle.vertical,
                  };
                  return (
                    <TableCell
                      key={item.id}
                      className="elt-editable-cell"
                      data-selected={active || undefined}
                      style={css}
                    >
                      <textarea
                        aria-label={`Cell ${columnName(c)}${r + 1}`}
                        rows={Math.max(1, item.text.split("\n").length)}
                        data-row={r}
                        data-column={c}
                        value={item.text}
                        style={{
                          fontSize: cellStyle.size,
                          fontWeight: cellStyle.weight,
                          color: cellStyle.color,
                          fontStyle: cellStyle.italic ? "italic" : "normal",
                          textDecoration: cellStyle.underline
                            ? "underline"
                            : "none",
                          letterSpacing: cellStyle.spacing,
                          lineHeight: cellStyle.line,
                          textTransform: "none",
                          textAlign: cellStyle.align,
                        }}
                        onFocus={() => select(r, c, "cell")}
                        onChange={(e) =>
                          commit({
                            ...value,
                            rows: value.rows.map((v, i) =>
                              i !== r
                                ? v
                                : {
                                    ...v,
                                    cells: v.cells.map((a, j) =>
                                      j === c
                                        ? { ...a, text: e.target.value }
                                        : a,
                                    ),
                                  },
                            ),
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Tab") {
                            const at =
                              r * value.columns.length +
                              c +
                              (e.shiftKey ? -1 : 1);
                            if (
                              at >= 0 &&
                              at < value.rows.length * value.columns.length
                            ) {
                              e.preventDefault();
                              focusCell(
                                Math.floor(at / value.columns.length),
                                at % value.columns.length,
                              );
                            }
                          }
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            focusCell(r + 1, c);
                          }
                        }}
                      />
                      {active && selection.scope === "cell" && (
                        <Button
                          className="elt-cell-paint"
                          variant="neutral"
                          size="sm"
                          aria-label={`Design cell ${columnName(c)}${r + 1}`}
                          leadingIcon={
                            <Icon name="paintbrush-vertical" size={14} />
                          }
                          onClick={() => setPanel(true)}
                        />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      {panel && (panelHost ? createPortal(design, panelHost) : design)}
    </div>
  );
}
