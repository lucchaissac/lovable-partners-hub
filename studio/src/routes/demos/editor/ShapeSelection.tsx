import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type PointerEvent, type ReactNode, type RefObject, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { Avatar, Button, Checkbox, ColorPicker, Dropdown, Icon, Tooltip } from '@asset/ui';
import { isShapeTool, moveShape, resizeShape, shapeBounds, SHAPE_TOOLS, type Point, type ResizeCorner, type ShapeRequest, type ShapeResult, type Stroke } from './annotationGeometry';
import { ReviewCommentInput } from './ReviewCommentInput';
import './shape-selection.css';

export type ShapeEditingOptions = {
  pageLabel: string;
  readOnly?: boolean;
  onRequest: (request: ShapeRequest) => Promise<ShapeResult>;
  renderContent: (content: string) => ReactNode;
};
type Props = {
  strokes: Stroke[]; setStrokes: Dispatch<SetStateAction<Stroke[]>>;
  selectedId: string | null; onSelect: (id: string | null) => void;
  layer: RefObject<HTMLDivElement | null>; host: HTMLElement;
  interactive: boolean; options: ShapeEditingOptions;
  getPreview: (id: string) => string;
  onLocalComment: (point: Point, text: string) => void;
};

export function ShapeSelection({ strokes, setStrokes, selectedId, onSelect, layer, host, interactive, options, getPreview, onLocalComment }: Props) {
  const selection = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ stroke: Stroke; origin: Point; corner?: ResizeCorner } | null>(null);
  const selected = strokes.find(stroke => stroke.id === selectedId);
  const enabled = interactive && !options.readOnly;
  const patch = (id: string, values: Partial<Stroke>) => setStrokes(old => old.map(stroke => stroke.id === id ? { ...stroke, ...values } : stroke));
  const point = (event: { clientX: number; clientY: number }) => {
    const rect = layer.current!.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * 1000, y: (event.clientY - rect.top) / rect.height * 1000 };
  };
  function begin(event: PointerEvent<HTMLElement>, stroke: Stroke, corner?: ResizeCorner) {
    if (!enabled || event.button !== 0 || stroke.busy) return;
    event.preventDefault(); event.stopPropagation(); onSelect(stroke.id!);
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { stroke, origin: point(event), corner };
  }
  function move(event: PointerEvent<HTMLElement>) {
    const drag = gesture.current;
    if (!drag) return;
    const next = point(event);
    const updated = drag.corner ? resizeShape(drag.stroke, drag.corner, next, layer.current!.getBoundingClientRect()) : moveShape(drag.stroke, { x: next.x - drag.origin.x, y: next.y - drag.origin.y });
    setStrokes(old => old.map(stroke => stroke.id === drag.stroke.id ? updated : stroke));
  }
  useEffect(() => {
    if (!selectedId) return;
    const outside = (event: globalThis.PointerEvent) => {
      if (!(event.target instanceof Element) || event.target.closest('.we-editable-shape, .we-shape-selection, .we-shape-ui, .ui-dropdown-content, .ui-color-popover, [role="dialog"]')) return;
      onSelect(null);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [selectedId, onSelect]);
  const position = (stroke: Stroke) => {
    const box = shapeBounds(stroke.points);
    return { left: `${box.x / 10}%`, top: `${box.y / 10}%`, width: `${box.width / 10}%`, height: `${box.height / 10}%` };
  };
  return <>
    {strokes.filter(stroke => isShapeTool(stroke.kind)).map(stroke => <div key={stroke.id} className="we-editable-shape" data-interactive={enabled || undefined}
      style={{ ...position(stroke), background: stroke.content ? stroke.fill : undefined, borderRadius: stroke.kind === 'oval' ? '50%' : stroke.radius ?? 0, opacity: stroke.opacity ?? 1 }}
      role={enabled ? 'button' : undefined} tabIndex={enabled ? 0 : undefined} aria-label={enabled ? `Select ${stroke.content ? 'marketecture' : stroke.kind}` : undefined} aria-pressed={enabled ? selectedId === stroke.id : undefined}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(stroke.id!); } }}
      onPointerDown={event => begin(event, stroke)} onPointerMove={move} onPointerUp={() => { gesture.current = null; }} onPointerCancel={() => { gesture.current = null; }}>
      {stroke.content && <div className="we-shape-generated" data-content={stroke.content}>{options.renderContent(stroke.content)}</div>}
      {stroke.busy && <div className="we-shape-building" role="status"><Icon name="loader-circle" size={16} /><span>Adding marketecture…</span></div>}
    </div>)}
    {enabled && selected && <div ref={selection} className="we-shape-selection" style={position(selected)}>
      {(['nw', 'ne', 'sw', 'se'] as const).map(corner => <button key={corner} type="button" className="we-shape-handle" data-corner={corner} aria-label={`Resize ${selected.kind} ${corner}`} disabled={selected.busy}
        onPointerDown={event => begin(event, selected, corner)} onPointerMove={move} onPointerUp={() => { gesture.current = null; }} onPointerCancel={() => { gesture.current = null; }} />)}
    </div>}
    {enabled && selected && createPortal(<ShapeInspector key={selected.id} shape={selected} anchor={selection} host={host} options={options} onPatch={values => patch(selected.id!, values)}
      onDelete={() => { setStrokes(old => old.filter(stroke => stroke.id !== selected.id)); onSelect(null); }}
      onDuplicate={() => { const duplicate = { ...moveShape(selected, { x: 24, y: 24 }), id: crypto.randomUUID() }; setStrokes(old => [...old, duplicate]); onSelect(duplicate.id); }}
      onComment={async (text, sendToAsset) => {
        if (!sendToAsset) { const box = shapeBounds(selected.points); onLocalComment({ x: box.x, y: box.y }, text); return; }
        patch(selected.id!, { busy: true });
        try {
          const result = await options.onRequest({ shapeId: selected.id!, shapeName: SHAPE_TOOLS.find(item => item.id === selected.kind)!.label, text: `@Asset ${text.replace(/^@asset\s*/i, '')}`, image: getPreview(selected.id!) });
          patch(selected.id!, { busy: false, ...(result.content ? { content: result.content, fill: '#ffffff' } : {}) });
        } catch { patch(selected.id!, { busy: false }); }
      }} />, host)}
  </>;
}

