import {useSyncExternalStore} from 'react';
import {getPreviewRole, subscribePreviewRole} from '../../../src/local-access.js';
import {canInsertLayers} from '../../../shared/previewAccess.mjs';

export function usePreviewAccess() {
  const role = useSyncExternalStore(subscribePreviewRole, getPreviewRole);
  return {role, canInsert:canInsertLayers(role)};
}
