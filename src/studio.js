import './studio.css';

export function studio({ library = false, badge, asset, starter = false, workspace = 'partners' } = {}) {
  const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  return `<section class="partner-studio" aria-label="Make your own"><iframe src="/studio/index.html?theme=${theme}&workspace=${workspace}${starter ? '&starter=grow-your-business' : ''}${library ? '&panel=library' : ''}${asset ? `&asset=${encodeURIComponent(asset)}` : badge ? `&badge=${encodeURIComponent(badge)}` : ''}" title="Lovable design studio" allow="clipboard-read; clipboard-write"></iframe></section>`;
}

// Reveal the frame only after its initial theme and React styles are ready.
window.addEventListener('message', event => {
  const frame = document.querySelector('.partner-studio iframe');
  if (frame && event.origin === window.location.origin && event.source === frame.contentWindow && event.data?.type === 'lovable-studio-ready') { syncStudioTheme(); frame.dataset.ready = 'true'; }
  // Keep a reviewed Community proposal open on refresh instead of recreating its starter.
  if (frame && event.origin === window.location.origin && event.source === frame.contentWindow && ['lovable-community-asset','lovable-brand-asset'].includes(event.data?.type) && (event.data.type==='lovable-community-asset'?/^#ambassadors\/create(?:\/|$)/:/^#brand\/create(?:\/|$)/).test(location.hash) && /^[a-f0-9-]{36}$/i.test(event.data.id)) {
    history.replaceState(null, '', `#${event.data.type==='lovable-brand-asset'?'brand':'ambassadors'}/create/${event.data.id}`);
  }
});

function syncStudioTheme() {
  document.querySelector('.partner-studio iframe')?.contentWindow?.postMessage({ type: 'lovable-studio-theme', theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark' }, window.location.origin);
}
new MutationObserver(syncStudioTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
