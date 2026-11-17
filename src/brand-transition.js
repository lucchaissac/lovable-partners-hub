const layer = document.querySelector('[data-brand-transition]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const names = { 'tech-blog':'Tech blog', lovable: 'Lovable', partners: 'Partners', ambassadors: 'Community' };
let currentWorkspace;
let animations = [];
let timeout;
let revision = 0;

function dismiss() {
  revision += 1;
  clearTimeout(timeout);
  animations.forEach(animation => animation.cancel());
  animations = [];
  if (layer) layer.hidden = true;
}

// Routes remain visible behind the word. Fast switches replace the current
// animation instead of queuing transitions or delaying the user's destination.
export function showWorkspaceTransition(workspace) {
  if (workspace === currentWorkspace) return;
  const firstVisit = currentWorkspace === undefined;
  currentWorkspace = workspace;
  dismiss();
  if (!layer || reducedMotion.matches) return;

  const label = layer.querySelector('span');
  label.textContent = firstVisit ? 'Lovable' : names[workspace] || 'Lovable';
  layer.dataset.managed = '';
  layer.hidden = false;
  const activeRevision = revision;

  try {
    const word = label.animate([
      { opacity: firstVisit ? 1 : 0, offset: 0, easing: 'cubic-bezier(.16,1,.3,1)' },
      { opacity: 1, offset: 48 / 1820 },
      { opacity: 1, offset: 1708 / 1820, easing: 'cubic-bezier(.2,0,0,1)' },
      { opacity: 0, offset: 1 },
    ], { duration: 1820, easing: 'linear', fill: 'both' });
    animations = [word];
    word.finished.then(() => {
      if (activeRevision === revision) dismiss();
    }).catch(() => {});
    timeout = setTimeout(() => {
      if (activeRevision === revision) dismiss();
    }, 2200);
  } catch {
    dismiss();
  }
}

reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) dismiss();
});
window.addEventListener('pageshow', event => {
  if (event.persisted) dismiss();
});