function ShapeInspector({ shape, anchor, host, options, onPatch, onDelete, onDuplicate, onComment }: {
  shape: Stroke; anchor: RefObject<HTMLDivElement | null>; host: HTMLElement; options: ShapeEditingOptions;
  onPatch: (patch: Partial<Stroke>) => void; onDelete: () => void; onDuplicate: () => void;
  onComment: (text: string, sendToAsset: boolean) => Promise<void>;
}) {
  const [commenting, setCommenting] = useState(false);
  const [text, setText] = useState('');
  const [sendToAsset, setSendToAsset] = useState(true);
  const submitting = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const comment = useRef<HTMLFormElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, commentLeft: 0, commentTop: 0 });
  const [palette] = useState(() => {
    const styles = getComputedStyle(document.documentElement);
    return ['--ui-bg', '--ui-bg-subtle', '--ui-bg-muted', '--ui-text', '--ui-accent', '--ui-accent-purple', '--ui-green', '--ui-yellow', '--ui-red'].map(token => styles.getPropertyValue(token).trim()).filter(Boolean);
  });
  function measure() {
    if (!anchor.current) return;
    const rect = anchor.current.getBoundingClientRect(); const container = host.getBoundingClientRect();
    const toolbarWidth = toolbar.current?.offsetWidth ?? 252;
    const commentWidth = comment.current?.offsetWidth ?? 340;
    const commentHeight = comment.current?.offsetHeight ?? 180;
    const next = { left: Math.max(12, Math.min(container.width - toolbarWidth - 12, rect.left - container.left + rect.width / 2 - toolbarWidth / 2)), top: Math.max(64, Math.min(container.height - 60, rect.top - container.top - 52)), commentLeft: Math.max(12, Math.min(container.width - commentWidth - 12, rect.right - container.left + 12)), commentTop: Math.max(64, Math.min(container.height - commentHeight - 12, rect.top - container.top)) };
    setPosition(old => Object.keys(next).every(key => old[key as keyof typeof old] === next[key as keyof typeof next]) ? old : next);
  }
  useLayoutEffect(measure);
  useEffect(() => {
    window.addEventListener('scroll', measure, true); window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure); observer.observe(host);
    return () => { window.removeEventListener('scroll', measure, true); window.removeEventListener('resize', measure); observer.disconnect(); };
  }, [host]);
  useEffect(() => { if (commenting) input.current?.focus({ preventScroll: true }); }, [commenting]);
  const name = SHAPE_TOOLS.find(item => item.id === shape.kind)!.label;
  async function submit() {
    if (!text.trim() || shape.busy || submitting.current) return;
    submitting.current = true; setCommenting(false);
    try { await onComment(text.trim(), sendToAsset); setText(''); } finally { submitting.current = false; }
  }
  const boxShape = shape.kind === 'rectangle' || shape.kind === 'oval';
  return <>
    <div ref={toolbar} className="we-shape-ui we-shape-inspector" style={{ left: position.left, top: position.top }} role="toolbar" aria-label="Selected shape tools">
      <ColorPicker value={shape.fill ?? '#f6f6f6'} brandColors={palette} brandLabel="Asset colors" onChange={fill => onPatch({ fill })} placement="bottom" trigger={<Button variant="ghost" aria-label="Shape fill" disabled={!boxShape || shape.busy} leadingIcon={<span className="we-shape-swatch" style={{ background: shape.fill ?? 'transparent' }} />} />} />
      <Dropdown placement="bottom" width={180} listHeight="auto" items={[0, 1, 2, 3, 4].map(width => ({ id: String(width), label: width ? `${width} px` : 'No border' }))} onChange={value => onPatch({ strokeWidth: Number(value) })} trigger={<Button variant="ghost" aria-label="Shape border width" disabled={shape.busy} leadingIcon={<Icon name="list" size={18} />} />} />
      <span className="we-review-divider" />
      <Dropdown placement="bottom" width={180} listHeight="auto" items={[0, 8, 16, 24].map(radius => ({ id: String(radius), label: radius ? `${radius} px radius` : 'Square corners' }))} onChange={value => onPatch({ radius: Number(value) })} trigger={<Button variant="ghost" aria-label="Shape corner radius" disabled={shape.kind !== 'rectangle' || shape.busy} leadingIcon={<Icon name="radius" size={18} />} />} />
      <Dropdown placement="bottom" width={180} listHeight="auto" items={[100, 75, 50, 25].map(opacity => ({ id: String(opacity / 100), label: `${opacity}% opacity` }))} onChange={value => onPatch({ opacity: Number(value) })} trigger={<Button variant="ghost" aria-label="Shape opacity" disabled={shape.busy} leadingIcon={<Icon name="blend" size={18} />} />} />
      <span className="we-review-divider" />
      <Tooltip label="Comment on shape"><Button variant="ghost" aria-label="Comment on shape" aria-pressed={commenting} disabled={shape.busy} onClick={() => setCommenting(open => !open)} leadingIcon={<Icon name="message-circle-plus" size={18} />} /></Tooltip>
      <Dropdown placement="bottom" width={180} listHeight="auto" items={[{ id: 'duplicate', label: 'Duplicate shape', leadingIcon: <Icon name="copy" /> }, { kind: 'separator' }, { id: 'delete', label: 'Delete shape', leadingIcon: <Icon name="trash-2" /> }]} onChange={value => value === 'delete' ? onDelete() : onDuplicate()} trigger={<Button variant="ghost" aria-label="More shape options" disabled={shape.busy} leadingIcon={<Icon name="ellipsis-vertical" size={18} />} />} />
    </div>
    {commenting && <form ref={comment} className="we-shape-ui we-shape-comment" style={{ left: position.commentLeft, top: position.commentTop }} role="dialog" aria-label="Comment on selected shape" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <div className="we-shape-comment-avatar"><Avatar name="Example User" size="md" /></div>
      <header><span>{options.pageLabel}<Icon name="chevron-right" size={12} />{name}</span><Button variant="ghost" size="sm" aria-label="Close shape comment" onClick={() => setCommenting(false)} leadingIcon={<Icon name="x" size={14} />} /></header>
      <ReviewCommentInput ref={input} mention={sendToAsset ? '@Asset' : undefined} aria-label="Shape comment" placeholder={sendToAsset ? "Ask Asset for a change…" : "Add a comment…"} aria-keyshortcuts="Meta+Enter Control+Enter" value={text} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); } }} />
      <footer><div className="we-shape-send-toggle"><Checkbox state={sendToAsset ? 'on' : 'off'} onToggle={() => setSendToAsset(value => !value)} ariaLabel="Send to Asset" tabIndex={0} /><span onClick={() => setSendToAsset(value => !value)}>Send to Asset</span></div><Button type="submit" className="we-review-comment-send" size="sm" variant="primary" aria-label={sendToAsset ? 'Send shape request to Asset' : 'Post shape comment'} disabled={!text.trim() || shape.busy} leadingIcon={<Icon name="arrow-up" size={16} />} /></footer>
    </form>}
  </>;
}
