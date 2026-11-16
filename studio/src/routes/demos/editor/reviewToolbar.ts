import { useSyncExternalStore } from 'react';

const storageKey = 'asset-review-toolbar-hidden';
const listeners = new Set<() => void>();
let hidden = readPreference();
function readPreference() { try { return localStorage.getItem(storageKey) === '1'; } catch { return false; } }
function publish() { listeners.forEach(listener => listener()); }
function storageChanged(event: StorageEvent) {
  if (event.key !== storageKey && event.key !== null) return;
  hidden = readPreference(); publish();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) { hidden = readPreference(); window.addEventListener('storage', storageChanged); }
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener('storage', storageChanged); };
}
export function toggleReviewToolbar() {
  hidden = !hidden;
  try { localStorage.setItem(storageKey, hidden ? '1' : '0'); } catch { /* Sandboxed previews keep the preference in memory. */ }
  publish();
}
export const useReviewToolbarHidden = () => useSyncExternalStore(subscribe, () => hidden, () => false);

export function isReviewToolbarShortcut(event: KeyboardEvent) {
  if (event.defaultPrevented || event.repeat || event.isComposing || !event.shiftKey || event.metaKey || event.ctrlKey || event.altKey || event.key.toLowerCase() !== 't') return false;
  const target = event.target as Element | null;
  return !target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="dialog"], [role="menu"]');
}
