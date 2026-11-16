import type { StudioDocument, StudioMessage } from './schema';

export type StudioUser = { id: string; name: string; email: string; avatarUrl?: string; superAdmin?: boolean };
export type StudioConfig = { storage: boolean; ai: boolean; user: StudioUser | null };
export type PrototypeMetadata = { project_id?: string | null; thumbnail?: string; display_title?: string | null; linear_url?: string | null; linear_id?: string | null };
export type SavedPrototype = PrototypeMetadata & { id: string; owner_id: string; title: string; document: StudioDocument; version: number; shared: boolean; archived: boolean; public_token?: string | null; conversation: StudioMessage[]; updated_at: string };
export type PublicPrototypeSummary = { thumbnail?: string; id: string; token: string; title: string; updated_at: string; linear_id: string | null };
export type PublicPrototype = Pick<SavedPrototype, 'id' | 'title' | 'document' | 'version'> & { prototypes: { token: string; title: string }[] };
export type StudioComment = { id: string; body: string; author_name: string; author_id: string; resolved: boolean; version: number; created_at: string; parent_id?: string | null; mentions?: import('../components/CommentMentions').CommentMember[] };
let cachedConfig: StudioConfig | undefined = {storage:false, ai:false, user:{id:'local',name:'You',email:''}};
export const studioSessionChanged = 'asset-studio-session-changed';
function updateStudioConfig(next: StudioConfig | undefined) {
  const changed = cachedConfig?.user?.id !== next?.user?.id;
  cachedConfig = next;
  if (changed && typeof window !== 'undefined') window.dispatchEvent(new Event(studioSessionChanged));
}
export const readStudioConfig = () => cachedConfig;
export type StudioNavigation = { config: StudioConfig; saved: SavedPrototype[]; published: PublicPrototypeSummary[]; catalog: import('./catalog').CatalogPreference[] };
export async function studioApi<T>(action: string, data?: unknown, signal?: AbortSignal): Promise<T> {
  if (action === 'asset-generate' || action === 'asset-refine') throw new Error('Chat is coming soon. You can still edit your design and export it.');
  const response = await fetch(`/api/assets?action=${encodeURIComponent(action)}`, { signal, method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: data === undefined ? undefined : { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
  const result = await response.json().catch(() => { throw new Error('Studio is temporarily unavailable. You can still explore and edit the templates.'); });
  if (!response.ok) {
    if (response.status === 401) updateStudioConfig(cachedConfig ? { ...cachedConfig, user: null } : undefined);
    throw new Error(result.error || 'Something went wrong. Please try again.');
  }
  if (action === 'config') updateStudioConfig(result);
  if (action === 'navigation') updateStudioConfig(result.config);
  if (action === 'verify' && cachedConfig) updateStudioConfig({ ...cachedConfig, user: result.user });
  if (action === 'sign-out') updateStudioConfig(cachedConfig ? { ...cachedConfig, user: null } : undefined);
  return result as T;
}
