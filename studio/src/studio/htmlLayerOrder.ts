import type { HtmlBlock, HtmlEditorState } from './htmlEditorModel';

export type LayerOrderAction = 'bring-to-front' | 'bring-forward' | 'send-backward' | 'send-to-back';

// A grouped button is one layer, including when it is the neighbouring layer.
// An explicitly selected individual member can still be arranged independently.
function layerUnits(column: HtmlBlock[], selected: Set<string>) {
  const units: { blocks: HtmlBlock[]; selected: boolean }[] = [], groups = new Map<string, typeof units[number]>();
  const selectedGroups = new Set(column.filter(block => selected.has(block.id)).map(block => block.editor?.groupId).filter(Boolean));
  const partialGroups = new Set(column.filter(block => !selected.has(block.id) && selectedGroups.has(block.editor?.groupId)).map(block => block.editor?.groupId));
  for (const block of column) {
    const picked = selected.has(block.id), group = block.editor?.groupId;
    const key = group && !partialGroups.has(group) ? `${picked ? 'picked' : 'other'}:${group}` : undefined;
    let unit = key ? groups.get(key) : undefined;
    if (!unit) {
      unit = { blocks: [], selected: picked }; units.push(unit);
      if (key) groups.set(key, unit);
    }
    unit.blocks.push(block);
  }
  return units;
}

export function layerOrderAvailability(state: HtmlEditorState, ids: string[]) {
  const selected = new Set(ids);
  let forward = false, backward = false;
  for (const page of state.pages) for (const section of page.sections) for (const column of section.columns) {
    const picked = column.filter(block => selected.has(block.id));
    if (!picked.length) continue;
    if (section.locked || picked.some(block => block.editor?.locked)) return { forward: false, backward: false };
    const units = layerUnits(column, selected);
    forward ||= units.some((unit, i) => unit.selected && units.slice(i + 1).some(other => !other.selected));
    backward ||= units.some((unit, i) => unit.selected && units.slice(0, i).some(other => !other.selected));
  }
  return { forward, backward };
}

export function htmlLayerOrder(state: HtmlEditorState, ids: string[], action: LayerOrderAction): HtmlEditorState {
  const availability = layerOrderAvailability(state, ids);
  if (!(action.startsWith('bring') ? availability.forward : availability.backward)) return state;
  const selected = new Set(ids);
  return { ...state, pages: state.pages.map(page => ({ ...page, sections: page.sections.map(section => ({ ...section, columns: section.columns.map(column => {
    const units = layerUnits(column, selected), result = [...units];
    if (action === 'bring-to-front') result.sort((a, b) => Number(a.selected) - Number(b.selected));
    else if (action === 'send-to-back') result.sort((a, b) => Number(b.selected) - Number(a.selected));
    else if (action === 'bring-forward') {
      for (let i = result.length - 2; i >= 0; i--) if (result[i].selected && !result[i + 1].selected) [result[i], result[i + 1]] = [result[i + 1], result[i]];
    } else {
      for (let i = 1; i < result.length; i++) if (result[i].selected && !result[i - 1].selected) [result[i], result[i - 1]] = [result[i - 1], result[i]];
    }
    return result.every((unit, i) => unit === units[i]) ? column : result.flatMap(unit => unit.blocks);
  }) })) })) };
}
