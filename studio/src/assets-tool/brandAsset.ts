import {assetSchema, makeNode, type AssetDocument} from './model';
import {nativeDocument} from './nativeDocument';
import {rasterLibraryAsset, type LibraryAsset} from './badgeLibrary';
import type {HtmlBlock} from '../studio/htmlEditorModel';
import {appStudioTemplate} from '../../../shared/brandTemplates.mjs';

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
export async function brandStarterAsset(template='collaboration'):Promise<AssetDocument>{
 if(template==='app-studio')return appStudioAsset();
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

async function appStudioAsset():Promise<AssetDocument>{
 const t=appStudioTemplate;
 const reference=await rasterLibraryAsset({id:t.id,name:t.name,src:t.wordmark.src,transparent:true});
 const doc:AssetDocument={version:1,id:crypto.randomUUID(),title:t.name,format:'landscape',dimensions:{width:t.width,height:t.height},reference,background:'ink',grid:false,updatedAt:Date.now(),nodes:[makeNode('image',{name:t.name,x:508,y:445,w:904,h:245})]};
 const editor=nativeDocument(doc),heart=image('app-studio-gradient',t.heart.src,'Original Lovable gradient',0,0,t.width,t.height);
 // Keep the original vector and its exact crop without an oversized canvas layer.
 heart.value.crop={x:-t.heart.x,y:-t.heart.y,width:t.width,height:t.height,sourceWidth:t.heart.width,sourceHeight:t.heart.height};
 const grid=(id:string,x:number,y:number,width:number,height:number):HtmlBlock=>({id,kind:'shape',shape:'rectangle',editor:{position:'absolute',x,y,widthPx:width,height,opacity:t.grid.opacity,appearance:{fill:'#ffffff',radius:0,blendMode:'plus-lighter'}}});
 editor.pages[0].sections[0].columns=[[
  heart,
  ...t.grid.horizontal.map((y,i)=>grid(`app-studio-grid-h-${i}`,-34,y,1975,1)),
  ...t.grid.vertical.map((x,i)=>grid(`app-studio-grid-v-${i}`,x,-776,1,1975)),
  image('app-studio-logo',t.logo.src,'Lovable logo',t.logo.x,t.logo.y,t.logo.width,t.logo.height,'identity'),
  image('app-studio-wordmark',t.wordmark.src,'App Studio',t.wordmark.x,t.wordmark.y,t.wordmark.width,t.wordmark.height,'identity'),
  {id:'app-studio-details',kind:'text',value:{runs:[{text:t.details.text}],style:'Text',size:t.details.size,align:'center',color:t.details.color},editor:{position:'absolute',x:t.details.x,y:t.details.y,widthPx:t.details.width,height:t.details.height,appearance:{fontFamily:'Camera Plain',fontWeight:700,fontSize:t.details.size,lineHeight:t.details.height/t.details.size*100,letterSpacing:t.details.letterSpacing}}},
 ]];
 return assetSchema.parse({...doc,editor});
}

export const isAppStudioAsset=(asset:AssetDocument)=>asset.editor?.pages.some(page=>page.sections.some(section=>section.columns.some(column=>column.some(block=>block.id==='app-studio-wordmark'))))??false;

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
