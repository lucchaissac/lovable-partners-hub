import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuItemIcon, DropdownMenuItemLabel, DropdownMenuSeparator, DropdownMenuTrigger, Icon, Input, Tooltip } from '@asset/ui';
import './editor-widget-blocks.css';

export type EditorImageValue = { src: string; alt: string; caption: string; alignment: 'left' | 'center' | 'right'; width: number; crop?: {x:number;y:number;width:number;height:number;sourceWidth:number;sourceHeight:number}; link?: string };
export const SAMPLE_IMAGE: EditorImageValue = { src: '/specs/editor-widgets/example-project-guide.svg', alt: 'Example project guide', caption: '', alignment: 'center', width: 80 };
export const validImageLink = (value: string) => { try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; } };

export function ImageUploader({ onChoose, onClose }: { onChoose: (file: File) => void; onClose?: () => void }) {
  const input = useRef<HTMLInputElement>(null); const [error, setError] = useState(''); const [dragging, setDragging] = useState(false);
  function select(file?: File) {
    if (!file) return;
    if (!['image/png','image/jpeg','image/gif'].includes(file.type)) { setError('Choose a PNG, JPG or GIF image.'); return; }
    setError(''); onChoose(file);
  }
  function drop(event: DragEvent) { event.preventDefault(); setDragging(false); select(event.dataTransfer.files[0]); }
  return <section className="ewb-upload" aria-label="Upload image" data-dragging={dragging || undefined} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
    <div className="ewb-upload-heading"><h3>Upload image</h3>{onClose && <Button variant="ghost" size="sm" aria-label="Close uploader" onClick={onClose} leadingIcon={<Icon name="x" size={16} />} />}</div>
    <p>Upload PNG, JPG or GIF</p>
    <input ref={input} type="file" accept="image/png,image/jpeg,image/gif" hidden onChange={event => { select(event.target.files?.[0]); event.target.value = ''; }} aria-label="Choose image file" />
    <Button variant="primary" onClick={() => input.current?.click()}>Choose image</Button>
    <p className="ewb-upload-help">Images under 100 MB perform best.<br />Big files take a while to upload.</p>
    {error && <p className="ewb-error" role="alert">{error}</p>}
  </section>;
}

