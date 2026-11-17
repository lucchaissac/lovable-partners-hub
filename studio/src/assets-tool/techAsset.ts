import {assetSchema,makeNode,type AssetDocument} from './model';
import {nativeDocument} from './nativeDocument';
import {rasterLibraryAsset,type LibraryAsset} from './badgeLibrary';
import type {HtmlBlock} from '../studio/htmlEditorModel';
type ImageBlock=Extract<HtmlBlock,{kind:'image'}>;
export const techElements:LibraryAsset[]=[
 {id:'tech-curves',name:'Construction curves',src:'/tech-blog/cover-curves.svg',transparent:true},
 {id:'tech-grid',name:'Cover grid',src:'/tech-blog/cover-grid.svg',transparent:true},
 {id:'tech-logo',name:'Lovable logo',src:'/brand/assets/full-white-pure.svg',transparent:true},
 {id:'tech-color',name:'Color field',src:'/tech-blog/color-field.svg',transparent:true},
];
const image=(id:string,src:string,x:number,y:number,width:number,height:number):ImageBlock=>({id,kind:'image',value:{src,alt:id,caption:'',alignment:'center',width:100},editor:{position:'absolute',x,y,widthPx:width,height,appearance:{imageFit:'contain',radius:0}}});
const text=(id:string,value:string,x:number,y:number,width:number,height:number,size:number,weight=700):HtmlBlock=>({id,kind:'text',value:{runs:[{text:value}],style:'Text',size,align:'left',color:'#f7f4ed'},editor:{position:'absolute',x,y,widthPx:width,height,appearance:{fontFamily:'Camera Plain',fontSize:size,fontWeight:weight,lineHeight:100,letterSpacing:-size*.03}}});
export async function techStarterAsset():Promise<AssetDocument>{
 const reference=await rasterLibraryAsset(techElements[0]);
 const doc:AssetDocument={version:1,id:crypto.randomUUID(),title:'Inside Chats · Tech blog',format:'landscape',dimensions:{width:674,height:337},reference,background:'#151515',grid:false,updatedAt:Date.now(),nodes:[makeNode('image',{name:'Construction curves',x:0,y:0,w:674,h:337})]};
 const editor=nativeDocument(doc);
 const rectangle=(id:string,x:number,y:number,width:number,height:number,opacity=1):HtmlBlock=>({id,kind:'shape',shape:'rectangle',editor:{position:'absolute',x,y,widthPx:width,height,opacity,appearance:{fill:'#ffffff',radius:height>2?2.119:0}}});
 editor.pages[0].sections[0].columns=[[
 image('tech-grid','/tech-blog/cover-grid.svg',0,0,674,337),
 image('tech-curves','/tech-blog/cover-curves.svg',0,0,674,337),
 ...[27.73,393.34,645.57].map((x,i)=>rectangle('guide-v-'+i,x,0,1,337,.159)),
 ...[28.43,309.27].map((y,i)=>rectangle('guide-h-'+i,0,y,674,1,.159)),
 ...[23.87,389.31,642.06].flatMap((x,i)=>[23.52,304.7].map((y,j)=>rectangle(`handle-${i}-${j}`,x,y,8.425,8.425))),
 image('tech-identity','/brand/assets/full-white-pure.svg',55.82,55.92,59.179,10.755),
 text('tech-signature','Tech blog',118.11,54.4,62,16,13.541,600),
 image('tech-color','/tech-blog/color-field.svg',180.87,57.57,34.051,8.776),
 text('tech-headline','Inside Chats:\nHow Lovable’s\nAgents Work\nTogether',55.82,152.786,260,137,33.541),
 ]];
 return assetSchema.parse({...doc,editor});
}
export async function createTechElement(id:string):Promise<ImageBlock>{const item=techElements.find(item=>item.id===id);if(!item)throw Error('Artwork unavailable.');const img=new Image();img.src=item.src;await img.decode();const width=Math.min(674,img.naturalWidth);return image(crypto.randomUUID(),item.src,0,0,width,width*img.naturalHeight/img.naturalWidth);}
