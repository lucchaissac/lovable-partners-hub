import {normalizePreviewRole} from '../shared/previewAccess.mjs';

const key = 'lovable-local-preview-role';
const eventName = 'lovable-local-preview-role-change';
let role = 'designer';
if (import.meta.env.DEV) {
  try { role = normalizePreviewRole(sessionStorage.getItem(key)); } catch {}
  window.addEventListener('message', event => {
    if (window.parent === window || event.source !== window.parent || event.origin !== location.origin || event.data?.type !== eventName) return;
    setPreviewRole(event.data.role);
  });
}
export const getPreviewRole = () => import.meta.env.DEV ? role : 'designer';
export function subscribePreviewRole(listener) {
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}
export function setPreviewRole(next) {
  if (!import.meta.env.DEV) return;
  role = normalizePreviewRole(next);
  try { sessionStorage.setItem(key, role); } catch {}
  document.documentElement.dataset.previewRole = role;
  window.dispatchEvent(new Event(eventName));
  document.querySelector('.partner-studio iframe')?.contentWindow?.postMessage({type:eventName, role}, location.origin);
}
