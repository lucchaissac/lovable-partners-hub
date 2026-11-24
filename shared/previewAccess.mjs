// Local role demonstration only; this is not an authentication boundary.
export const previewRoles = ['designer', 'internal', 'external'];
export const normalizePreviewRole = role => previewRoles.includes(role) ? role : 'designer';
export const canInsertLayers = role => normalizePreviewRole(role) === 'designer';
export const canUseTeamGallery = role => normalizePreviewRole(role) !== 'external';
export function previewRoute(role, route) {
  if (normalizePreviewRole(role) !== 'external') return route;
  if (!['lovable', 'partners'].includes(route.workspace)) return {workspace:'partners', view:'gallery', section:undefined};
  if (route.workspace === 'lovable' && route.view !== 'guidelines') return {workspace:'lovable', view:'guidelines', section:undefined};
  return route;
}
export function addsLayers(previous, next) {
  const blocks = editor => editor.pages.flatMap(page => page.sections.flatMap(section => section.columns.flat()));
  const existing = new Map(blocks(previous).map(block => [block.id, block.kind]));
  return blocks(next).some(block => existing.get(block.id) !== block.kind);
}
