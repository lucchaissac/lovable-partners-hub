import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button, Card, CardMedia, Dialog, DialogBody, DialogFooter, DialogHeader, Icon, Input, Textarea, Tooltip } from '@asset/ui';
import { AddSourceMenu } from '../components/AssetChatBox';
import { studioApi } from './client';
import { canvasAgent } from './canvasAgent';
import { sourceIsInline, deferredSourceText, isHtmlSource, sourceLimits, sourcesSchema, sourceUrlSchema, type StudioSource, type SourceReference } from './sources';
import { sourceFileAccept, textFileSource } from './sourceFiles';
import { WorkspaceExternalLink } from './WorkspaceExternalLink';
import {listenForFileDragEnd} from './fileDragLifecycle';

const menuItems = [
  { id: 'images', label: 'Add images', icon: 'image' },
  { id: 'html', label: 'Import HTML', icon: 'code-block' },
  { id: 'files', label: 'Add files', icon: 'paperclip' },
  { id: 'link', label: 'Add link', icon: 'link' },
  { id: 'linear', label: 'Add Linear issue', icon: 'list-todo' },
  { id: 'text', label: 'Add text', icon: 'type' },
  { id: 'extension', label: 'Connect Chrome', icon: 'globe' },
];
const iconFor = (kind: SourceReference['kind']) => kind === 'image' ? 'image' : kind === 'link' ? 'link' : 'file-text';

function SourceReferenceIcon({ source }: { source: SourceReference }) {
  const [failedDomain, setFailedDomain] = useState('');
  let domain = source.name === 'Slack thread' ? 'slack.com' : '';
  if (source.url) {
    try {
      const url = new URL(source.url);
      if (url.protocol === 'https:' || url.protocol === 'http:') domain = /(^|\.)slack\.com$/i.test(url.hostname) ? 'slack.com' : url.hostname;
    } catch { /* Older references may not contain a valid URL. */ }
  }
  return domain && failedDomain !== domain
    ? <img className="studio-source-favicon" src={`https://icon.horse/icon/${encodeURIComponent(domain)}`} width={14} height={14} alt="" aria-hidden="true" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedDomain(domain)} />
    : <Icon name={iconFor(source.kind)} size={14} />;
}

export function SourceReferences({ sources, presentation=false, text }: { sources?: SourceReference[]; presentation?: boolean; text?: string }) {
  sources = sources?.filter(source => !sourceIsInline(source,text));
  if (!sources?.length) return null;
  if(presentation)return <div className="hcs-chat-sources">{sources.map((source,index)=><PresentationSourcePreview key={index} source={source}/>)}</div>;
  return <div className="studio-message-sources">{sources.map((source, index) => source.kind === 'image' && source.image ? <SourceImage key={index} source={source} /> : <SourceReference key={index} source={source} />)}</div>;
}

function SourceReference({ source }: { source: SourceReference }) {
  const label = source.kind === 'link' && source.url ? source.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : source.name;
  const content = <><SourceReferenceIcon source={source} /><span>{label}</span></>;
  return <Tooltip label={source.name} description={source.url ? 'Open in new tab' : undefined} side="top">
    {source.url
      ? <WorkspaceExternalLink className="studio-message-source" data-kind={source.kind} href={source.url}>{content}</WorkspaceExternalLink>
      : <span className="studio-message-source">{content}</span>}
  </Tooltip>;
}

