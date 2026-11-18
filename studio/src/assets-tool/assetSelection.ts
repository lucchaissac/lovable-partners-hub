export type AssetSelection={ids:string[];anchor:string;focus:string};
export const singleAssetSelection=(id:string):AssetSelection=>({ids:[id],anchor:id,focus:id});

/** Ranges follow collection order, independently of the page currently being edited. */
export function selectAsset(order:string[],selection:AssetSelection,id:string,{range=false,additive=false}:{range?:boolean;additive?:boolean}={}):AssetSelection{
 if(!order.includes(id))return selection;
 const anchor=range&&order.includes(selection.anchor)?selection.anchor:id;
 let ids:string[];
 if(range){
  const start=order.indexOf(anchor),end=order.indexOf(id),interval=order.slice(Math.min(start,end),Math.max(start,end)+1);
  ids=additive?[...selection.ids,...interval]:interval;
 }else ids=additive?(selection.ids.includes(id)?selection.ids.filter(item=>item!==id):[...selection.ids,id]):[id];
 const selected=new Set(ids);
 return {ids:order.filter(item=>selected.has(item)),anchor,focus:id};
}
