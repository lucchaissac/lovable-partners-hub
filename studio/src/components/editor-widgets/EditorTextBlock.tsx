import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Button, ColorPicker, Dropdown, Icon, Input, Tooltip, TriggerField } from '@asset/ui';
import './editor-widget-blocks.css';

export type TextRun = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };
export type EditorTextValue = {
  runs: TextRun[];
  style: 'Heading 1' | 'Heading 2' | 'Heading 3' | 'Text' | 'Small text';
  size: number;
  align: 'left' | 'center' | 'right';
  color: string;
};
export const SAMPLE_TEXT: EditorTextValue = {
  runs: [{ text: 'Project overview\nA shared place to prepare the kickoff, review progress, and plan the launch.' }],
  style: 'Text', size: 16, align: 'left', color: 'var(--ui-text)',
};
const styles = { 'Heading 1': 32, 'Heading 2': 24, 'Heading 3': 20, Text: 16, 'Small text': 12 };

/** Persist text and supported marks, never pasted HTML or executable markup. */
export function textRunsFromElement(root: HTMLElement): TextRun[] {
  const runs: TextRun[] = [];
  function visit(node: Node, marks: Omit<TextRun, 'text'> = {}) {
    if (node.nodeType === Node.TEXT_NODE) { if (node.textContent) runs.push({ text: node.textContent, ...marks }); return; }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === 'BR') { runs.push({ text: '\n', ...marks }); return; }
    if (node !== root && ['DIV', 'P'].includes(node.tagName) && runs.length) runs.push({ text: '\n' });
    const weight = node.style.fontWeight;
    const next = { ...marks,
      ...(['B', 'STRONG'].includes(node.tagName) || weight === 'bold' || Number(weight) >= 600 ? { bold: true } : weight ? { bold: false } : {}),
      ...(['I', 'EM'].includes(node.tagName) || node.style.fontStyle === 'italic' ? { italic: true } : node.style.fontStyle === 'normal' ? { italic: false } : {}),
      ...(node.tagName === 'U' || node.style.textDecoration.includes('underline') ? { underline: true } : node.style.textDecoration === 'none' ? { underline: false } : {}),
    };
    node.childNodes.forEach(child => visit(child, next));
  }
  root.childNodes.forEach(node => visit(node));
  return runs;
}

/** Controlled content, selection-aware formatting, and Asset controls. No Studio dependency. */
export function EditorTextBlock({ value, onChange, editable = true, toolbarHost }: {
  value: EditorTextValue; onChange: (value: EditorTextValue) => void; editable?: boolean; toolbarHost?: HTMLElement | null;
}) {
  const root = useRef<HTMLDivElement>(null);
  const range = useRef<Range | null>(null);
  const lastWritten = useRef('');
  const [marks, setMarks] = useState({ bold: false, italic: false, underline: false });
  const [customColors, setCustomColors] = useState<string[]>([]);
  // Keep native selection/undo intact during typing; synchronize external updates only.
  useLayoutEffect(() => {
    const serialized = JSON.stringify(value.runs);
    if (!root.current || lastWritten.current === serialized) return;
    root.current.replaceChildren(...value.runs.map(run => {
      const span = document.createElement('span'); span.textContent = run.text;
      if (run.bold !== undefined) span.style.fontWeight = run.bold ? '600' : '400';
      if (run.italic !== undefined) span.style.fontStyle = run.italic ? 'italic' : 'normal';
      if (run.underline !== undefined) span.style.textDecoration = run.underline ? 'underline' : 'none';
      return span;
    }));
    lastWritten.current = serialized;
  }, [value.runs]);
  useEffect(() => {
    const track = () => {
      const selection = window.getSelection();
      if (!selection?.rangeCount || !root.current?.contains(selection.anchorNode)) return;
      range.current = selection.getRangeAt(0).cloneRange();
      setMarks({ bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'), underline: document.queryCommandState('underline') });
    };
    document.addEventListener('selectionchange', track); return () => document.removeEventListener('selectionchange', track);
  }, []);
  const commit = () => { if (!root.current) return; const runs = textRunsFromElement(root.current); lastWritten.current = JSON.stringify(runs); onChange({ ...value, runs }); };
  const format = (command: string) => {
    root.current?.focus();
    const selection = window.getSelection();
    if (range.current && root.current?.contains(range.current.commonAncestorContainer)) { selection?.removeAllRanges(); selection?.addRange(range.current); }
    document.execCommand(command); commit();
    setMarks({ bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'), underline: document.queryCommandState('underline') });
  };
  const formatting = <div className="ewb-text-toolbar" role="toolbar" aria-label="Text formatting">
      <Dropdown value={value.style} listHeight="auto" onChange={style => onChange({ ...value, style: style as EditorTextValue['style'], size: styles[style as keyof typeof styles] })} items={Object.keys(styles).map(id => ({ id, label: id }))} trigger={<TriggerField size="sm" aria-label="Text style">{value.style}</TriggerField>} />
      <Input inputSize="sm" type="number" min={1} max={1000} step={1} className="ewb-text-size" aria-label="Font size" value={value.size} onChange={event => { const size = Math.round(Number(event.target.value)); if (size >= 1 && size <= 1000) onChange({ ...value, size }); }} onKeyDown={event=>{if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();onChange({...value,size:Math.max(1,Math.min(1000,Math.round(value.size)+(event.key==='ArrowUp'?1:-1)*(event.shiftKey?10:1)))});}}} />
      <span className="ewb-toolbar-divider" />
      {(['bold', 'italic', 'underline'] as const).map(formatName => <Tooltip key={formatName} label={formatName[0].toUpperCase() + formatName.slice(1)}><Button size="sm" variant="ghost" aria-label={formatName[0].toUpperCase() + formatName.slice(1)} aria-pressed={marks[formatName]} active={marks[formatName]} leadingIcon={<Icon name={formatName} size={14} />} onMouseDown={event => event.preventDefault()} onClick={() => format(formatName)} /></Tooltip>)}
      <ColorPicker aria-label="Text color" value={value.color.startsWith('var(') ? '#121722' : value.color} onChange={color => onChange({ ...value, color })} customColors={customColors} onAddCustomColor={color => setCustomColors(current => [...current, color])} onUpdateCustomColor={(index, color) => setCustomColors(current => current.map((item, i) => i === index ? color : item))} />
      <span className="ewb-toolbar-divider" />
      {(['left', 'center', 'right'] as const).map(align => <Tooltip key={align} label={`Align ${align}`}><Button size="sm" variant="ghost" aria-label={`Align ${align}`} active={value.align === align} aria-pressed={value.align === align} leadingIcon={<Icon name={`align-${align}`} size={14} />} onClick={() => onChange({ ...value, align })} /></Tooltip>)}
    </div>;
  return <div className="ewb-text" data-editable={editable || undefined}>
    <div ref={root} className="ewb-text-content" contentEditable={editable} suppressContentEditableWarning role={editable ? 'textbox' : undefined} aria-label="Text block content" aria-multiline="true" tabIndex={editable ? 0 : undefined}
      data-placeholder={'Write or type "/" for commands…'} onInput={commit}
      onPaste={event => { event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain')); commit(); }}
      style={{ fontSize: value.size, fontWeight: value.style.startsWith('Heading') ? 600 : 400, textAlign: value.align, color: value.color } as CSSProperties} />
    {editable && (toolbarHost ? createPortal(formatting, toolbarHost) : formatting)}
  </div>;
}
