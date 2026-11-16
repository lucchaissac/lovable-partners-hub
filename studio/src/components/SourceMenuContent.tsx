import { Icon, Switch } from '@asset/ui';
import { useState, type PointerEventHandler, type Ref } from 'react';
import './source-menu.css';

export const CONNECTORS = [
  { id: 'chorus', label: 'Chorus', icon: 'chorus' },
  { id: 'gong', label: 'Gong', icon: 'gong' },
  { id: 'fathom', label: 'Fathom', icon: 'fathom' },
  { id: 'avoma', label: 'Avoma', icon: 'avoma' },
  { id: 'zoom', label: 'Zoom', icon: 'zoom' },
  { id: 'hubspot-meeting', label: 'HubSpot Meeting', icon: 'hubspot' },
  { id: 'teams', label: 'Microsoft Teams', icon: 'microsoft-teams' },
  { id: 'confluence', label: 'Confluence', icon: 'confluence' },
  { id: 'fireflies', label: 'Fireflies', icon: 'fireflies' },
  { id: 'salesloft', label: 'Salesloft', icon: 'salesloft' },
  { id: 'kaia', label: 'Kaia', icon: 'kaia.svg' },
  { id: 'notion', label: 'Notion', icon: 'notion' },
];
export const DEFAULT_CONNECTED_CONNECTORS = ['chorus', 'gong', 'fathom', 'confluence', 'fireflies', 'salesloft', 'kaia'];

export function ConnectorLogo({ icon }: { icon: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Icon name="plug" size={16} aria-hidden />;
  return <img src={`/icons/${icon.includes('.') ? icon : `${icon}.png`}`} alt="" width={16} height={16} className="asset-connector-logo" data-connector={icon} onError={() => setFailed(true)} />;
}

export type SourceMenuItem = { id: string; label: string; icon: string };

export function SourceMenuContent({ enabled, onSelect, onAccount, onConnectors, onConnectorsHover, connectorsRef, connectorsOpen = false, items, connectors = true }: {
  enabled: Set<string>;
  onSelect: (id: string) => void;
  onAccount?: () => void;
  onConnectors: () => void;
  onConnectorsHover?: PointerEventHandler<HTMLButtonElement>;
  connectorsRef?: Ref<HTMLButtonElement>;
  connectorsOpen?: boolean;
  items?: SourceMenuItem[];
  connectors?: boolean;
}) {
  return <>
    <div className="ui-dropdown-list asset-source-menu-list">
      {(items ?? [
        { id: 'files', label: 'Add files', icon: 'paperclip' },
        { id: 'text', label: 'Add text', icon: 'type' },
        { id: 'library', label: 'Add from Library', icon: 'layout-grid' },
      ]).map(item => <button key={item.id} type="button" className="ui-reset ui-dropdown-item" onClick={() => onSelect(item.id)}>
        <span className="ui-dropdown-item-icon"><Icon name={item.icon} size={14} /></span><span className="ui-dropdown-item-label">{item.label}</span>
      </button>)}
      {onAccount && <button type="button" className="ui-reset ui-dropdown-item" onClick={onAccount}>
        <span className="ui-dropdown-item-icon"><Icon name="building-2" size={14} /></span><span className="ui-dropdown-item-label">Add account</span>
      </button>}
      {connectors && <button type="button" className="ui-reset ui-dropdown-item" disabled data-disabled>
        <span className="ui-dropdown-item-icon"><Icon name="video" size={14} /></span><span className="ui-dropdown-item-label">Saved meetings</span>
      </button>}
      {connectors && CONNECTORS.filter(item => enabled.has(item.id)).map(item => <button key={item.id} type="button" className="ui-reset ui-dropdown-item" onClick={() => onSelect(item.id === 'chorus' ? 'chorus-quick' : `source:${item.id}`)}>
        <span className="ui-dropdown-item-icon"><ConnectorLogo icon={item.icon} /></span><span className="ui-dropdown-item-label">{item.label}</span>
      </button>)}
    </div>
    {connectors && <div className="ui-dropdown-footer">
      <div className="ui-dropdown-separator" />
      <button ref={connectorsRef} type="button" className="ui-reset ui-dropdown-item" data-highlighted={connectorsOpen || undefined} aria-expanded={connectorsOpen} onPointerEnter={onConnectorsHover} onClick={onConnectors}>
        <span className="ui-dropdown-item-icon"><Icon name="cable" size={14} /></span><span className="ui-dropdown-item-label">Connectors</span>
        <span className="ui-dropdown-item-shortcut"><Icon name="chevron-right" size={12} /></span>
      </button>
    </div>}
  </>;
}

export function ConnectorMenuContent({ connected, enabled, onToggle, onConnect, onManage }: {
  connected: Set<string>;
  enabled: Set<string>;
  onToggle: (id: string, enabled: boolean) => void;
  onConnect: (id: string) => void;
  onManage?: () => void;
}) {
  return <>
    <div className="ui-dropdown-list asset-source-menu-list">
      {CONNECTORS.map(item => <div key={item.id} className="ui-dropdown-item">
        <span className="ui-dropdown-item-icon"><ConnectorLogo icon={item.icon} /></span><span className="ui-dropdown-item-label">{item.label}</span>
        {connected.has(item.id)
          ? <Switch size="xs" aria-label={`Use ${item.label}`} checked={enabled.has(item.id)} onChange={value => onToggle(item.id, value)} />
          : <button type="button" className="ui-reset asset-connector-add" aria-label={`Connect ${item.label}`} onClick={() => onConnect(item.id)}><Icon name="plus" size={14} /></button>}
      </div>)}
    </div>
    {onManage && <div className="ui-dropdown-footer">
      <div className="ui-dropdown-separator" />
      <button type="button" className="ui-reset ui-dropdown-item" onClick={onManage}>
        <span className="ui-dropdown-item-icon"><Icon name="settings" size={14} /></span><span className="ui-dropdown-item-label">Manage Connectors</span>
      </button>
    </div>}
  </>;
}
