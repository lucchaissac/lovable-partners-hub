import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '@asset/ui';
import { StudioLoading } from '../studio/StudioLoading';
import { assetTheme } from './websiteTokens';
import './assets.css';

export function AssetHome({ reading = false, opening = false, onBrowse, children }: { reading?: boolean; opening?: boolean; onBrowse?: () => void; children?: ReactNode }) {
  return <div className="asset-home">
    <section className="asset-intro">
      <span className="asset-intro-logo"><Icon name="image" size={32}/></span>
      <h1>Create your next asset.</h1>
      <button className="asset-upload" disabled={reading || opening} onClick={onBrowse}>
        <span className="asset-upload-icon"><Icon name={reading ? 'loader-circle' : 'upload'} size={24} /></span>
        <strong>{reading ? 'Opening your image…' : 'Drop a product image here'}</strong>
        <span>paste an image, or click to browse</span>
        <small>PNG, JPG or WebP · up to 12 MB</small>
      </button>
    </section>
    {children}
  </div>;
}

export function AssetRecents({ loading = false, children }: { loading?: boolean; children?: ReactNode }) {
  return <section className="asset-recents studio-library" role={loading ? 'status' : undefined} aria-busy={loading} aria-label={loading ? 'Loading your assets' : 'Your assets'}>
    <div className="asset-recents-heading"><h2>Your assets</h2></div>
    <div className="studio-prototype-grid" aria-hidden={loading || undefined}>
      {loading ? Array.from({ length: 4 }, (_, index) => <div className="studio-prototype-card" key={index}><StudioLoading part="thumbnail" /><StudioLoading part="card-info" /></div>) : children}
    </div>
  </section>;
}

/** The real home stays in place while its editor code and saved assets load. */
export function AssetHomeOpening() {
  return <div className="workspace-editor asset-app" style={assetTheme as CSSProperties}><AssetHome opening><AssetRecents loading /></AssetHome></div>;
}
