import type {HtmlBlock} from '../studio/htmlEditorModel';
import {assetSchema, makeNode, type AssetDocument, type AssetReference} from './model';
import {nativeDocument} from './nativeDocument';
import {rasterLibraryAsset} from './badgeLibrary';
import type {NativeMotion} from './nativeMotion';
import gradientUrl from '../../../examples/display-ads/gradient.png?url';
import logoUrl from '../../../examples/display-ads/logo.svg?url';
const ink = '#1b1b1b', cream = '#f7f4ed';
const frame = (x:number,y:number,widthPx:number,height:number,groupId?:string) => ({position:'absolute' as const,x,y,widthPx,height,...(groupId?{groupId}:{})});
const text = (id:string,copy:string,x:number,y:number,width:number,height:number,size:number,leading:number,weight=700,color=cream,groupId?:string):HtmlBlock => ({
  id,kind:'text',value:{runs:[{text:copy}],style:'Text',size,align:'left',color},
  editor:{...frame(x,y,width,height,groupId),appearance:{fontFamily:'Camera Plain',fontWeight:weight,fontSize:size,lineHeight:leading/size*100,letterSpacing:0}},
});
const shape = (id:string,x:number,y:number,width:number,height:number,fill:string,radius=0,groupId?:string):HtmlBlock => ({
  id,kind:'shape',shape:'rectangle',editor:{...frame(x,y,width,height,groupId),appearance:{fill,radius}},
});
const icon = (id:string,name:'plus'|'arrow-up',x:number,y:number,size:number,color:string):HtmlBlock => ({
  id,kind:'shape',shape:'rectangle',icon:name,editor:{...frame(x,y,size,size,'display-composer'),appearance:{fill:color}},
});
const image = (id:string,src:string,alt:string,x:number,y:number,width:number,height:number):Extract<HtmlBlock,{kind:'image'}> => ({
  id,kind:'image',value:{src,alt,caption:'',alignment:'center',width:100},editor:{...frame(x,y,width,height),appearance:{imageFit:'contain',radius:0}},
});

/** One requested direction and size, using only existing native editor blocks.
 * Imported only behind DEV; each opening creates an independent local collection.
 * The original gradient and logo remain separate image layers. No flattened UI.
 */
export async function displayAdsAssets():Promise<AssetDocument[]> {
  const reference = await rasterLibraryAsset({id:'display-gradient',name:'Display ad · Original gradient',src:gradientUrl});
  return buildDisplayAdsAssets(reference);
}

export function buildDisplayAdsAssets(reference:AssetReference):AssetDocument[] {
  const firstCopy='Create a booking app for my yoga studio',secondCopy='Create a habit tracker with daily reminders';
  const base:AssetDocument={
    version:1,id:crypto.randomUUID(),title:'Display ad · 300 × 250',format:'landscape',dimensions:{width:300,height:250},
    background:ink,grid:false,reference,updatedAt:Date.now(),
    nodes:[makeNode('text',{name:'Headline',text:'What would\nyou build?',x:24,y:25,w:252,h:80,fontSize:32,weight:'700',color:'white'})],
  };
  const editor=nativeDocument(base);
  const intro=text('display-intro','What would\nyou build?',24,25,252,64,32,28.8);
  intro.editor!.appearance!.letterSpacing=-1.28;
  const prompt=text('display-prompt-copy',firstCopy,40,118,228,28,11.5,14,600,'#ffffff','display-composer');
  const second=text('display-second-copy',secondCopy,40,118,228,28,11.5,14,600,'#ffffff','display-composer');
  second.editor!.opacity=0;
  const composer=[
    shape('display-prompt-surface',24,103,252,81,'#262624',24,'display-composer'),prompt,second,
    shape('display-add-surface',34,148,24,24,'#343432',12,'display-composer'),
    icon('display-add','plus',40,154,12,'#adadaa'),
    shape('display-send-surface',240,148,24,24,cream,12,'display-composer'),
    icon('display-send','arrow-up',245,153,14,ink),
  ];
  composer[0].editor!.appearance!.shadow='soft';
  const headline=text('display-final','Good times\nfor your ideas',24,24,252,90,44,39.6);
  headline.editor!.opacity=0;headline.editor!.appearance!.letterSpacing=-1.76;
  const cta=text('display-cta-label','Start free trial',196,212,80,12,9,11,600,ink,'display-cta');
  if(cta.kind==='text')cta.value.align='center';
  editor.pages[0].sections[0].columns=[[
    image('display-gradient',reference.src,'Original display ad gradient',0,0,300,324),
    intro,...composer,headline,
    {...image('display-logo',logoUrl,'Lovable',24,210,80,80*35/193),brandRole:'identity'},
    shape('display-cta-surface',196,205,80,25,cream,12.5,'display-cta'),cta,
  ]];
  const linear=(duration:number)=>({type:'easing' as const,duration,ease:[0,0,1,1] as [number,number,number,number]});
  const ease=(duration:number,curve:[number,number,number,number]=[.25,.46,.45,1])=>({...linear(duration),ease:curve});
  const step=(to:number,duration:number,curve=linear(duration))=>({to,duration,transition:curve});
  const motion:NativeMotion={version:1,duration:12,clips:[
    {id:'gradient',label:'Gradient',blockIds:['display-gradient'],at:0,props:{y:{from:75,steps:[step(0,1.5,ease(1.5,[.246,.815,.58,1])),step(0,6.12),step(-70.144,1.2,ease(1.2))]}}},
    {id:'firstPrompt',label:'First prompt',blockIds:[prompt.id],at:0,cursor:true,props:{
      characters:{from:100/firstCopy.length,steps:[step(100,2),step(100,2),step(800/firstCopy.length,1)]},
      opacity:{from:1,to:0,delay:5.05,duration:.05,transition:linear(.05)},
    }},
    {id:'secondPrompt',label:'Second prompt',blockIds:[second.id],at:5.05,cursor:true,props:{
      characters:{from:800/secondCopy.length,to:100,delay:.35,duration:2,transition:linear(2)},
      opacity:{from:0,to:1,duration:.05,transition:linear(.05)},
    }},
    {id:'send',label:'Send',blockIds:['display-send-surface','display-send'],at:7.4,props:{scale:{from:1,steps:[step(.86,.112,ease(.112)),step(1,.168,ease(.168))]}}},
    {id:'intro',label:'Intro',blockIds:[intro.id,...composer.map(b=>b.id)],at:7.5,props:{
      y:{from:0,to:-32,duration:.68,transition:ease(.68)},opacity:{from:1,to:0,delay:.63,duration:.05,transition:linear(.05)},
    }},
    {id:'finalTitle',label:'Final title',blockIds:[headline.id],at:8.13,props:{
      y:{from:16,to:0,delay:.05,duration:.77,transition:ease(.77)},opacity:{from:0,to:1,duration:.05,transition:linear(.05)},
    }},
  ]};
  return [assetSchema.parse({...base,editor,motion})];
}
