import { useEffect, useRef, useState } from 'react';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, Icon, Input, Tooltip } from '@asset/ui';
import { useHtmlEditorInsert } from '../studio/HtmlEditorInsert';

type LibraryAsset = { id: string; name: string; src: string };
let library: Promise<LibraryAsset[]> | undefined;

function loadLibrary() {
  return library ??= Promise.all([import('../../../src/badges.js'), import('../../../src/export.js')]).then(async ([badges, exporter]) => {
    await badges.prepareTypography();
    return Promise.all(badges.FORMATS.map(async format => ({
      id: format.id, name: format.name,
      src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(await exporter.makeExportSvg(format.id, { tier: 'Select', year: '2026', partnerName: 'Logo', symbolSize: 'large' }))}`,
    })));
  }).catch(error => { library = undefined; throw error; });
}

export function AssetLibrary({ open, onOpenChange, onNew }: { open: boolean; onOpenChange: (open: boolean) => void; onNew: () => void }) {
  const trigger = useRef<HTMLDivElement>(null);
  const close = () => { onOpenChange(false); requestAnimationFrame(() => trigger.current?.querySelector('button')?.focus({ preventScroll: true })); };
  const insert = useHtmlEditorInsert();
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState('');
  useEffect(() => {
    let active = true;
    loadLibrary().then(items => { if (active) setAssets(items); }).catch(() => { if (active) setError('Could not load the library.'); });
    return () => { active = false; };
  }, []);

  const add = async (asset: LibraryAsset) => {
    setAdding(asset.id); setError('');
    try {
      const image = new Image(); image.src = asset.src; await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth * 2; canvas.height = image.naturalHeight * 2;
      canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
      const scale = Math.min(480 / image.naturalWidth, 480 / image.naturalHeight);
      if (!insert.current) throw new Error('The canvas is still opening.');
      insert.current({ id: crypto.randomUUID(), kind: 'image', value: { src: canvas.toDataURL('image/png'), alt: asset.name, caption: '', alignment: 'center', width: 100 }, editor: { widthPx: image.naturalWidth * scale, height: image.naturalHeight * scale, appearance: { imageFit: 'contain' } } });
      close();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not add this asset.'); }
    finally { setAdding(''); }
  };

  return <div ref={trigger}><DropdownMenu open={open} onOpenChange={onOpenChange}>
    <Tooltip label="Library" side="bottom"><span className="studio-insert-tool"><DropdownMenuTrigger><Button variant="ghost" aria-label="Open asset library" aria-haspopup="dialog" aria-expanded={open} leadingIcon={<Icon name="library" size={16}/>}/></DropdownMenuTrigger></span></Tooltip>
    <DropdownMenuContent width={320} style={{width:'min(320px, calc(100vw - 16px))',minWidth:0}} fitViewport align="start" className="lovable-library-menu" role="dialog" aria-label="Asset library" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}}}>
    <div className="lovable-library-header"><span>Library</span><Button size="sm" variant="ghost" onClick={()=>{close();onNew();}}>New design</Button></div>
    <Input autoFocus inputSize="sm" aria-label="Search assets" placeholder="Search assets…" value={query} onChange={event => setQuery(event.target.value)} leadingIcon={<Icon name="search" size={14}/>}/>
    <div className="lovable-library-grid" aria-busy={!!adding}>
      {assets.filter(asset => asset.name.toLowerCase().includes(query.toLowerCase())).map(asset => <button key={asset.id} className="lovable-library-item" aria-label={`Add ${asset.name}`} disabled={!!adding} onClick={() => void add(asset)}><span><img src={asset.src} alt=""/>{adding === asset.id && <span className="lovable-library-loading">Adding…</span>}</span><span>{asset.name}</span></button>)}
    </div>
    {!!assets.length && !assets.some(asset=>asset.name.toLowerCase().includes(query.toLowerCase())) && <p role="status">No assets found.</p>}
    {!assets.length && !error && <p role="status">Loading assets…</p>}
    {error && <p role="alert">{error}</p>}
    </DropdownMenuContent>
  </DropdownMenu></div>;
}