function SourceImage({ source }: { source: SourceReference }) {
  const [anchor, setAnchor] = useState<{ left: number; top: number; width: number } | null>(null);
  const [open, setOpen] = useState(false);
  const show = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const image = element.querySelector('img');
    const ratio = image?.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 4 / 3;
    const width = Math.min(520, innerWidth - 32, Math.min(380, innerHeight - 32) * ratio);
    setAnchor({ width, left: rect.right + 12 + width <= innerWidth - 16 ? rect.right + 12 : Math.max(16, rect.left - width - 12), top: Math.max(16, Math.min(rect.top, innerHeight - width / ratio - 16)) });
  };
  useEffect(() => {
    if (!anchor) return;
    const close = () => setAnchor(null);
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('scroll', close, true); window.addEventListener('resize', close); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); window.removeEventListener('keydown', key); };
  }, [anchor]);
  return <>
    <button className="studio-message-image" type="button" aria-label={`Preview ${source.name}`} onMouseEnter={event => show(event.currentTarget)} onMouseLeave={() => setAnchor(null)} onFocus={event => show(event.currentTarget)} onBlur={() => setAnchor(null)} onClick={() => { setAnchor(null); setOpen(true); }}>
      <img src={source.image} alt={source.name} loading="lazy" />
      <span>{source.name}</span>
    </button>
    {anchor && !open && createPortal(<div className="studio-source-image-hover" aria-hidden="true" style={anchor}><img src={source.image} alt="" /></div>, document.body)}
    {open && createPortal(<Dialog open width={960} onClose={() => setOpen(false)}><DialogHeader title={source.name} onClose={() => setOpen(false)} /><DialogBody><img className="studio-source-image-expanded" src={source.image} alt={source.name} /></DialogBody></Dialog>, document.body)}
  </>;
}

async function imageSource(file: File, preserveTransparency = false): Promise<StudioSource> {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) throw new Error('Choose a PNG, JPG, WebP or SVG image.');
  if (file.size > 20000000) throw new Error('Choose an image smaller than 20 MB.');
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = objectUrl; await image.decode();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This image could not be opened.');
    let edge = Math.min(1600, Math.max(image.width, image.height));
    for (let attempt = 0; attempt < 6; attempt++) {
      const scale = Math.min(1, edge / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
      if (!preserveTransparency) { context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL(preserveTransparency ? 'image/webp' : 'image/jpeg', .86 - attempt * .06);
      if (data.length <= sourceLimits.image) return { kind: 'image', name: (file.name || 'Pasted image').slice(0, 160), image: data };
      edge *= .8;
    }
    throw new Error('This image is too detailed. Crop it and try again.');
  } finally { URL.revokeObjectURL(objectUrl); }
}
async function fileSource(file: File, presentation=false, preserveTransparency=false): Promise<StudioSource> {
  if(presentation && /\.(pdf|pptx)$/i.test(file.name)){const source=await canvasAgent.readSource(file);return {kind:'text',name:source.name,text:`Attached document: ${source.name}`,fileData:source.data};}
  if (file.type.startsWith('image/')) return imageSource(file, preserveTransparency);
  return textFileSource(file);
}

