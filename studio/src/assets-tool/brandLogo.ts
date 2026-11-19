import type {HtmlBlock} from '../studio/htmlEditorModel';
import type {AssetDocument} from './model';
type ImageBlock=Extract<HtmlBlock,{kind:'image'}>;

/** Fit visible artwork inside the existing frame without moving its center. */
export function fittedBrandLogo(block:ImageBlock,src:string,name:string,width:number,height:number):ImageBlock{
 const frame=block.editor??{},w=frame.widthPx??306,h=frame.height??136;
 const scale=Math.min(w/width,h/height),nextW=width*scale,nextH=height*scale;
 return {...block,value:{...block.value,src,alt:name,crop:undefined,playIcon:undefined},editor:{...frame,x:(frame.x??0)+(w-nextW)/2,y:(frame.y??0)+(h-nextH)/2,widthPx:nextW,height:nextH,appearance:{imageFit:'contain',...frame.appearance}}};
}

export function partnerLogoTarget(asset:AssetDocument,context?:string):ImageBlock{
 const partners=asset.editor?.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat())).filter((block):block is ImageBlock=>block.kind==='image'&&block.brandRole==='partner')??[];
 let selected:string[]=[];
 if(context?.startsWith('HTML_SELECTION ')){
  try{const selection=JSON.parse(context.slice(15));selected=selection.blockIds??[];}catch{throw Error('Select the partner logo again.');}
 }
 const matches=selected.length?partners.filter(block=>selected.includes(block.id)):partners;
 if(!matches.length)throw Error(selected.length?'Select the partner logo to replace it.':'This canvas has no partner logo. Open the Partnership template first.');
 if(matches.length>1)throw Error('Select the partner logo you want to replace.');
 if(matches[0].editor?.locked)throw Error('Unlock the partner logo before replacing it.');
 return matches[0];
}
