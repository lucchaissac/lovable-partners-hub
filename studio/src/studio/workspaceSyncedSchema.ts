import { z } from 'zod';
export const syncedContentSchema=z.object({title:z.string().min(1).max(200),body:z.string().max(16000)}).strict();
export const workspaceSyncedSourceSchema=syncedContentSchema.extend({kind:z.literal('synced-source'),version:z.number().int().min(1)}).strict();
export const workspaceSyncedSectionSchema=syncedContentSchema.extend({kind:z.literal('synced-section'),sourceId:z.string().regex(/^[a-zA-Z0-9-]{1,80}$/),linked:z.boolean(),hidden:z.boolean().optional(),inserted:z.boolean().optional(),width:z.number().min(10).max(100).optional()}).strict();
export type SyncedContent=z.infer<typeof syncedContentSchema>;
export type SyncedSectionValue=z.infer<typeof workspaceSyncedSectionSchema>;
export const RAMP_SOURCE_ID='synced-source-ramp-resources';
export const RAMP_SYNCED_CONTENT:SyncedContent={title:'Ramp resource hub',body:'A shared guide to help every team launch with confidence.\n\nReview your spending policy\nCheck eligible expenses, approval owners, and receipt requirements before your first purchase.\n\nPrepare for day one\nAccept your invitation, confirm your profile details, and review your assigned spending limits.\n\nKnow where to get help\nUse this workspace for rollout questions. Contact your rollout owner when a policy exception needs review. Keep your receipt checklist handy during your first week.'};
