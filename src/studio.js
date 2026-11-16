import './studio.css';

export function studio({ library = false, badge } = {}) {
  const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  return `<section class="partner-studio" aria-label="Make your own"><iframe src="/studio/index.html?theme=${theme}${library ? '&panel=library' : ''}${badge ? `&badge=${encodeURIComponent(badge)}` : ''}" title="Lovable design studio" allow="clipboard-read; clipboard-write"></iframe></section>`;
}

// Reveal the frame only after its initial theme and React styles are ready.
window.addEventListener('message', event => {
  const frame = document.querySelector('.partner-studio iframe');
  if (frame && event.origin === window.location.origin && event.source === frame.contentWindow && event.data?.type === 'lovable-studio-ready') { syncStudioTheme(); frame.dataset.ready = 'true'; }
});

function syncStudioTheme() {
  document.querySelector('.partner-studio iframe')?.contentWindow?.postMessage({ type: 'lovable-studio-theme', theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark' }, window.location.origin);
}
new MutationObserver(syncStudioTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
