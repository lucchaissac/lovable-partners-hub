import {brandElements,createBrandElement} from './brandAsset';
import {studioWorkspace} from './workspace';
import {communityElements,createCommunityElement} from './communityElements';
import { useEffect, useRef, useState } from 'react';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, Icon, Input, Tooltip } from '@asset/ui';
import { useHtmlEditorInsert } from '../studio/HtmlEditorInsert';

import { createPartnerBadge } from './partnerBadge';
import { defaultPartnerBadge, type PartnerBadgeSettings } from './partnerBadgeSettings';
import { loadLibrary, type LibraryAsset } from './badgeLibrary';

export function AssetLibrary({ open, onOpenChange, onNew, onImport }: { open: boolean; onOpenChange: (open: boolean) => void; onNew: () => void; onImport?:()=>void }) {
  const trigger = useRef<HTMLDivElement>(null);
  const close = () => { onOpenChange(false); requestAnimationFrame(() => trigger.current?.querySelector('button')?.focus({ preventScroll: true })); };
  const insert = useHtmlEditorInsert();
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState('');
  useEffect(() => {
    let active = true;
    (studioWorkspace==='ambassadors'?Promise.resolve(communityElements):studioWorkspace==='lovable'?Promise.resolve(brandElements):loadLibrary()).then(items => { if (active) setAssets(items); }).catch(() => { if (active) setError('Could not load the library.'); });
    return () => { active = false; };
  }, []);

  const add = async (asset: LibraryAsset) => {
    setAdding(asset.id); setError('');
    try {
      const badge = studioWorkspace==='ambassadors'?await createCommunityElement(asset.id):studioWorkspace==='lovable'?await createBrandElement(asset.id):await createPartnerBadge(defaultPartnerBadge(asset.id as PartnerBadgeSettings['format']));
      if (!insert.current) throw new Error('The canvas is still opening.');
      insert.current(badge);
      close();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not add this asset.'); }
    finally { setAdding(''); }
  };

  return <div ref={trigger}><DropdownMenu open={open} onOpenChange={onOpenChange}>
    <Tooltip label="Library" side="bottom"><span className="studio-insert-tool"><DropdownMenuTrigger><Button variant="ghost" aria-label="Open asset library" aria-haspopup="dialog" aria-expanded={open} leadingIcon={<Icon name="library" size={16}/>}/></DropdownMenuTrigger></span></Tooltip>
    <DropdownMenuContent width={320} style={{width:'min(320px, calc(100vw - 16px))',minWidth:0}} fitViewport align="start" className="lovable-library-menu" role="dialog" aria-label="Asset library" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}}}>
    <div className="lovable-library-header"><span>Library</span>{onImport&&<Button size="sm" variant="ghost" onClick={()=>{close();onImport();}}>Open source</Button>}<Button size="sm" variant="ghost" onClick={()=>{close();onNew();}}>New design</Button></div>
    <Input autoFocus inputSize="sm" aria-label="Search assets" placeholder="Search assets…" value={query} onChange={event => setQuery(event.target.value)} leadingIcon={<Icon name="search" size={14}/>}/>
    <div className="lovable-library-grid" aria-busy={!!adding}>
      {assets.filter(asset => asset.name.toLowerCase().includes(query.toLowerCase())).map(asset => <button key={asset.id} className="lovable-library-item" data-community-media={(studioWorkspace==='lovable'||studioWorkspace==='ambassadors'&&asset.id.startsWith('library-'))||undefined} data-community-transparent={studioWorkspace!=='partners'&&asset.transparent||undefined} aria-label={`Add ${asset.name}`} disabled={!!adding} onClick={() => void add(asset)}><span><img src={asset.src} alt="" loading="lazy"/>{adding === asset.id && <span className="lovable-library-loading">Adding…</span>}</span><span>{asset.name}</span></button>)}
    </div>
    {!!assets.length && !assets.some(asset=>asset.name.toLowerCase().includes(query.toLowerCase())) && <p role="status">No assets found.</p>}
    {!assets.length && !error && <p role="status">Loading assets…</p>}
    {error && <p role="alert">{error}</p>}
    </DropdownMenuContent>
  </DropdownMenu></div>;
}
