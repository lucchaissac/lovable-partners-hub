import {z} from 'zod';
import {assetCollectionSchema} from './assetCollection';
import {linkAssetPages} from './assetSeries';
import {referenceSchema} from './model';

const manifestSchema=z.object({version:z.literal(1),collections:z.array(z.object({
  workspace:z.enum(['lovable','partners','ambassadors','tech-blog']),
  source:z.string().regex(/^\/collections\/[a-z0-9-]+\.json$/),
  assetIds:z.array(z.uuid()).min(1).max(64),
}).strict()).max(100)}).strict();

/** Large source references are shared across templates; deduplicate them on
 * the wire, then restore the exact editable-source shape before validation. */
export function parsePublishedCollection(value:unknown){
  const packed=z.object({references:z.record(z.string(),referenceSchema).optional(),assets:z.array(z.record(z.string(),z.unknown())).min(1).max(64)}).passthrough().parse(value);
  const {references,...collection}=packed;
  return assetCollectionSchema.parse({...collection,assets:packed.assets.map(asset=>({...asset,reference:typeof asset.reference==='string'?references?.[asset.reference]:asset.reference}))});
}

/** Published snapshots are immutable, with fresh document IDs. Local copies
 * always win: callers only use this when the requested draft is absent. */
export async function loadPublishedCollection(id:string,workspace:string,request:typeof fetch=fetch){
  if(!z.uuid().safeParse(id).success)return [];
  const index=await request('/collections/index.json');
  if(index.status===404)return [];
  if(!index.ok)throw Error('Could not open the shared collection. Please retry.');
  const manifest=manifestSchema.parse(await index.json());
  const entry=manifest.collections.find(item=>item.workspace===workspace&&item.assetIds.includes(id));
  if(!entry)return [];
  const response=await request(entry.source);
  if(!response.ok)throw Error('Could not load the shared assets. Please retry.');
  const collection=parsePublishedCollection(await response.json());
  if(JSON.stringify(collection.assets.map(asset=>asset.id))!==JSON.stringify(entry.assetIds))throw Error('This shared collection is incomplete.');
  return linkAssetPages(collection.assets);
}
