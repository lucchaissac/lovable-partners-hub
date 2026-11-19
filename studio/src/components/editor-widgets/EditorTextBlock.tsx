import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Button, ColorPicker, Dropdown, Icon, Input, Tooltip, TriggerField } from '@asset/ui';
import './editor-widget-blocks.css';

export type TextRun = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };
export type EditorTextValue = {
  runs: TextRun[];
  inlineFormatting?: boolean;
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
      ...(['B', 'STRONG'].includes(node.tagName) || weight === 'bold' || Number(weight) >= 700 ? { bold: true } : weight ? { bold: false } : {}),
      ...(['I', 'EM'].includes(node.tagName) || node.style.fontStyle === 'italic' ? { italic: true } : node.style.fontStyle === 'normal' ? { italic: false } : {}),
      ...(node.tagName === 'U' || node.style.textDecoration.includes('underline') ? { underline: true } : node.style.textDecoration === 'none' ? { underline: false } : {}),
    };
    node.childNodes.forEach(child => visit(child, next));
  }
  root.childNodes.forEach(node => visit(node));
  return runs;
}

/** Controlled content, selection-aware formatting, and Asset controls. No Studio dependency. */
export function EditorTextBlock({ value, onChange, editable = true, toolbarHost, baseWeight, placeholder = 'Type something…', showPlaceholder = editable, onFormatBlock }: {
  value: EditorTextValue; onChange: (value: EditorTextValue) => void; editable?: boolean; toolbarHost?: HTMLElement | null; baseWeight?: number; placeholder?: string; showPlaceholder?: boolean; onFormatBlock?: (mark: 'bold'|'italic'|'underline')=>void;
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
      if (run.bold !== undefined) span.style.fontWeight = run.bold ? '700' : '600';
      if (run.italic !== undefined) span.style.fontStyle = run.italic ? 'italic' : 'normal';
      if (run.underline !== undefined) span.style.textDecoration = run.underline ? 'underline' : 'none';
      return span;
    }));
    lastWritten.current = serialized;
  }, [value.runs]);
  const boldAtSelection=()=>{
    const selection=window.getSelection(),anchor=selection?.anchorNode;
    const element=anchor instanceof HTMLElement?anchor:anchor?.parentElement;
    return Number(element?getComputedStyle(element).fontWeight:baseWeight??600)>=700;
  };
  useEffect(() => {
    const track = () => {
      const selection = window.getSelection();
      if (!selection?.rangeCount || !root.current?.contains(selection.anchorNode)) return;
      range.current = selection.getRangeAt(0).cloneRange();
      setMarks({ bold: boldAtSelection(), italic: document.queryCommandState('italic'), underline: document.queryCommandState('underline') });
    };
    document.addEventListener('selectionchange', track); return () => document.removeEventListener('selectionchange', track);
  }, []);
  const commit = () => { if (!root.current) return; const runs = textRunsFromElement(root.current); lastWritten.current = JSON.stringify(runs); onChange({ ...value, runs, ...(root.current.dataset.inlineFormatting?{inlineFormatting:true}:{}) }); };
  const format = (command: string) => {
    if(onFormatBlock&&(!range.current||range.current.collapsed)){onFormatBlock(command as 'bold'|'italic'|'underline');return;}
    root.current?.focus();
    const selection = window.getSelection();
    if (range.current && root.current?.contains(range.current.commonAncestorContainer)) { selection?.removeAllRanges(); selection?.addRange(range.current); }
    // Legacy block weights used to override every span. Materialize that visible
    // weight once before allowing character-level marks to override the block.
    if(baseWeight!==undefined&&!root.current?.dataset.inlineFormatting){
      root.current?.querySelectorAll<HTMLElement>('span').forEach(span=>{span.style.fontWeight=getComputedStyle(span).fontWeight;});
      root.current?.setAttribute('data-inline-formatting','true');
    }
    // Chromium considers 600 bold; temporarily expose it as the native normal
    // weight while the command toggles, then restore the brand's 600 minimum.
    const editor=root.current,weight=editor?.style.getPropertyValue('font-weight'),priority=editor?.style.getPropertyPriority('font-weight');
    if(command==='bold'&&editor){editor.setAttribute('data-formatting-bold','true');if(Number(getComputedStyle(editor).fontWeight)<700)editor.style.setProperty('font-weight','400','important');}
    try{document.execCommand(command);}finally{if(editor){editor.removeAttribute('data-formatting-bold');if(weight)editor.style.setProperty('font-weight',weight,priority);else editor.style.removeProperty('font-weight');}}

    commit();
    setMarks({ bold: boldAtSelection(), italic: document.queryCommandState('italic'), underline: document.queryCommandState('underline') });
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
      data-placeholder={placeholder} data-show-placeholder={showPlaceholder||undefined} data-empty={!value.runs.some(run=>run.text.trim())||undefined} data-inline-formatting={value.inlineFormatting||undefined} onInput={commit}
      onKeyDown={event=>{
        if(event.nativeEvent.isComposing||event.altKey||event.shiftKey||!(event.metaKey||event.ctrlKey))return;
        const command=({b:'bold',i:'italic',u:'underline'} as Record<string,string>)[event.key.toLowerCase()];
        if(!command)return;event.preventDefault();event.stopPropagation();
        const selection=window.getSelection();if(selection?.rangeCount&&root.current?.contains(selection.anchorNode))range.current=selection.getRangeAt(0).cloneRange();
        format(command);
      }}
      onPaste={event => { event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain')); commit(); }}
      style={{ fontSize: value.size, fontWeight: baseWeight??(value.style.startsWith('Heading') ? 700 : 600), textAlign: value.align, color: value.color } as CSSProperties} />
    {editable && (toolbarHost ? createPortal(formatting, toolbarHost) : formatting)}
  </div>;
}