export function useStudioSources(disabled: boolean, onError: (message: string) => void, browserConnected = false, browserInstalled = false, presentation = false, preserveTransparency = false) {
  const [sources, setSources] = useState<StudioSource[]>([]);
  const current = useRef(sources); current.current = sources;
  const [dialog, setDialog] = useState<'link' | 'text' | 'linear' | 'extension' | null>(null);
  const [value, setValue] = useState('');
  const [name, setName] = useState('');
  const [problem, setProblem] = useState('');
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  useEffect(() => listenForFileDragEnd(() => { dragDepth.current = 0; setDragging(false); }), []);
  const working = useRef(false);
  const epoch = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const htmlInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => { epoch.current++; controller.current?.abort(); }, []);
  const clear = () => { epoch.current++; controller.current?.abort(); setSources([]); current.current = []; setDialog(null); setReading(false); working.current = false; };
  const append = (additions: StudioSource[]) => {
    const next = [...current.current, ...additions];
    if (next.length > sourceLimits.count) throw new Error('Add up to six sources per message.');
    if (!sourcesSchema.safeParse(next).success) throw new Error('These sources are too large. Remove a source or use smaller images.');
    current.current = next; setSources(next);
  };
  async function addFiles(files: File[]) {
    if (disabled || working.current || !files.length) return;
    if (files.length + current.current.length > sourceLimits.count) { onError('Add up to six sources per message.'); return; }
    working.current = true; setReading(true); const attempt = epoch.current;
    try { const additions = await Promise.all(files.map(file=>fileSource(file,presentation,preserveTransparency))); if (attempt === epoch.current) append(additions); }
    catch (error) { if (attempt === epoch.current) onError((error as Error).message); }
    finally { if (attempt === epoch.current) { setReading(false); working.current = false; } }
  }
  const close = () => { controller.current?.abort(); setDialog(null); setProblem(''); };
  async function addSource() {
    if (disabled || working.current || !dialog || dialog === 'extension') return;
    setProblem('');
    if (dialog === 'text') {
      try { append([{ kind: 'text', name: name.trim() || 'Pasted text', text: value.trim() }]); close(); }
      catch (error) { setProblem((error as Error).message); }
      return;
    }
    const input = value.trim();
    if (dialog === 'link' && !sourceUrlSchema.safeParse(input).success) { setProblem('Enter a public http or https link.'); return; }
    if(presentation && dialog==='link'){try{append([{kind:'link',name:new URL(input).hostname,url:input,text:deferredSourceText}]);close();}catch(error){setProblem((error as Error).message);}return;}
    working.current = true; setReading(true); const attempt = epoch.current;
    const request = new AbortController(); controller.current = request;
    try {
      const source = await studioApi<StudioSource>(dialog === 'linear' ? 'linear-issue' : 'source-link', dialog === 'linear' ? { issue: input } : { url: input }, request.signal);
      if (!request.signal.aborted && attempt === epoch.current) { append([source]); close(); }
    } catch (error) { if (!request.signal.aborted && attempt === epoch.current) setProblem((error as Error).message); }
    finally { if (attempt === epoch.current) { setReading(false); working.current = false; } }
  }
  const events = {
    onPasteCapture: (event: ClipboardEvent<HTMLDivElement>) => { const files = Array.from(event.clipboardData.files); if (files.length && !disabled) { event.preventDefault(); void addFiles(files); } },
    onDragEnter: (event: DragEvent<HTMLDivElement>) => { if (event.dataTransfer.types.includes('Files') && !disabled) { event.preventDefault(); dragDepth.current++; setDragging(true); } },
    onDragLeave: () => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); },
    onDragOver: (event: DragEvent<HTMLDivElement>) => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'; } },
    onDrop: (event: DragEvent<HTMLDivElement>) => { dragDepth.current = 0; setDragging(false); if (event.dataTransfer.files.length) { event.preventDefault(); event.stopPropagation(); void addFiles(Array.from(event.dataTransfer.files)); } },
  };
  return {
    sources, clear, reading, dragging, events, addSources: append,
    openBrowser: () => { setProblem(''); setDialog('extension'); },
    openLinear: (issue: string) => { setValue(issue); setName(''); setProblem(''); setDialog('linear'); },
    trigger: <AddSourceMenu items={presentation ? [menuItems[2],menuItems[5],menuItems[3],menuItems[0]] : menuItems} connectors={false} tooltip="Add files, images, and links" onSelect={id => {
      if (id === 'images') imageInput.current?.click();
      else if (id === 'html') htmlInput.current?.click();
      else if (id === 'files') fileInput.current?.click();
      else { setValue(''); setName(''); setProblem(''); setDialog(id as 'link' | 'text' | 'linear' | 'extension'); }
    }} trigger={<Button variant="neutral" size="md" disabled={disabled || reading || sources.length >= sourceLimits.count} aria-label="Add source" leadingIcon={<Icon name={reading ? 'loader-circle' : 'plus'} size={18} />} />} />,
    attachments: presentation && sources.length ? <div className="hcs-chat-sources" data-composer>{sources.map((source,index)=><PresentationSourcePreview key={index} source={source} onRemove={()=>setSources(items=>items.filter((_,i)=>i!==index))}/>)}</div> : sources.length ? <div className="studio-source-attachments">{sources.map((source, index) => <div className="studio-source-attachment" key={index}>
      {source.kind === 'image' ? <img src={source.image} alt={source.name} /> : <span className="studio-source-symbol"><Icon name={iconFor(source.kind)} size={20} /></span>}
      <span className="studio-source-info"><strong title={source.name}>{source.name}</strong><small>{source.kind === 'image' ? 'Image' : source.kind === 'link' ? new URL(source.url).hostname : isHtmlSource(source.name) ? 'HTML · Ready to convert' : `${source.text.length.toLocaleString('en-US')} characters`}</small></span>
      <Button variant="ghost" size="sm" aria-label={`Remove ${source.name}`} disabled={disabled || reading} leadingIcon={<Icon name="x" size={14} />} onClick={() => setSources(items => items.filter((_, item) => item !== index))} />
    </div>)}</div> : undefined,
    dialogs: <>
      <input ref={imageInput} type="file" hidden multiple accept="image/png,image/jpeg,image/webp" onChange={event => { void addFiles(Array.from(event.target.files || [])); event.target.value = ''; }} />
      <input ref={htmlInput} type="file" hidden accept=".html,.htm,text/html,application/xhtml+xml" onChange={event => { void addFiles(Array.from(event.target.files || [])); event.target.value = ''; }} />
      <input ref={fileInput} type="file" hidden multiple accept={presentation?sourceFileAccept+',.pdf,.pptx,.svg':sourceFileAccept} onChange={event => { void addFiles(Array.from(event.target.files || [])); event.target.value = ''; }} />
      {dialog === 'extension' && createPortal(<Dialog open onClose={close} width={520} ariaLabel="Connect Chrome">
        <DialogHeader title={browserConnected ? 'Chrome is connected' : 'Connect Chrome to Studio'} description="Bring the pages you’re working on into your prototype." onClose={close} />
        <DialogBody><div className="studio-extension-guide">
          <ol className="studio-extension-steps">
            <li><span className="studio-extension-step">1</span><div><strong>Download the extension</strong><p>Unzip the downloaded folder.</p></div></li>
            <li><span className="studio-extension-step">2</span><div><strong>Add it to Chrome</strong><p>Open <code>chrome://extensions</code>, enable <strong>Developer mode</strong>, then choose <strong>Load unpacked</strong> and select the folder.</p></div></li>
            <li><span className="studio-extension-step">3</span><div><strong>Connect your chat</strong><p>Reload Studio. Open the extension and choose <strong>Connect this Studio chat</strong>.</p></div></li>
          </ol>
          <div className="studio-extension-status"><Icon name={browserConnected || browserInstalled ? 'check' : 'link'} size={16} /><span>{browserConnected ? 'Connected · Ready to read the links you send.' : browserInstalled ? 'Extension installed · Connect this chat from Chrome.' : 'Once connected, paste a page link into your message.'}</span></div>
          <p className="studio-extension-note">Access lasts 30 minutes. Only pages you request are read and shared with Studio’s AI. Studio won’t click or edit those pages.</p>
          <details><summary>Already installed?</summary><p>Replace the extension folder with the latest download, choose <strong>Reload</strong> in Chrome, then reload Studio.</p></details>
        </div></DialogBody>
        <DialogFooter><Button variant="ghost" onClick={close}>Close</Button><a className="ui-btn" data-variant="primary" href="/downloads/asset-studio-chrome.zip" download>Download extension</a></DialogFooter>
      </Dialog>, document.body)}
      {dialog && dialog !== 'extension' && createPortal(<Dialog open onClose={close} ariaLabel={dialog === 'linear' ? 'Add Linear issue' : dialog === 'link' ? 'Add link' : 'Add text'} size="md">
        <DialogHeader title={dialog === 'linear' ? 'Add Linear issue' : dialog === 'link' ? 'Add link' : 'Add text'} description={dialog === 'linear' ? 'Use the title and description of a Linear issue as a reference.' : dialog === 'link' ? 'Use a public page as a reference.' : 'Add notes, requirements, or reference content.'} onClose={close} />
        <DialogBody><form id="studio-add-source" className="studio-source-form" onSubmit={event => { event.preventDefault(); void addSource(); }}>
          {dialog === 'text' && <label>Name <Input value={name} maxLength={160} placeholder="Reference notes" onChange={event => setName(event.target.value)} disabled={reading} /></label>}
          <label>{dialog === 'linear' ? 'Issue link or ID' : dialog === 'link' ? 'Link' : 'Text'}{dialog !== 'text' ? <Input type={dialog === 'linear' ? 'text' : 'url'} value={value} maxLength={2000} placeholder={dialog === 'linear' ? 'DOC-123 or https://linear.app/asset/issue/…' : 'https://example.com'} onChange={event => setValue(event.target.value)} disabled={reading} /> : <Textarea value={value} rows={7} maxLength={sourceLimits.text} placeholder="Paste your content…" onChange={event => setValue(event.target.value)} />}</label>
          {problem && <p className="studio-source-error" role="alert">{problem}</p>}
        </form></DialogBody>
        <DialogFooter><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="primary" type="submit" form="studio-add-source" disabled={reading || !value.trim()}>{reading ? (dialog === 'linear' ? 'Reading issue…' : 'Reading page…') : 'Add source'}</Button></DialogFooter>
      </Dialog>, document.body)}
    </>,
  };
}

