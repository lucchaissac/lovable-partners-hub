import { useEffect, useRef, useState } from 'react';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, Icon, Input, Tooltip } from '@asset/ui';
import { useHtmlEditorInsert } from '../studio/HtmlEditorInsert';

import { loadLibrary, rasterLibraryAsset, type LibraryAsset } from './badgeLibrary';

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
      const image = await rasterLibraryAsset(asset);
      const scale = Math.min(480 / image.width, 480 / image.height);
      if (!insert.current) throw new Error('The canvas is still opening.');
      insert.current({ id: crypto.randomUUID(), kind: 'image', value: { src: image.src, alt: asset.name, caption: '', alignment: 'center', width: 100 }, editor: { widthPx: image.width * scale, height: image.height * scale, appearance: { imageFit: 'contain' } } });
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
