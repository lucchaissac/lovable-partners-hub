export const studioWorkspace = new URLSearchParams(window.location.search).get('workspace') === 'ambassadors' ? 'ambassadors' : 'partners';
export const studioLastAssetKey = studioWorkspace === 'ambassadors' ? 'lovable-ambassadors-last-asset' : 'lovable-studio-last-asset';
export const studioOwner = (id = 'local') => studioWorkspace === 'ambassadors' ? `${id}:ambassadors` : id;
