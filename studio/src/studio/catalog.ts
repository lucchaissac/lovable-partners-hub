export const studioCatalog = [
  { id: '/protos/ai-suggestions', title: 'AI · Suggestions' },
  { id: '/protos/brand-settings', title: 'Brand settings' },
  { id: '/protos/salesforce-settings', title: 'DOC-8025 · Salesforce settings' },
  { id: '/protos/workspace-layout', title: 'DOC-8102 · Workspace layout' },
  { id: '/protos/asset-design', title: 'Asset Design' },
  { id: '/protos/home-sidebar', title: 'Home · Sidebar' },
  { id: '/protos/learning-admin', title: 'Learning admin' },
  { id: '/protos/widget-dropdown', title: 'Widget dropdown' },
  { id: '/ai', title: 'AI · Activity' },
  { id: '/protos/agent-build', title: 'Agent build' },
  { id: '/protos/agent-create', title: 'New agent' },
  { id: '/protos/agent-output', title: 'New agent (output)' },
  { id: '/protos/ai-agent-in-workspace', title: 'AI agent in workspace' },
  { id: '/protos/asset-ai-clean', title: 'Asset AI · clean (no grid)' },
  { id: '/protos/editor-threads', title: 'DOC-6314 · Editor threads' },
  { id: '/protos/new-workspace-ai', title: 'Create workspace · AI' },
  { id: '/protos/role-edit-crm', title: 'Account map · Edit role' },
  { id: '/protos/table-of-content', title: 'Editor · Table of contents' },
  { id: '/protos/template-ai-settings', title: 'Template · AI settings' },
  { id: '/protos/workspace-ai-settings', title: 'Workspace · AI settings' },
  { id: '/protos/html-page-editor', title: 'DOC-8164 · HTML page & widgets' },
  { id: '/protos/workspace-typography', title: 'Workspace typography' },
  { id: '/protos/ramp-editions', title: 'Ramp · Workspace editions' },
];
export type CatalogPreference = { route: string; archived: boolean; updated_at: string; display_title?: string | null; linear_url?: string | null; linear_id?: string | null };

// Stable identities connect the original URLs, shared edits and review history.
export function legacyPrototypeId(route: string): string | undefined {
  const index = studioCatalog.findIndex(item => item.id === route);
  return index >= 0 ? `ca7a1000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` : undefined;
}
export function legacyPrototypeRoute(id: string): string | undefined {
  return studioCatalog.find(item => legacyPrototypeId(item.id) === id)?.id;
}
