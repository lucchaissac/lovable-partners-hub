import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { isReviewToolbarShortcut, toggleReviewToolbar, useReviewToolbarHidden } from './reviewToolbar';
import { Avatar, Button, Checkbox, ColorPicker, Dropdown, Icon, Tooltip } from '@asset/ui';
import { ShapeSelection, type ShapeEditingOptions } from './ShapeSelection';
import { ReviewCommentInput } from './ReviewCommentInput';
import { CommentBody, CommentMentionInput, type CommentMember } from '../../../components/CommentMentions';
import { CommentTime } from '../../../components/CommentTime';
import { PEOPLE } from './model';
import { SHAPE_TOOLS, isDrawingTool, isShapeTool, shapeBounds, updateStroke, type Point, type ShapeTool, type Stroke } from './annotationGeometry';

export type ReviewTool = 'none' | 'pointer' | 'text' | 'draw' | 'comment' | ShapeTool;
export type ReviewCommentRequest = { id: string; text: string; point: Point; image?: string; selection?: { id: string; label: string; context?: string } };
export type ReviewCommentTarget = { requestId: string; intent?: 'comment'; point: Point; selection: { id: string; label: string; context?: string } };
type Attachment = { src: string; name: string };
type Pin = Point & { id: string; body: string; createdAt: string; image?: Attachment; replies?: { id: string; body: string; createdAt: string }[] };
const tools = [
  { id: 'pointer', icon: 'mouse-pointer-click', label: 'Point' },
  { id: 'text', icon: 'type', label: 'Edit text' },
  { id: 'comment', icon: 'message-square', label: 'Comment' },
  { id: 'draw', icon: 'pencil', label: 'Draw' },
] as const;

