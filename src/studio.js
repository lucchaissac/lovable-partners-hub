import './studio.css';

export function studio({ library = false, badge, asset, starter = false, workspace = 'partners' } = {}) {
  const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  return `<section class="partner-studio" aria-label="Make your own"><iframe src="/studio/index.html?theme=${theme}&workspace=${workspace}${starter ? '&starter=grow-your-business' : ''}${library ? '&panel=library' : ''}${asset ? `&asset=${encodeURIComponent(asset)}` : badge ? `&badge=${encodeURIComponent(badge)}` : ''}" title="Lovable design studio" allow="clipboard-read; clipboard-write"></iframe></section>`;
}

// Reveal the frame only after its initial theme and React styles are ready.
window.addEventListener('message', event => {
  const frame = document.querySelector('.partner-studio iframe');
  if(frame&&event.origin===window.location.origin&&event.source===frame.contentWindow&&event.data?.type==='lovable-studio-expanded'&&typeof event.data.expanded==='boolean'){
    frame.parentElement.toggleAttribute('data-expanded',event.data.expanded);
    syncStudioExpanded();
  }
  if (frame && event.origin === window.location.origin && event.source === frame.contentWindow && event.data?.type === 'lovable-studio-ready') { syncStudioTheme(); frame.dataset.ready = 'true'; }
  // Keep each maker's active collection page open on refresh without remounting it.
  const routes = {
    'lovable-community-asset': { pattern: /^#ambassadors\/create(?:\/|$)/, prefix: '#ambassadors/create/' },
    'lovable-brand-asset': { pattern: /^#brand\/create(?:\/|$)/, prefix: '#brand/create/' },
    'lovable-tech-asset': { pattern: /^#tech-blog\/create(?:\/|$)/, prefix: '#tech-blog/create/' },
    'lovable-partner-asset': { pattern: /^#create(?:\/|$)/, prefix: '#create/' },
  };
  const route = routes[event.data?.type];
  if (frame && event.origin === window.location.origin && event.source === frame.contentWindow && route?.pattern.test(location.hash) && /^[a-f0-9-]{36}$/i.test(event.data.id)) {
    history.replaceState(null, '', `${route.prefix}${event.data.id}`);
  }
});

function syncStudioExpanded(){
  const header=document.querySelector('.hub-header');
  if(header)header.inert=!!document.querySelector('.partner-studio[data-expanded]');
}
new MutationObserver(syncStudioExpanded).observe(document.querySelector('#app'),{childList:true});

function syncStudioTheme() {
  document.querySelector('.partner-studio iframe')?.contentWindow?.postMessage({ type: 'lovable-studio-theme', theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark' }, window.location.origin);
}
new MutationObserver(syncStudioTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
