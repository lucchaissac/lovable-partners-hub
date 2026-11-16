import { SkeletonBox, SkulletProvider } from 'skullet/react';
import 'skullet/styles.css';
import './studioLoading.css';

/** Loading and first generation only; never replaces an already rendered preview. */
export function StudioLoading({ part = 'chat' }: { part?: 'title' | 'chat' | 'composer' | 'prototypes' | 'preview' | 'thumbnail' | 'card-info' | 'gallery' }) {
  return <SkulletProvider mode="light" theme={{
    animation: 'shimmer', speed: 'slow', radius: '4px',
    light: { base: 'var(--ui-bg-muted)', highlight: 'var(--ui-bg-subtle)' },
  }} reveal={{ duration: 0 }}>
    <div className={`studio-loading studio-loading-${part}`} role="status" aria-label={part === 'chat' ? 'Loading conversation' : part === 'prototypes' || part === 'gallery' ? 'Loading prototypes' : part === 'preview' || part === 'thumbnail' ? 'Loading prototype preview' : 'Loading editor'}>
      <div aria-hidden="true">
        {part === 'gallery' ? <>
          <div className="studio-library-controls studio-loading-gallery-controls"><div><SkeletonBox width={104} height={32} radius="6px" /><SkeletonBox width={120} height={32} radius="6px" /></div><SkeletonBox width={240} height={32} radius="6px" /></div>
          <div className="studio-prototype-grid">{Array.from({ length: 10 }, (_, index) => <div className="studio-prototype-card" key={index}><StudioLoading part="thumbnail" /><StudioLoading part="card-info" /></div>)}</div>
        </> : part === 'card-info' ? <div className="studio-loading-card-caption"><SkeletonBox width={32} height={32} radius="50%" /><div><SkeletonBox width="76%" height={14} /><SkeletonBox width="48%" height={12} /></div></div> : part === 'thumbnail' ? <div className="studio-loading-thumbnail-layout">
          <div className="studio-loading-thumbnail-top"><SkeletonBox width="23%" height={8} /><SkeletonBox width="12%" height={8} /></div>
          <SkeletonBox width="48%" height={14} /><SkeletonBox width="70%" height={7} />
          <div className="studio-loading-thumbnail-cards">{[0, 1, 2].map(index => <SkeletonBox key={index} width="100%" height="100%" radius="4px" />)}</div>
          <SkeletonBox width="82%" height={7} /><SkeletonBox width="62%" height={7} />
        </div> : part === 'prototypes' ? [62, 78, 48, 68].map((width, index) => <div className="studio-loading-prototype-row" key={index}><SkeletonBox width={`${width}%`} height={14} /><SkeletonBox width={40} height={12} /></div>) : part === 'preview' ? <div className="studio-loading-preview-page">
          <div className="studio-loading-preview-header"><SkeletonBox width="26%" height={16} /><SkeletonBox width={64} height={28} /></div>
          <div className="studio-loading-preview-body">
            <div className="studio-loading-preview-intro"><SkeletonBox width="42%" height={28} /><SkeletonBox width="68%" height={12} /><SkeletonBox width="52%" height={12} /></div>
            <div className="studio-loading-preview-cards">{[0, 1, 2].map(index => <div className="studio-loading-preview-card" key={index}><SkeletonBox width="100%" height={112} radius="6px" /><SkeletonBox width="65%" height={14} /><SkeletonBox width="88%" height={10} /></div>)}</div>
            <div className="studio-loading-preview-rows">{[72, 84, 64].map(width => <div className="studio-loading-preview-row" key={width}><SkeletonBox width={`${width}%`} height={12} /><SkeletonBox width={48} height={12} /></div>)}</div>
          </div>
        </div> : part === 'title' ? <SkeletonBox width={152} height={16} /> : part === 'composer' ? <>
          <SkeletonBox width="65%" height={14} />
          <div className="studio-loading-composer-actions"><SkeletonBox width={20} height={20} /><SkeletonBox width={28} height={28} radius="50%" /></div>
        </> : <>
          <div className="studio-loading-prompt"><SkeletonBox width="100%" height={14} /><SkeletonBox width="74%" height={14} /></div>
          <div className="studio-loading-reply"><SkeletonBox width="92%" height={14} /><SkeletonBox width="100%" height={14} /><SkeletonBox width="60%" height={14} /></div>
        </>}
      </div>
    </div>
  </SkulletProvider>;
}