export function SharedReviewTools({ members, scopeKey = 'page', tool, onToolChange, onComment, onDeleteComment, onReply, onAttachDrawing, bounds = 'canvas', toolbarHost, toolbarExtra, hideToolbar = false, hideShapeMenu = false, hideCommentTool = false, hideDrawTool = false, tooltipSide = 'top', pointerPulse = true, pointerIcon, pointerLabel, shapeEditing, onAskAsset, commentTarget, onSelectElement, onHoverElement, onSelectionDismiss, onResolveComment, disabled = false, authorName = 'Example User', reviewOnly = false, aiFeedbackOnly = false, surface }: { members?: CommentMember[]; scopeKey?: string; authorName?: string; reviewOnly?: boolean; aiFeedbackOnly?: boolean; surface?: HTMLElement | null; commentTarget?: ReviewCommentTarget; onSelectElement?: (point: Point) => void; onHoverElement?: (point: Point | null) => void; onSelectionDismiss?: () => void; onResolveComment?: (id: string) => Promise<void>; disabled?: boolean; onAskAsset?: (request: ReviewCommentRequest) => Promise<void>; shapeEditing?: ShapeEditingOptions; bounds?: 'canvas' | 'document'; toolbarHost?: HTMLElement | null; toolbarExtra?: ReactNode; hideToolbar?: boolean; hideShapeMenu?: boolean; hideCommentTool?: boolean; hideDrawTool?: boolean; tooltipSide?: 'top' | 'bottom'; pointerPulse?: boolean; pointerIcon?: string; pointerLabel?: string; tool: ReviewTool; onAttachDrawing?: (image: string, fullImage?: string) => void; onToolChange: (tool: ReviewTool) => void; onComment: (id: string, body: string) => void; onDeleteComment?: (id: string) => void; onReply: (id: string, body: string) => void }) {
  const layer = useRef<HTMLDivElement>(null);
  const toolbarHidden = useReviewToolbarHidden();
  const drawing = useRef(false);
  const draftShape = useRef<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const composer = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const selection = useRef({ start: 0, end: 0 });
  const [reviewTheme, setReviewTheme] = useState<CSSProperties>({});
  const [assetPosition, setAssetPosition] = useState({ left: '50%', bottom: 24 });
  const [views, setViews] = useState<Record<string, { pins: Pin[]; strokes: Stroke[] }>>({});
  const pins = views[scopeKey]?.pins || [];
  const strokes = views[scopeKey]?.strokes || [];
  const setPins = useCallback((next: SetStateAction<Pin[]>) => setViews(previous => {
    const view = previous[scopeKey] || { pins: [], strokes: [] };
    return { ...previous, [scopeKey]: { ...view, pins: typeof next === 'function' ? next(view.pins) : next } };
  }), [scopeKey]);
  const setStrokes = useCallback((next: SetStateAction<Stroke[]>) => setViews(previous => {
    const view = previous[scopeKey] || { pins: [], strokes: [] };
    return { ...previous, [scopeKey]: { ...view, strokes: typeof next === 'function' ? next(view.strokes) : next } };
  }), [scopeKey]);
  const [pending, setPending] = useState<Point | null>(null);
  const [message, setMessage] = useState('');
  const [pendingSelection, setPendingSelection] = useState<ReviewCommentRequest['selection']>();
  useEffect(() => {
    if (!commentTarget) return;
    setPending(commentTarget.point); setPendingSelection(commentTarget.intent==='comment'?undefined:commentTarget.selection);
    setSelectedPin(null); setSelectedShapeId(null); setSendToAsset(true); setMessage(''); setAttachment(null); setAttachmentError('');
  }, [commentTarget]);
  const [sendToAsset, setSendToAsset] = useState(true);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [selectedPin, setSelectedPin] = useState<number | null>(null);
  const [hoveredPin, setHoveredPin] = useState<number | null>(null);
  const [customColor, setCustomColor] = useState('#8b5cf6');
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [canvasBounds, setCanvasBounds] = useState<CSSProperties>({});
  const interrupted = useRef(false);
  const [color, setColor] = useState('#0066ff');
  const [pulse, setPulse] = useState<(Point & { id: number }) | null>(null);
  useLayoutEffect(() => {
    drawing.current = false; draftShape.current = null;
    setPending(null); setPendingSelection(undefined); setSelectedPin(null); setHoveredPin(null); setSelectedShapeId(null);
    setMessage(''); setAttachment(null); onToolChange('none');
  }, [scopeKey]);
  const drawingTool = isDrawingTool(tool);
  const shapeBusy = strokes.some(stroke => stroke.busy);
  const chooseTool = (next: ReviewTool) => {
    drawing.current = false; setSelectedShapeId(null); setPending(null); setPendingSelection(undefined); setSelectedPin(null); setHoveredPin(null); onToolChange(next);
  };
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!isReviewToolbarShortcut(event) || !layer.current?.getClientRects().length || layer.current.closest('[hidden]')) return;
      event.preventDefault(); toggleReviewToolbar();
    };
    window.addEventListener('keydown', shortcut, true);
    return () => window.removeEventListener('keydown', shortcut, true);
  }, []);
  useLayoutEffect(() => {
    if (!toolbarHidden) return;
    drawing.current = false; draftShape.current = null;
    if (tool !== 'none') onToolChange('none');
    onHoverElement?.(null); onSelectionDismiss?.();
  }, [toolbarHidden, tool]);
  useLayoutEffect(() => {
    const main = surface || layer.current?.closest('.we-main');
    if (!main) return;
    const measure = () => {
      const tokens = getComputedStyle(document.documentElement);
      setReviewTheme(Object.fromEntries(['--ui-accent', '--ui-accent-hover', '--ui-accent-active', '--ui-text', '--ui-text-muted', '--ui-bg-subtle', '--ui-bg-muted'].map(token => [token, tokens.getPropertyValue(token)])) as CSSProperties);
      const documentElement = layer.current?.parentElement;
      const canvas = documentElement?.closest('.we-canvas');
      if (bounds === 'canvas' && canvas && documentElement) {
        const canvasRect = canvas.getBoundingClientRect();
        const documentRect = documentElement.getBoundingClientRect();
        const top = documentRect.top - canvasRect.top + canvas.scrollTop;
        setCanvasBounds({ left: canvasRect.left - documentRect.left, top: -top, width: canvas.clientWidth, height: documentElement.offsetHeight + top });
      }
      const rect = main.getBoundingClientRect();
      setAssetPosition({ left: `${rect.left + rect.width / 2}px`, bottom: Math.max(20, innerHeight - rect.bottom + 20) });
    };
    const observer = new ResizeObserver(measure); observer.observe(main); if (layer.current?.parentElement) observer.observe(layer.current.parentElement);
    window.addEventListener('resize', measure); measure();
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [bounds, toolbarHost, surface]);
  useLayoutEffect(() => {
    if (!pending) return;
    if (!surface) composer.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const frame = requestAnimationFrame(() => composer.current?.querySelector('textarea')?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [pending]);
  const sendComment = () => {
    if (!pending || (!message.trim() && !attachment)) return;
    const askAsset = !!onAskAsset && (aiFeedbackOnly || sendToAsset);
    const body = askAsset ? `@Asset ${message.trim().replace(/^@asset\s*/i, '')}` : message.trim();
    const commentId = crypto.randomUUID();
    if (!aiFeedbackOnly || !askAsset) {
      setPins(old => [...old, { ...pending, id: commentId, body, createdAt: new Date().toISOString(), image: attachment ?? undefined }]);
      onComment(commentId, [body, attachment ? `Image: ${attachment.name}` : ''].filter(Boolean).join('\n'));
    }
    setSelectedPin(askAsset ? null : pins.length); setPending(null); onSelectionDismiss?.();
    if (askAsset) void onAskAsset!({ id: commentId, text: body, point: pending, image: attachment?.src, selection: pendingSelection });
  };
  const sendReply = (pinId: string) => {
    const body = replyDrafts[pinId]?.trim();
    if (!body) return;
    const reply = { id: crypto.randomUUID(), body, createdAt: new Date().toISOString() };
    setPins(old => old.map(pin => pin.id === pinId ? { ...pin, replies: [...(pin.replies ?? []), reply] } : pin));
    setReplyDrafts(old => ({ ...old, [pinId]: '' }));
    onReply(pinId, body);
  };
  const drawingImage = (shapeId?: string, full = false) => {
    const svg = layer.current?.querySelector('.we-review-drawing');
    const included = shapeId ? strokes.filter(stroke => stroke.id === shapeId) : strokes;
    if (!svg || !included.length) return '';
    const copy = svg.cloneNode(true) as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    if (shapeId) Array.from(copy.children).forEach(child => { if (child.getAttribute('data-shape-id') !== shapeId) child.remove(); });
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const points = included.flatMap(stroke => [...stroke.points, ...(stroke.head ?? [])]);
    const xs = points.map(point => point.x); const ys = points.map(point => point.y);
    const left = Math.max(0, Math.min(...xs) - 20); const top = Math.max(0, Math.min(...ys) - 20);
    const width = Math.max(40, Math.max(...xs) - left + 20); const height = Math.max(40, Math.max(...ys) - top + 20);
    copy.setAttribute('viewBox', full ? '0 0 1000 1000' : `${left} ${top} ${width} ${height}`);
    copy.setAttribute('width', String(Math.round(full ? rect.width : rect.width * width / 1000)));
    copy.setAttribute('height', String(Math.round(full ? rect.height : rect.height * height / 1000)));
    copy.removeAttribute('class');
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
  };
  const attachDrawing = () => {
    if (!onAttachDrawing || shapeBusy) return;
    const image = drawingImage();
    if (!image) return;
    onAttachDrawing(image, drawingImage(undefined, true)); setSelectedShapeId(null);
    setStrokes([]);
    onToolChange('none');
  };
  const commentCardStyle = (location: Point): CSSProperties => {
    if (!surface) return { transform: location.x > 650 ? 'translateX(calc(-100% + 28px))' : undefined };
    const rect = surface.getBoundingClientRect();
    const viewport = surface.parentElement!.getBoundingClientRect();
    const x = rect.left + location.x / 1000 * rect.width;
    const y = rect.top + location.y / 1000 * rect.height;
    const width = Math.min(320, viewport.width - 24);
    const height = Math.min(composer.current?.offsetHeight || 280, viewport.height - 24);
    const right = x + 42 + width <= viewport.right - 12;
    const left = x - width - 12 >= viewport.left + 12;
    const beside = right || left;
    const cardX = right ? x + 42 : left ? x - width - 12 : Math.max(viewport.left + 12, Math.min(x, viewport.right - width - 12));
    const cardY = beside ? Math.max(viewport.top + 12, Math.min(y, viewport.bottom - height - 12)) : y + 42 + height <= viewport.bottom - 12 ? y + 42 : y - height - 12;
    return { width, left: cardX - x, top: Math.max(viewport.top + 12, cardY) - y, bottom: 'auto', maxHeight: viewport.height - 24, overflowY: 'auto' };
  };
  const closeComposer = () => { setPending(null); setPendingSelection(undefined); onSelectionDismiss?.(); };
  const insert = (value: string) => {
    const { start, end } = selection.current;
    setMessage(previous => previous.slice(0, start) + value + previous.slice(end));
    const caret = start + value.length;
    selection.current = { start: caret, end: caret };
    requestAnimationFrame(() => { const input = composer.current?.querySelector('textarea'); input?.focus(); input?.setSelectionRange(caret, caret); });
  };
  const point = (event: { clientX: number; clientY: number }): Point => {
    const rect = layer.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1000, (event.clientX - rect.left) / rect.width * 1000)), y: Math.max(0, Math.min(1000, (event.clientY - rect.top) / rect.height * 1000)) };
  };
  useEffect(() => {
    if (!onAttachDrawing || disabled || toolbarHidden || hideShapeMenu) return;
    const shortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.metaKey || event.ctrlKey || event.altKey || drawing.current) return;
      if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"], [role="textbox"], [role="dialog"], [role="menu"]')) return;
      const key = event.key.toLowerCase();
      const next = key === 'r' && !event.shiftKey ? 'rectangle' : key === 'o' && !event.shiftKey ? 'oval' : key === 'l' ? (event.shiftKey ? 'arrow' : 'line') : null;
      if (next) { event.preventDefault(); chooseTool(next); }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [onAttachDrawing, onToolChange, disabled, toolbarHidden, hideShapeMenu]);
  useEffect(() => {
    if (disabled) return;
    const parent = layer.current?.parentElement;
    const pointAt = (event: PointerEvent) => {
      if (!pointerPulse || onSelectElement || tool !== 'pointer' || (event.target as HTMLElement).closest('button, input, textarea, a, [contenteditable="true"], .we-review-pin-card, .we-editable-shape, .we-shape-selection')) return;
      setPulse({ ...point(event), id: Date.now() });
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { drawing.current = false; setSelectedShapeId(null); setPending(null); setSelectedPin(null); if (tool !== 'comment') onToolChange('none'); } };
    parent?.addEventListener('pointerdown', pointAt);
    window.addEventListener('keydown', escape);
    return () => { parent?.removeEventListener('pointerdown', pointAt); window.removeEventListener('keydown', escape); };
  }, [tool, onToolChange, disabled, pointerPulse, onSelectElement]);
  return <>
    <div ref={layer} hidden={disabled} style={{ ...reviewTheme, ...canvasBounds }} className="we-review-layer" data-tool={tool} data-selectable={!!onSelectElement || undefined} data-drawing={drawingTool || undefined}>
      <svg className="we-review-drawing" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Page annotations"
        onPointerDown={event => {
          if (event.button !== 0) return;
          if (tool === 'pointer' && onSelectElement) { event.preventDefault(); onSelectElement(point(event)); return; }
          if (tool === 'comment') { event.preventDefault(); setSelectedPin(null); setPending(point(event)); setPendingSelection(undefined); setSendToAsset(true); setMessage(''); setAttachment(null); setAttachmentError(''); selection.current = { start: 0, end: 0 }; return; }
          if (!isDrawingTool(tool) || document.elementsFromPoint(event.clientX, event.clientY).some(element => element.closest('.we-outline, .we-review-asset, .we-review-pin, .we-section-toolbar'))) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId); drawing.current = true;
          interrupted.current = false; const start = point(event); const id = crypto.randomUUID(); draftShape.current = id; setSelectedShapeId(null);
          const fill = shapeEditing && isShapeTool(tool) ? getComputedStyle(document.documentElement).getPropertyValue('--ui-bg-muted').trim() : undefined;
          setStrokes(old => [...old, { id, kind: tool, color, fill, points: [start, { x: start.x + .01, y: start.y + .01 }] }]);
        }}
        onPointerLeave={() => onHoverElement?.(null)}
        onPointerMove={event => { if (tool === 'pointer' && !pending) onHoverElement?.(point(event)); if (!drawing.current) return;
          const canvasRect = (surface || layer.current?.closest('.we-canvas'))?.getBoundingClientRect();
          const blocked = !canvasRect || event.clientY < canvasRect.top || event.clientY > canvasRect.bottom || event.clientX < canvasRect.left || event.clientX > canvasRect.right || document.elementsFromPoint(event.clientX, event.clientY).some(element => element.closest('.we-outline, .we-review-asset, .we-review-pin, .we-section-toolbar'));
          if (blocked) { interrupted.current = true; return; }
          const next = point(event);
          if (interrupted.current && tool === 'draw') { interrupted.current = false; setStrokes(old => [...old, { id: crypto.randomUUID(), kind: 'draw', color, points: [next] }]); return; }
          interrupted.current = false;
          const size = layer.current!.getBoundingClientRect();
          setStrokes(old => old.map((stroke, index) => index === old.length - 1 ? updateStroke(stroke, next, size) : stroke)); }}
        onPointerUp={() => {
          if (!drawing.current) return; drawing.current = false;
          if (shapeEditing && !shapeEditing.readOnly && isShapeTool(tool)) {
            const shape = strokes.find(stroke => stroke.id === draftShape.current);
            const box = shape && shapeBounds(shape.points);
            if (!box || box.width < 2 && box.height < 2) setStrokes(old => old.filter(stroke => stroke.id !== draftShape.current));
            else { setSelectedShapeId(draftShape.current); onToolChange('pointer'); }
          }
        }} onPointerCancel={() => { drawing.current = false; }}>
        {strokes.map((stroke, index) => {
          const box = shapeBounds(stroke.points);
          const style = { fill: stroke.kind === 'rectangle' || stroke.kind === 'oval' ? stroke.fill ?? 'none' : 'none', opacity: stroke.opacity ?? 1, stroke: stroke.color, strokeWidth: stroke.strokeWidth ?? 3, strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' } as const;
          if (stroke.kind === 'rectangle') return <rect key={index} data-shape-id={stroke.id} data-annotation="rectangle" rx={(stroke.radius ?? 0) * 1000 / (layer.current?.clientWidth || 1000)} ry={(stroke.radius ?? 0) * 1000 / (layer.current?.clientHeight || 1000)} {...box} {...style} />;
          if (stroke.kind === 'oval') return <ellipse key={index} data-shape-id={stroke.id} data-annotation="oval" cx={box.x + box.width / 2} cy={box.y + box.height / 2} rx={box.width / 2} ry={box.height / 2} {...style} />;
          return <g key={index} data-shape-id={stroke.id} data-annotation={stroke.kind}><polyline points={stroke.points.map(p => `${p.x},${p.y}`).join(' ')} {...style} />{stroke.head?.length ? <polyline points={stroke.head.map(p => `${p.x},${p.y}`).join(' ')} {...style} /> : null}</g>;
        })}
      </svg>
      {shapeEditing && toolbarHost && <ShapeSelection strokes={strokes} setStrokes={setStrokes} selectedId={selectedShapeId} onSelect={setSelectedShapeId} layer={layer} host={toolbarHost} interactive={tool === 'pointer' || tool === 'none'} options={shapeEditing} getPreview={drawingImage}
        onLocalComment={(location, body) => { const id = crypto.randomUUID(); setPins(old => [...old, { ...location, id, body, createdAt: new Date().toISOString() }]); onComment(id, body); setSelectedShapeId(null); }} />}
      {pulse && <span key={pulse.id} className="we-review-pulse" style={{ left: `${pulse.x / 10}%`, top: `${pulse.y / 10}%` }} onAnimationEnd={() => setPulse(null)} />}
      {pins.map((pin, index) => <div key={pin.id} className="we-review-pin" style={{ left: `${pin.x / 10}%`, top: `${pin.y / 10}%` }} onMouseEnter={() => setHoveredPin(index)} onMouseLeave={() => setHoveredPin(null)}>
        <button className="ui-reset" aria-label={`Open comment ${index + 1}`} aria-expanded={selectedPin === index} onClick={() => { setSelectedPin(selectedPin === index ? null : index); setPending(null); }}><Avatar name={authorName} size="sm" /></button>
        {(selectedPin === index || hoveredPin === index) && <div className={`we-review-pin-card ${selectedPin === index ? 'we-review-comment-detail' : 'we-review-comment-preview'}`} role={selectedPin === index ? 'dialog' : undefined} aria-label="Comment" style={commentCardStyle(pin)}>
          {selectedPin === index && <header><strong>Comment</strong><div className="we-review-comment-actions">{onResolveComment && <Button size="sm" variant="ghost" aria-label="Resolve comment" leadingIcon={<Icon name="circle-check" size={14} />} onClick={() => { void onResolveComment(pin.id).then(() => { setPins(old => old.filter(item => item.id !== pin.id)); setSelectedPin(null); setHoveredPin(null); }).catch(() => {}); }} />}{onDeleteComment && <Button size="sm" variant="ghost" aria-label="Delete comment" leadingIcon={<Icon name="trash-2" size={14} />} onClick={() => { setPins(old => old.filter(item => item.id !== pin.id)); onDeleteComment(pin.id); setSelectedPin(null); setHoveredPin(null); }} />}<Button size="sm" variant="ghost" aria-label="Close comment" leadingIcon={<Icon name="x" size={14} />} onClick={() => { setSelectedPin(null); setHoveredPin(null); }} /></div></header>}
          <div className="we-review-comment-author"><Avatar name={authorName} size="sm" /><strong>{authorName}</strong><CommentTime value={pin.createdAt} /></div><p><CommentBody body={pin.body} members={members} /></p>{pin.image && <img className="we-review-comment-image" src={pin.image.src} alt={pin.image.name} />}
          {selectedPin === index && <>
            <div className="we-review-replies" aria-live="polite">{pin.replies?.map(reply => <div className="we-review-reply" key={reply.id}><div className="we-review-comment-author"><Avatar name={authorName} size="sm" /><strong>{authorName}</strong><CommentTime value={reply.createdAt} /></div><p><CommentBody body={reply.body} members={members} /></p></div>)}</div>
            <form className="we-review-reply-form" onSubmit={event => { event.preventDefault(); sendReply(pin.id); }}>
              <Avatar name={authorName} size="sm" />
              <div className="we-review-reply-input">{members ? <CommentMentionInput members={members} aria-label="Reply" placeholder="Reply…" rows={1} value={replyDrafts[pin.id] ?? ''} onChange={value => setReplyDrafts(old => ({ ...old, [pin.id]: value }))} onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) { event.preventDefault(); sendReply(pin.id); } }} /> : <textarea aria-label="Reply" placeholder="Reply…" rows={1} value={replyDrafts[pin.id] ?? ''} onChange={event => setReplyDrafts(old => ({ ...old, [pin.id]: event.target.value }))} aria-keyshortcuts="Meta+Enter Control+Enter" onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) { event.preventDefault(); sendReply(pin.id); } }} />}<Button type="submit" className="we-review-comment-send" size="sm" variant="primary" aria-label="Send reply" disabled={!replyDrafts[pin.id]?.trim()} leadingIcon={<Icon name="arrow-up" size={16} />} /></div>
            </form>
          </>}
          {selectedPin !== index && !!pin.replies?.length && <span className="we-review-reply-count">{pin.replies.length} {pin.replies.length === 1 ? 'reply' : 'replies'}</span>}
        </div>}
      </div>)}
      {pending && <div className="we-review-pin we-review-pending" style={{ left: `${pending.x / 10}%`, top: `${pending.y / 10}%` }}>
        <button className="ui-reset" aria-label="New comment location" onClick={() => composer.current?.querySelector('textarea')?.focus()}><Avatar name={authorName} size="sm" /></button>
        <div ref={composer} className="we-review-pin-card we-review-composer" data-asset-enabled={!!onAskAsset || undefined} role="dialog" aria-label="Add a comment" style={commentCardStyle(pending)}>
          <header><strong>{pendingSelection ? 'Edit element' : 'Add a comment'}</strong><Button size="sm" variant="ghost" aria-label="Close comment composer" leadingIcon={<Icon name="x" size={14} />} onClick={closeComposer} /></header>
          {pendingSelection && <p className="we-review-selected-label" title={pendingSelection.label}>{pendingSelection.label}</p>}
          <ReviewCommentInput members={members} onValueChange={setMessage} mention={!pendingSelection && onAskAsset && sendToAsset ? '@Asset' : undefined} autoFocus onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) { event.preventDefault(); sendComment(); } }} aria-keyshortcuts="Meta+Enter Control+Enter" aria-label="Comment" placeholder={onAskAsset && sendToAsset ? (pendingSelection ? "Describe the change…" : "Ask Asset about this page…") : "What’s on your mind?"} value={message} onSelect={event => { selection.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd }; }} onChange={event => setMessage(event.target.value)} />
          {attachment && <div className="we-review-attachment"><img src={attachment.src} alt={attachment.name} /><span>{attachment.name}</span><Button size="sm" variant="ghost" aria-label="Remove image" leadingIcon={<Icon name="x" size={14} />} onClick={() => setAttachment(null)} /></div>}
          {attachmentError && <p className="we-review-attachment-error" role="alert">{attachmentError}</p>}
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={event => {
            const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
            if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) { setAttachmentError('Choose a PNG, JPG, WebP or GIF under 5 MB.'); return; }
            const reader = new FileReader(); reader.onload = () => { setAttachment({ src: String(reader.result), name: file.name }); setAttachmentError(''); }; reader.onerror = () => setAttachmentError('This image could not be opened.'); reader.readAsDataURL(file);
          }} />
          {onAskAsset && !aiFeedbackOnly && !pendingSelection && <div className="we-review-send-toggle"><Checkbox state={sendToAsset ? 'on' : 'off'} onToggle={() => setSendToAsset(value => !value)} ariaLabel="Send to Asset" tabIndex={0} /><span onClick={() => setSendToAsset(value => !value)}>Send to Asset</span></div>}
          <footer><div className="we-review-comment-actions">
            <Dropdown placement="top" width={180} listHeight="auto" items={['😊', '👍', '❤️', '🎉', '👀', '✅'].map(emoji => ({ id: emoji, label: emoji }))} onChange={insert} trigger={<Button size="sm" variant="ghost" aria-label="Add emoji" title="Add emoji" leadingIcon={<Icon name="smile" size={14} />} />} />
            {!reviewOnly && <>
              <Dropdown placement="top" width={240} listHeight="auto" items={PEOPLE.map(name => ({ id: name, label: name, avatar: <Avatar name={name} size="sm" /> }))} onChange={name => insert(`@${name} `)} trigger={<Button size="sm" variant="ghost" aria-label="Mention someone" title="Mention someone" leadingIcon={<Icon name="at-sign" size={14} />} />} />
            <Tooltip label="Attach image" side={tooltipSide}><Button size="sm" variant="ghost" aria-label="Attach image" onClick={() => fileInput.current?.click()} leadingIcon={<Icon name="image" size={14} />} /></Tooltip></>}
          </div><Button className="we-review-comment-send" size="sm" variant="primary" aria-label={onAskAsset && sendToAsset ? "Send comment to Asset" : "Send comment"} leadingIcon={<Icon name="arrow-up" size={16} />} disabled={!message.trim() && !attachment} onClick={sendComment} /></footer>
        </div>
      </div>}
    </div>
    {!toolbarHidden && !hideToolbar && createPortal(<div className="we-review-asset" style={toolbarHost ? { position: 'absolute', left: '50%', bottom: 20 } : assetPosition} aria-label={onAttachDrawing ? "Editor drawing tools" : "Shared preview tools"}>
      <div className="we-review-toolbar" role="toolbar" aria-label="Review workspace">
        {tools.filter(item => (!(onAttachDrawing || reviewOnly) || item.id !== 'text') && !(hideCommentTool && item.id === 'comment') && !(hideDrawTool && item.id === 'draw')).map(item => <Fragment key={item.id}><Tooltip label={pointerLabel && item.id==='pointer' ? pointerLabel : onSelectElement && item.id === 'pointer' ? 'Select element' : reviewOnly && item.id === 'pointer' ? 'Interact' : item.label} side={tooltipSide}><Button variant="ghost" disabled={disabled} aria-label={pointerLabel && item.id==='pointer' ? pointerLabel : onSelectElement && item.id === 'pointer' ? 'Select element' : reviewOnly && item.id === 'pointer' ? 'Interact' : item.label} aria-pressed={tool === item.id} onClick={() => chooseTool(tool === item.id ? 'none' : item.id)} leadingIcon={<Icon name={item.id==='pointer'&&pointerIcon?pointerIcon:item.icon} size={16} />} /></Tooltip>{item.id === 'pointer' && toolbarExtra}</Fragment>)}
        {onAttachDrawing && !hideShapeMenu && <Dropdown placement="top" width={200} listHeight="auto" items={SHAPE_TOOLS.flatMap((shape, index) => [
          ...(index === 2 ? [{ kind: 'separator' as const }] : []),
          { id: shape.id, label: shape.label, leadingIcon: <Icon name={shape.icon} size={16} />, trailingHint: shape.shortcut },
        ])} onChange={value => { if (isShapeTool(value)) chooseTool(value); }} trigger={<Button variant="ghost" disabled={disabled} className="we-review-shape-trigger" aria-label="Shapes" aria-haspopup="menu" aria-pressed={isShapeTool(tool)} leadingIcon={<Icon name={SHAPE_TOOLS.find(shape => shape.id === tool)?.icon ?? 'shapes'} size={16} />} trailingIcon={<Icon name="chevron-down" size={12} />} />} />}
        {drawingTool && <div className="we-review-draw-options" data-open><div><span className="we-review-divider" />{['#0066ff', '#f45158', '#151922'].map(value => <button key={value} className="we-review-ink" style={{ background: value }} aria-label={`Ink ${value}`} aria-pressed={color === value} onClick={() => setColor(value)}>{color === value && <Icon name="check" size={12} />}</button>)}<ColorPicker customColors={customColors} onAddCustomColor={value => { setCustomColors(old => [...old, value]); setCustomColor(value); setColor(value); }} onUpdateCustomColor={(index, value) => { setCustomColors(old => old.map((color, i) => i === index ? value : color)); setCustomColor(value); setColor(value); }} value={customColor} onChange={value => { setCustomColor(value); setColor(value); }} placement="top" align="end" trigger={<button className="we-review-ink we-review-custom-ink" aria-label="Custom ink color" style={{ background: customColor }}><Icon name={color === customColor ? "check" : "plus"} size={12} /></button>} /><Tooltip label="Undo drawing" side={tooltipSide}><Button variant="ghost" aria-label="Undo drawing" disabled={!strokes.length || shapeBusy} onClick={() => setStrokes(old => old.slice(0, -1))} leadingIcon={<Icon name="undo-2" size={16} />} /></Tooltip></div></div>}
        {onAttachDrawing && strokes.length > 0 && <Tooltip label="Add drawing to chat" side={tooltipSide}><Button variant="ghost" aria-label="Add drawing to chat" disabled={!strokes.length || shapeBusy} onClick={attachDrawing} leadingIcon={<Icon name="arrow-up" size={16} />} /></Tooltip>}
        {drawingTool && <Tooltip label="Clear drawings" side={tooltipSide}><Button variant="ghost" aria-label="Clear drawings" disabled={!strokes.length || shapeBusy} onClick={() => setStrokes([])} leadingIcon={<Icon name="trash-2" size={16} />} /></Tooltip>}
      </div>
    </div>, toolbarHost ?? document.body)}

  </>;
}
