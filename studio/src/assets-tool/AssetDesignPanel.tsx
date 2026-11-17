import { useEffect, useState } from 'react';
import { Button, Icon, Tooltip } from '@asset/ui';
import { WorkspaceInspector, useWorkspaceWidgetHost } from '../studio/WorkspaceWidgetHost';
import { assetDimensions, assetColor, backgrounds, type AssetDocument } from './model';
import { studioWorkspace } from './workspace';
import {StudioShapeColor} from '../studio/PresentationElementDesign';

const names: Record<string, string> = { ink: 'Dark', white: 'White', beige: 'Lovable beige', 'blue-soft': 'Soft blue', mint: 'Mint', 'yellow-soft': 'Warm white', 'pink-soft': 'Soft pink' };

export function AssetDesignPanel({ asset, onChange, onImport, mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void; asset: AssetDocument; onChange: (asset: AssetDocument) => void; onImport: () => void }) {
  const { panelOpen } = useWorkspaceWidgetHost();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { if (panelOpen || mobileOpen) setCollapsed(false); }, [panelOpen, mobileOpen]);
  const { width, height } = assetDimensions(asset);
  return <aside className="lovable-design" aria-label="Design panel" data-collapsed={collapsed || undefined} data-mobile-open={mobileOpen || undefined} data-selection={panelOpen || undefined}>
    {collapsed && <div className="lovable-design-rail"><Tooltip label="Expand design panel" side="bottom"><Button variant="ghost" aria-label="Expand design panel" leadingIcon={<Icon name="panel-right-open" size={16}/>} onClick={()=>setCollapsed(false)}/></Tooltip></div>}
    <div className="lovable-design-content">
    <WorkspaceInspector />
    {!panelOpen && <div className="lovable-design-default">
      <div className="lovable-panel-title"><span>Design</span><Tooltip label="Collapse design panel" side="bottom"><Button variant="ghost" aria-label="Collapse design panel" leadingIcon={<Icon name="panel-right-close" size={16}/>} onClick={()=>{setCollapsed(true);onClose();}}/></Tooltip></div>
      <div className="lovable-design-section"><h2>Canvas</h2><div className="lovable-dimensions"><div><span>Width</span><strong>{width}</strong></div><div><span>Height</span><strong>{height}</strong></div></div>
        {studioWorkspace==='ambassadors'?<div className="lovable-field"><span>Background</span><StudioShapeColor label="Canvas background" disabled={false} value={assetColor(asset.background)} onChange={(background:string)=>onChange({...asset,background})}/></div>:<label className="lovable-field">Background<div className="lovable-select"><select value={asset.background} onChange={event => onChange({ ...asset, background: event.target.value as AssetDocument['background'] })}>{backgrounds.filter(color => color !== 'beige').map(color => <option key={color} value={color}>{names[color]}</option>)}</select><Icon name="chevron-down" size={14}/></div></label>}
      </div>
    </div>}
    </div>
  </aside>;
}
