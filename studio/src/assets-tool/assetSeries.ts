import type {AssetDocument} from './model';

export const MAX_ASSET_PAGES=64;
export function linkAssetPages(pages:AssetDocument[]):AssetDocument[]{
 const series=pages.map(page=>({id:page.id,title:page.title}));
 return pages.map(page=>({...page,series}));
}
export function moveAssetPage(pages:AssetDocument[],id:string,targetId:string,side:'before'|'after'):AssetDocument[]{
 return moveAssetPages(pages,[id],targetId,side);
}
/** Move the selected pages as one ordered block, preserving their editable documents. */
export function moveAssetPages(pages:AssetDocument[],ids:string[],targetId:string,side:'before'|'after'):AssetDocument[]{
 const picked=new Set(ids);
 if(!picked.size||ids.some(id=>!pages.some(page=>page.id===id))||!pages.some(page=>page.id===targetId))throw Error('The selected asset is no longer in this canvas.');
 if(picked.has(targetId))return pages;
 const moving=pages.filter(page=>picked.has(page.id)),rest=pages.filter(page=>!picked.has(page.id)),at=rest.findIndex(page=>page.id===targetId)+(side==='after'?1:0);
 const next=[...rest.slice(0,at),...moving,...rest.slice(at)];
 return next.every((page,i)=>page===pages[i])?pages:linkAssetPages(next);
}
export function removeAssetPages(pages:AssetDocument[],ids:string[]){
 const picked=new Set(ids),remaining=pages.filter(page=>!picked.has(page.id));
 if(!remaining.length||remaining.length===pages.length)return {pages,detached:[] as AssetDocument[]};
 return {pages:linkAssetPages(remaining),detached:pages.filter(page=>picked.has(page.id)).map(page=>({...page,series:undefined}))};
}
export function duplicateAssetPages(pages:AssetDocument[],ids:string[],freshId:()=>string=()=>crypto.randomUUID(),now=Date.now()){
 const picked=new Set(ids),selected=pages.filter(page=>picked.has(page.id));
 if(!selected.length||selected.length!==picked.size)throw Error('The selected asset is no longer in this canvas.');
 const copies=selected.map(page=>({...structuredClone(page),id:freshId(),title:`${page.title.slice(0,93)} · Copy`,updatedAt:now}));
 return {pages:insertAssetPages(pages,selected.at(-1)!.id,copies),ids:copies.map(page=>page.id)};
}
/** Resolve saved siblings in their authored order; the open document is always freshest. */
export function assetPages(current:AssetDocument,saved:AssetDocument[]):AssetDocument[]{
 const documents=new Map(saved.map(asset=>[asset.id,asset]));documents.set(current.id,current);
 const ids=[...new Set((current.series??[{id:current.id}]).map(page=>page.id))];
 if(!ids.includes(current.id))ids.push(current.id);
 return ids.flatMap(id=>documents.has(id)?[documents.get(id)!]:[]);
}
export function insertAssetPages(pages:AssetDocument[],afterId:string,added:AssetDocument[]):AssetDocument[]{
 const existing=new Set(pages.map(page=>page.id));
 if(added.some(page=>existing.has(page.id))||new Set(added.map(page=>page.id)).size!==added.length)throw Error('Each asset needs its own document.');
 if(pages.length+added.length>MAX_ASSET_PAGES)throw Error(`A canvas can contain up to ${MAX_ASSET_PAGES} assets.`);
 const at=pages.findIndex(page=>page.id===afterId);
 if(at<0)throw Error('The selected asset is no longer in this canvas.');
 const next=[...pages.slice(0,at+1),...added,...pages.slice(at+1)];
 return linkAssetPages(next);
}
/** Replace in place, preserving the active URL and every unrelated sibling. */
export function replaceAssetPage(pages:AssetDocument[],id:string,proposals:AssetDocument[]):AssetDocument[]{
 const at=pages.findIndex(page=>page.id===id);
 if(at<0||!proposals.length)throw Error('Choose an existing asset and at least one replacement.');
 const replacement={...proposals[0],id};
 const next=[...pages.slice(0,at),replacement,...pages.slice(at+1)];
 return insertAssetPages(next,id,proposals.slice(1));
}

/** Restore membership, and optionally the original first pose, without reverting siblings' edits. */
export function restoreAssetArrangement(collection:AssetDocument[],saved:AssetDocument[],ids:string[],original?:AssetDocument|AssetDocument[]){
 const documents=new Map([...saved,...collection].map(page=>[page.id,page]));
 for(const previous of original?(Array.isArray(original)?original:[original]):[]){
  const latest=documents.get(previous.id);
  documents.set(previous.id,{...previous,messages:latest?.messages,workspaceChats:latest?.workspaceChats,workspaceActiveChatId:latest?.workspaceActiveChatId,updatedAt:Date.now()});
 }
 const pages=linkAssetPages(ids.flatMap(id=>documents.has(id)?[documents.get(id)!]:[]));
 return {pages,detached:collection.filter(page=>!pages.some(item=>item.id===page.id)).map(page=>({...page,series:undefined}))};
}

/** Recover the connected native sequence, including assets made before sequence chat existed. */
export function currentAnimationSequence(pages:AssetDocument[],activeId:string){
 const at=pages.findIndex(page=>page.id===activeId);if(at<0)return [];
 const identity=(page:AssetDocument)=>JSON.stringify([page.dimensions??page.format,page.editor?.pages.flatMap(p=>p.sections.flatMap(s=>s.columns.flat().map(b=>`${b.id}:${b.kind}`))).sort()]);
 const connects=(index:number)=>index>=0&&index<pages.length-1&&pages[index].animation?.enabled&&identity(pages[index])===identity(pages[index+1]);
 let start=at,end=at;while(connects(start-1))start--;while(connects(end))end++;
 return end>start?pages.slice(start,end+1):[];
}

/** Animate toward the existing next page, creating an editable endpoint only at the end. */
export function animateAssetPages(pages:AssetDocument[],id:string,defaults:NonNullable<AssetDocument['animation']>,freshId:()=>string=()=>crypto.randomUUID(),now=Date.now()){
 const at=pages.findIndex(page=>page.id===id);
 if(at<0)throw Error('The selected asset is no longer in this canvas.');
 const created=at===pages.length-1;
 if(created&&pages.length>=MAX_ASSET_PAGES)throw Error(`A canvas can contain up to ${MAX_ASSET_PAGES} assets.`);
 const source={...pages[at],updatedAt:now,animation:{...defaults,...pages[at].animation,enabled:true,transition:'smart-animate' as const}};
 const updated=pages.map(page=>page.id===id?source:page);
 if(!created)return {pages:updated,activeId:id,created};
 const copy={...structuredClone(source),id:freshId(),title:`${source.title.slice(0,93)} · Copy`};
 return {pages:insertAssetPages(updated,id,[copy]),activeId:copy.id,created};
}
