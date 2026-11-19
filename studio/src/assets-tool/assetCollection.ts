import {z} from 'zod';
import {assetSchema, type AssetDocument} from './model';
import {linkAssetPages, MAX_ASSET_PAGES} from './assetSeries';

export const assetCollectionSchema=z.object({
  version:z.literal(1),type:z.literal('lovable-asset-collection'),
  title:z.string().min(1).max(100),activeId:z.uuid(),
  assets:z.array(assetSchema).min(1).max(MAX_ASSET_PAGES),
}).strict().superRefine((collection,ctx)=>{
  const ids=new Set(collection.assets.map(asset=>asset.id));
  if(ids.size!==collection.assets.length)ctx.addIssue({code:'custom',message:'Each asset needs a unique ID.'});
  if(!ids.has(collection.activeId))ctx.addIssue({code:'custom',message:'The active asset is missing from this collection.'});
});

export function editableAssetCollection(pages:AssetDocument[],activeId:string){
  return assetCollectionSchema.parse({version:1,type:'lovable-asset-collection',title:pages[0]?.title,activeId,assets:linkAssetPages(pages)});
}
