import { useEffect, useState } from 'react';
import { Button, Icon, Input } from '@asset/ui';
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

export function AssetLibrary({ onClose, onNew }: { onClose: () => void; onNew: () => void }) {
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
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not add this asset.'); }
    finally { setAdding(''); }
  };

  return <aside className="lovable-library" aria-label="Asset library">
    <div className="lovable-library-header"><Button variant="ghost" aria-label="Back to chat" onClick={onClose} leadingIcon={<Icon name="arrow-left" size={16}/>}/><span>Library</span></div>
    <Button variant="neutral" onClick={onNew}>New design</Button>
    <Input inputSize="sm" aria-label="Search assets" placeholder="Search assets…" value={query} onChange={event => setQuery(event.target.value)} leadingIcon={<Icon name="search" size={14}/>}/>
    <div className="lovable-library-grid" aria-busy={!!adding}>
      {assets.filter(asset => asset.name.toLowerCase().includes(query.toLowerCase())).map(asset => <button key={asset.id} className="lovable-library-item" aria-label={`Add ${asset.name}`} disabled={!!adding} onClick={() => void add(asset)}><span><img src={asset.src} alt=""/>{adding === asset.id && <span className="lovable-library-loading">Adding…</span>}</span><span>{asset.name}</span></button>)}
    </div>
    {!assets.length && !error && <p role="status">Loading assets…</p>}
    {error && <p role="alert">{error}</p>}
  </aside>;
}
