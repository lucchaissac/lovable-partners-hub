import {assetSchema, makeNode, type AssetDocument} from './model';
import {nativeDocument} from './nativeDocument';
import {rasterLibraryAsset, type LibraryAsset} from './badgeLibrary';
import type {HtmlBlock} from '../studio/htmlEditorModel';

type ImageBlock=Extract<HtmlBlock,{kind:'image'}>;
export const brandElements:LibraryAsset[]=[
 {id:'brand-logo',name:'Lovable logo · white',src:'/brand/assets/full-white-pure.svg',transparent:true},
 {id:'brand-symbol',name:'Lovable symbol · white',src:'/brand/assets/logomark-white.svg',transparent:true},
 {id:'brand-logo-dark',name:'Lovable logo · dark',src:'/brand/assets/full-black.svg',transparent:true},
 {id:'brand-symbol-dark',name:'Lovable symbol · dark',src:'/brand/assets/logomark-black.svg',transparent:true},
 {id:'brand-glow',name:'Lovable gradient',src:'/ambassadors/assets/heart-overlay.webp',transparent:true},
 {id:'brand-partner',name:'Cerebras logo · white',src:'/brand/assets/cerebras-logo-white.svg',transparent:true},
];
const image=(id:string,src:string,alt:string,x:number,y:number,width:number,height:number,brandRole?:ImageBlock['brandRole']):ImageBlock=>({
 id,kind:'image',...(brandRole?{brandRole}:{}),value:{src,alt,caption:'',alignment:'center',width:100},
 editor:{position:'absolute',x,y,widthPx:width,height,appearance:{imageFit:'contain',radius:0}},
});

/** Authored at the reference's 1200 × 675 working size. Every component is editable. */
export async function brandStarterAsset():Promise<AssetDocument>{
 const reference=await rasterLibraryAsset(brandElements[0]);
 const doc:AssetDocument={version:1,id:crypto.randomUUID(),title:'Lovable × Cerebras',format:'landscape',dimensions:{width:1200,height:675},reference,background:'ink',grid:false,updatedAt:Date.now(),nodes:[makeNode('image',{name:'Lovable logo',x:190,y:307,w:358,h:65.19})]};
 const editor=nativeDocument(doc);
 editor.pages[0].sections[0].columns=[[ 
  image('brand-glow','/ambassadors/assets/heart-overlay.webp','Lovable gradient',-600,-280,2400,2400),
  image('brand-identity','/brand/assets/full-white-pure.svg','Lovable logo',190,307,358,65.19,'identity'),
  {id:'brand-divider',kind:'shape',shape:'rectangle',editor:{position:'absolute',x:616,y:307,widthPx:2,height:65.19,appearance:{fill:'#ffffff',radius:0}}},
  image('brand-partner','/brand/assets/cerebras-logo-white.svg','Cerebras logo',686,272,306,136,'partner'),
 ]];
 return assetSchema.parse({...doc,editor});
}

export async function createBrandElement(id:string):Promise<ImageBlock>{
 const item=brandElements.find(item=>item.id===id);if(!item)throw Error('This artwork could not be found.');
 const img=new Image();img.src=item.src;await img.decode();
 const width=id==='brand-glow'?800:400,height=width*img.naturalHeight/img.naturalWidth;
 return image(crypto.randomUUID(),item.src,item.name,0,0,width,height,id==='brand-partner'?'partner':id==='brand-glow'?undefined:'identity');
}

export function brandPartnerBlock(asset:AssetDocument){
 return asset.editor?.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat())).find((block):block is ImageBlock=>block.kind==='image'&&block.brandRole==='partner');
}
export function updateBrandPartner(asset:AssetDocument,partner:ImageBlock):AssetDocument{
 if(!asset.editor)return asset;
 return {...asset,editor:{...asset.editor,pages:asset.editor.pages.map(page=>({...page,sections:page.sections.map(section=>({...section,columns:section.columns.map(column=>column.map(block=>block.id===partner.id?partner:block))}))}))}};
}
