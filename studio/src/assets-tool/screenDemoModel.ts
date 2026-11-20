import type {HtmlBlock} from '../studio/htmlEditorModel';
import {assetSchema,makeNode,type AssetDocument,type AssetReference} from './model';
import {nativeDocument} from './nativeDocument';
import type {NativeMotion} from './nativeMotion';

const screenId='screen-demo-image',backgroundId='screen-demo-gradient';
type ImageBlock=Extract<HtmlBlock,{kind:'image'}>;
const blocks=(asset?:AssetDocument)=>asset?.editor?.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat()))??[];
export const isScreenDemo=(asset?:AssetDocument)=>blocks(asset).some(block=>block.id===backgroundId||block.id.startsWith('screen-ui-'));
const image=(id:string,src:string,alt:string,x:number,y:number,widthPx:number,height:number):ImageBlock=>({id,kind:'image',value:{src,alt,caption:'',alignment:'center',width:100},editor:{position:'absolute',x,y,widthPx,height,appearance:{imageFit:'contain',radius:0}}});

function screenFrame(reference:AssetReference,width:number,height:number){
 const scale=Math.min(width*.86/reference.width,height*.73/reference.height);
 const widthPx=reference.width*scale,h=reference.height*scale;
 return {x:(width-widthPx)/2,y:(height*.83-h)/2,widthPx,height:h};
}

/** Native motion data: wide → close-up → wide, with identical loop endpoints. */
export function screenCameraMotion():NativeMotion{
 const step=(to:number,duration:number)=>({to,duration,transition:{type:'easing' as const,duration,ease:[.4,0,.2,1] as [number,number,number,number]}});
 return {version:1,duration:10,clips:[{id:'screenCamera',label:'Screen camera',blockIds:[screenId],at:0,props:{
  scale:{from:1,steps:[step(1,1.2),step(1.22,2.6),step(1.22,1.8),step(1,3),step(1,1.4)]},
  y:{from:0,steps:[step(0,1.2),step(-18,2.6),step(-18,1.8),step(0,3),step(0,1.4)]},
 } }]};
}

export function buildScreenDemo(reference:AssetReference):AssetDocument{
 const base:AssetDocument={version:1,id:crypto.randomUUID(),title:'Screen demo',format:'landscape',dimensions:{width:1200,height:800},background:'#1b1b1b',grid:false,reference,updatedAt:Date.now(),nodes:[makeNode('image',{name:'Imported screen',x:80,y:48,w:1040,h:584})]};
 const editor=nativeDocument(base),frame=screenFrame(reference,1200,800);
 const screen=image(screenId,reference.src,reference.name,frame.x,frame.y,frame.widthPx,frame.height);
 screen.editor!.appearance={imageFit:'contain',radius:16,shadow:'strong'};
 editor.pages[0].sections[0].columns=[[
  image(backgroundId,'/ambassadors/assets/heart-overlay.webp','Lovable gradient',-600,-420,2400,2400),
  screen,
  {...image('screen-demo-logo','/brand/assets/full-white-pure.svg','Lovable',500,714,200,36.42),brandRole:'identity'},
 ]];
 return assetSchema.parse({...base,editor,motion:screenCameraMotion()});
}
