import './studio.css';

export function studio({ library = false } = {}) {
  return `<section class="partner-studio" aria-label="Make your own"><iframe src="/studio/index.html${library ? '?panel=library' : ''}" title="Lovable design studio" allow="clipboard-read; clipboard-write"></iframe></section>`;
}

// Keep the dark shell visible until the embedded React UI has painted its styles.
window.addEventListener('message', event => {
  const frame = document.querySelector('.partner-studio iframe');
  if (frame && event.origin === window.location.origin && event.source === frame.contentWindow && event.data?.type === 'lovable-studio-ready') frame.dataset.ready = 'true';
});