function PresentationSourcePreview({source,onRemove}:{source:SourceReference;onRemove?:()=>void}) {
 const [open,setOpen]=useState(false),image=source.image,kind=source.kind==='link'?'LINK':source.name.split('.').pop()?.toUpperCase();
 if(source.kind==='link')return <div className="hcs-source-link"><SourceReference source={source}/>{onRemove&&<Button variant="ghost" size="sm" aria-label="Remove source" leadingIcon={<Icon name="x" size={14}/>} onClick={onRemove}/>}</div>;
 const icon=image?'image':kind==='PPTX'?'presentation':'file-text';
 return <><div className="hcs-source-attachment" data-image={image?true:undefined}><Card variant="flat" clickable className="hcs-source-card" data-compact={!image||undefined} onClick={()=>setOpen(true)} aria-label={`Preview ${source.name}`}>
 {image?<CardMedia aspectRatio={onRemove?"1 / 1":"16 / 9"} className="hcs-source-preview"><img src={image} alt=""/></CardMedia>:<span className="hcs-source-icon"><Icon name={icon} size={22}/></span>}
 <div className="hcs-source-label">{image&&<Icon name={icon} size={16}/>}<div className="hcs-source-name"><Tooltip label={source.name} onlyWhenTruncated side="top"><strong>{source.name}</strong></Tooltip>{!image&&<span>{kind}</span>}</div></div>
 </Card>{onRemove&&<Button className="hcs-source-remove" variant="neutral" size="sm" aria-label="Remove source" leadingIcon={<Icon name="x" size={14}/>} onClick={()=>{setOpen(false);onRemove();}}/>}</div>
 {open&&createPortal(<Dialog open onClose={()=>setOpen(false)} width={840} ariaLabel={source.name}><DialogHeader title={source.name} onClose={()=>setOpen(false)}/><DialogBody>{image?<img className="hcs-source-expanded" src={image} alt={source.name}/>:source.url?<WorkspaceExternalLink href={source.url}>{source.url}</WorkspaceExternalLink>:source.fileData&&kind==='PDF'?<iframe className="hcs-source-document" title={source.name} src={source.fileData}/>:<pre className="hcs-source-text">{source.text||source.name}</pre>}</DialogBody></Dialog>,document.body)}</>;
}
