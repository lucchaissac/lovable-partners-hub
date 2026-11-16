import type {AssetDocument} from './model';
import type {HtmlBlock} from '../studio/htmlEditorModel';
import type {AmbassadorSettings} from './ambassadorSettings';

export type CommunityBlock = Extract<HtmlBlock,{kind:'image'}> & {ambassador:AmbassadorSettings};
export const communityBlocks = (asset?:AssetDocument):CommunityBlock[] =>
  (asset?.editor?.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat()))??[])
    .filter((block):block is CommunityBlock=>block.kind==='image'&&!!block.ambassador);
export const communityTemplate = (asset?:AssetDocument) => communityBlocks(asset).find(block=>!block.ambassadorElement);
export const needsCommunityRender = (block:CommunityBlock) => !!block.ambassadorRender && block.ambassadorRender.revision!==block.ambassadorRender.rendered;

// Persist text immediately. Rendering is a separate, replaceable job, never owned by the inspector.
export function editCommunityBlock(block:CommunityBlock,settings:AmbassadorSettings):CommunityBlock {
  return {...block,ambassador:settings,ambassadorRender:{revision:crypto.randomUUID(),rendered:block.ambassadorRender?.rendered??''}};
}
export function applyCommunityRender(asset:AssetDocument,documentId:string,blockId:string,revision:string,src:string):AssetDocument {
  const block=communityBlocks(asset).find(block=>block.id===blockId);
  // A late result must not overwrite a newer edit, undo, deletion, or another document.
  if(asset.id!==documentId||!block||block.ambassadorRender?.revision!==revision)return asset;
  return {...asset,editor:{...asset.editor!,pages:asset.editor!.pages.map(page=>({...page,sections:page.sections.map(section=>({...section,columns:section.columns.map(column=>column.map(item=>item.id!==blockId?item:{...block,value:{...block.value,src},ambassadorRender:{revision,rendered:revision}}))}))}))}};
}
