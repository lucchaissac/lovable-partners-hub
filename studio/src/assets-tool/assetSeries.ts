import type {AssetDocument} from './model';

export const MAX_ASSET_PAGES=64;
export function linkAssetPages(pages:AssetDocument[]):AssetDocument[]{
 const series=pages.map(page=>({id:page.id,title:page.title}));
 return pages.map(page=>({...page,series}));
}
export function moveAssetPage(pages:AssetDocument[],id:string,targetId:string,side:'before'|'after'):AssetDocument[]{
 const page=pages.find(item=>item.id===id);
 if(!page||!pages.some(item=>item.id===targetId))throw Error('The selected asset is no longer in this canvas.');
 if(id===targetId)return pages;
 const rest=pages.filter(item=>item.id!==id),at=rest.findIndex(item=>item.id===targetId)+(side==='after'?1:0);
 return linkAssetPages([...rest.slice(0,at),page,...rest.slice(at)]);
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