/** Controlled image block: host owns persistence, uploads and removal. */
export function EditorImageBlock({ value, onChange, onReplace, onRemove, onAddToLibrary, editable = true }: {
  value: EditorImageValue; onChange: (value: EditorImageValue) => void; onReplace: () => void;
  onRemove?: () => void; onAddToLibrary?: () => void; editable?: boolean;
}) {
  const widthId = useId();
  const [captionVisible, setCaptionVisible] = useState(!!value.caption);
  const [linkOpen, setLinkOpen] = useState(false); const [link, setLink] = useState(value.link ?? '');
  const [error, setError] = useState(false); const [selected, setSelected] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const resize = useRef<{ x: number; width: number; parent: number; direction: number } | null>(null);
  useEffect(() => setError(false), [value.src]);
  const download = () => { const anchor = document.createElement('a'); anchor.href = value.src; anchor.download = value.alt || 'image'; anchor.click(); };
  return <div className="ewb-image-block" data-alignment={value.alignment} onFocus={() => setSelected(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSelected(false); }}>
    <figure className="ewb-image" data-editable={editable || undefined} data-selected={selected || undefined} data-toolbar-open={menuOpen || linkOpen || undefined} style={{ width: `${value.width}%` }} tabIndex={editable ? 0 : undefined}
      aria-label={editable ? 'Image block. Select to edit.' : value.alt} onClick={() => editable && setSelected(true)}>
      {value.crop && !error ? <svg className="ewb-image-crop" role="img" aria-label={value.alt} viewBox={`${value.crop.x} ${value.crop.y} ${value.crop.width} ${value.crop.height}`} preserveAspectRatio="xMidYMid slice" style={{display:'block',width:'100%',height:'var(--hcs-image-height, auto)',aspectRatio:`${value.crop.width}/${value.crop.height}`,borderRadius:'inherit',overflow:'hidden'}}><image href={value.src} width={value.crop.sourceWidth} height={value.crop.sourceHeight}/></svg> : error ? <div className="ewb-image-unavailable"><Icon name="image" size={32} /><span>Image unavailable</span>{editable && <Button size="sm" variant="neutral" onClick={onReplace}>Replace image</Button>}</div> : !editable && value.link && validImageLink(value.link) ? <a href={value.link} target="_blank" rel="noreferrer"><img className="ewb-image-content" src={value.src} alt={value.alt} onError={() => setError(true)} /></a> : <img className="ewb-image-content" src={value.src} alt={value.alt} onError={() => setError(true)} />}
      {editable && <div className="ewb-image-toolbar" role="toolbar" aria-label="Image actions">
        <Button size="sm" variant="ghost" leadingIcon={<Icon name="image" size={14} />} onClick={onReplace}>Replace</Button>
        <Tooltip label="Image link"><Button size="sm" variant="ghost" aria-label="Image link" active={linkOpen} leadingIcon={<Icon name="link" size={14} />} onClick={() => setLinkOpen(!linkOpen)} /></Tooltip>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}><DropdownMenuTrigger><Button size="sm" variant="ghost" aria-label="Image options" leadingIcon={<Icon name="ellipsis" size={16} />} /></DropdownMenuTrigger><DropdownMenuContent align="end">
          {(['left','center','right'] as const).map(alignment => <DropdownMenuItem key={alignment} onClick={() => onChange({ ...value, alignment })}><DropdownMenuItemIcon><Icon name={`align-${alignment}`} size={16} /></DropdownMenuItemIcon><DropdownMenuItemLabel>Align {alignment}</DropdownMenuItemLabel>{alignment === value.alignment && <DropdownMenuItemIcon><Icon name="check" size={16} /></DropdownMenuItemIcon>}</DropdownMenuItem>)}
          <DropdownMenuItem onClick={() => setCaptionVisible(true)}><DropdownMenuItemIcon><Icon name="type" size={16} /></DropdownMenuItemIcon><DropdownMenuItemLabel>Add a caption</DropdownMenuItemLabel></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={download}><DropdownMenuItemIcon><Icon name="download" size={16} /></DropdownMenuItemIcon><DropdownMenuItemLabel>Download</DropdownMenuItemLabel></DropdownMenuItem>
          {onAddToLibrary && <DropdownMenuItem onClick={onAddToLibrary}><DropdownMenuItemIcon><Icon name="library" size={16} /></DropdownMenuItemIcon><DropdownMenuItemLabel>Add to library</DropdownMenuItemLabel></DropdownMenuItem>}
          {onRemove && <><DropdownMenuSeparator /><DropdownMenuItem onClick={onRemove}><DropdownMenuItemIcon><Icon name="trash-2" size={16} /></DropdownMenuItemIcon><DropdownMenuItemLabel>Delete</DropdownMenuItemLabel></DropdownMenuItem></>}
        </DropdownMenuContent></DropdownMenu>
      </div>}
      {editable && ['tl','tr','bl','br'].map(corner => <button key={corner} type="button" className="ewb-image-handle" data-corner={corner} aria-label={`Resize image ${corner}`} onPointerDown={event => {
        event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setSelected(true);
        resize.current = { x: event.clientX, width: value.width, parent: event.currentTarget.closest('figure')!.parentElement!.clientWidth, direction: corner.endsWith('l') ? -1 : 1 };
      }} onPointerMove={event => { if (resize.current) { const start = resize.current; onChange({ ...value, width: Math.round(Math.max(25, Math.min(100, start.width + (event.clientX - start.x) * start.direction / start.parent * 100))) }); } }} onPointerUp={() => { resize.current = null; }} onPointerCancel={() => { resize.current = null; }} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); onChange({ ...value, width: Math.max(25, Math.min(100, value.width + (event.key === 'ArrowRight' ? 5 : -5))) }); } }} />)}
    </figure>
    {linkOpen && editable && <form className="ewb-image-link" onSubmit={event => { event.preventDefault(); if (!link || validImageLink(link)) { onChange({ ...value, link }); setLinkOpen(false); } }}><Input aria-label="Image URL" placeholder="https://" type="url" value={link} onChange={event => setLink(event.target.value)} /><Button size="sm" variant="primary" type="submit" disabled={!!link && !validImageLink(link)}>Save link</Button></form>}
    {editable && selected && <div className="ewb-image-size"><label htmlFor={widthId}>Image width</label><input id={widthId} aria-label="Image width" type="range" min={25} max={100} value={value.width} onChange={event => onChange({ ...value, width: Number(event.target.value) })} /><span>{value.width}%</span></div>}
    {(captionVisible || value.caption) && (editable ? <Input className="ewb-image-caption" aria-label="Image caption" placeholder="Add a caption…" value={value.caption} onChange={event => onChange({ ...value, caption: event.target.value })} /> : <p className="ewb-image-caption">{value.caption}</p>)}
  </div>;
}
