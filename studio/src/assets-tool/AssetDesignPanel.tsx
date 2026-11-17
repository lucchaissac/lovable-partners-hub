import {applyCommunityContrast} from './communityGraphic';
import {brandPartnerBlock,updateBrandPartner} from './brandAsset';
import {BrandLogoControls} from './BrandLogoDesign';
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
  const partner=studioWorkspace==='lovable'?brandPartnerBlock(asset):undefined;
  return <aside className="lovable-design" aria-label="Design panel" data-collapsed={collapsed || undefined} data-mobile-open={mobileOpen || undefined} data-selection={panelOpen || undefined}>
    {collapsed && <div className="lovable-design-rail"><Tooltip label="Expand design panel" side="bottom"><Button variant="ghost" aria-label="Expand design panel" leadingIcon={<Icon name="panel-right-open" size={16}/>} onClick={()=>setCollapsed(false)}/></Tooltip></div>}
    <div className="lovable-design-content">
    <WorkspaceInspector />
    {!panelOpen && <div className="lovable-design-default">
      <div className="lovable-panel-title"><span>Design</span><Tooltip label="Collapse design panel" side="bottom"><Button variant="ghost" aria-label="Collapse design panel" leadingIcon={<Icon name="panel-right-close" size={16}/>} onClick={()=>{setCollapsed(true);onClose();}}/></Tooltip></div>
      <div className="lovable-design-section"><h2>Canvas</h2><div className="lovable-dimensions"><div><span>Width</span><strong>{width}</strong></div><div><span>Height</span><strong>{height}</strong></div></div>
        {studioWorkspace!=='partners'?<div className="lovable-field"><span>Background</span><StudioShapeColor label="Canvas background" disabled={false} value={assetColor(asset.background)} onChange={(background:string)=>onChange({...asset,background})}/></div>:<label className="lovable-field">Background<div className="lovable-select"><select value={asset.background} onChange={event => onChange({ ...asset, background: event.target.value as AssetDocument['background'] })}>{backgrounds.filter(color => color !== 'beige').map(color => <option key={color} value={color}>{names[color]}</option>)}</select><Icon name="chevron-down" size={14}/></div></label>}
      </div>
      {asset.community?.layout==='graphic'&&<div className="lovable-design-section"><label className="community-contrast-toggle"><input type="checkbox" checked={asset.community.autoContrast!==false} onChange={event=>{const next={...asset,community:{...asset.community!,autoContrast:event.target.checked}};onChange(event.target.checked?applyCommunityContrast(next):next);}}/>Auto contrast</label></div>}
      {partner&&<div className="lovable-design-section brand-logo-controls"><h2>Partner logo</h2><BrandLogoControls block={partner} onChange={block=>onChange(updateBrandPartner(asset,block))}/></div>}
    </div>}
    </div>
  </aside>;
}
