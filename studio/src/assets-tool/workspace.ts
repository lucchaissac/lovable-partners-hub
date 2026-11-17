const requestedWorkspace = new URLSearchParams(window.location.search).get('workspace');
export const studioWorkspace = requestedWorkspace === 'ambassadors' ? 'ambassadors' : requestedWorkspace === 'lovable' ? 'lovable' : 'partners';
export const studioLastAssetKey = studioWorkspace === 'ambassadors' ? 'lovable-ambassadors-last-asset' : studioWorkspace === 'lovable' ? 'lovable-brand-last-asset' : 'lovable-studio-last-asset';
export const studioOwner = (id = 'local') => studioWorkspace === 'partners' ? id : `${id}:${studioWorkspace}`;
