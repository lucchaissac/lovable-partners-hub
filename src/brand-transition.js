const layer = document.querySelector('[data-brand-transition]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const names = { lovable: 'Lovable', partners: 'Partners', ambassadors: 'Community' };
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
      { opacity: firstVisit ? 1 : 0, offset: 0 },
      { opacity: 1, offset: 0.22 },
      { opacity: 1, offset: 0.55 },
      { opacity: 0, offset: 1 },
    ], { duration: 780, easing: 'ease-in-out', fill: 'both' });
    animations = [word];
    word.finished.then(() => {
      if (activeRevision === revision) dismiss();
    }).catch(() => {});
    timeout = setTimeout(() => {
      if (activeRevision === revision) dismiss();
    }, 1600);
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
