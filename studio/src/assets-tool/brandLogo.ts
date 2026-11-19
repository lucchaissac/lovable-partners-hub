import type {HtmlBlock,HtmlEditorState} from '../studio/htmlEditorModel';
import type {AssetDocument} from './model';
import {nativeBrandDivider} from './brandDivider';
import {logoInkBand} from './logoPixels';
type ImageBlock=Extract<HtmlBlock,{kind:'image'}>;
export type PreparedBrandLogo={src:string;name:string;width:number;height:number;ink:{top:number;height:number}};

/** Fit visible artwork inside the existing frame without moving its center. */
export function fittedBrandLogo(block:ImageBlock,src:string,name:string,width:number,height:number):ImageBlock{
 const frame=block.editor??{},w=frame.widthPx??306,h=frame.height??136;
 const scale=Math.min(w/width,h/height),nextW=width*scale,nextH=height*scale;
 return {...block,value:{...block.value,src,alt:name,crop:undefined,playIcon:undefined},editor:{...frame,x:(frame.x??0)+(w-nextW)/2,y:(frame.y??0)+(h-nextH)/2,widthPx:nextW,height:nextH,appearance:{imageFit:'contain',...frame.appearance}}};
}

export function partnerLogoTarget(asset:AssetDocument,context?:string,previousTargetId?:string):ImageBlock{
 const partners=asset.editor?.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat())).filter((block):block is ImageBlock=>block.kind==='image'&&block.brandRole==='partner')??[];
 let selected:string[]=[];
 if(context?.startsWith('HTML_SELECTION ')){
  try{const selection=JSON.parse(context.slice(15));selected=selection.blockIds??[];}catch{throw Error('Select the partner logo again.');}
 }
 const matches=selected.length?partners.filter(block=>selected.includes(block.id)):previousTargetId?partners.filter(block=>block.id===previousTargetId):partners;
 if(!matches.length)throw Error(selected.length?'Select the partner logo to replace it.':'This canvas has no partner logo. Open the Partnership template first.');
 if(matches.length>1)throw Error('Select the partner logo you want to replace.');
 if(matches[0].editor?.locked)throw Error('Unlock the partner logo before replacing it.');
 return matches[0];
}

const allBlocks=(editor:HtmlEditorState)=>editor.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat()));
const replaceBlocks=(editor:HtmlEditorState,replacements:HtmlBlock[]):HtmlEditorState=>({...editor,pages:editor.pages.map(page=>({...page,sections:page.sections.map(section=>({...section,columns:section.columns.map(column=>column.map(block=>replacements.find(item=>item.id===block.id)??block))}))}))});

/** Match visible lettering, baseline and divider gaps as in the co-branding study.
 * Recenter the three native layers as one signature; never squeeze a new wordmark
 * into the previous brand's aspect ratio. Unrelated artwork remains untouched. */
export function layoutPartnershipLogo(editor:HtmlEditorState,targetId:string,logo:PreparedBrandLogo,identityInk:{top:number;height:number},canvasWidth=1200):HtmlEditorState{
 const blocks=allBlocks(editor),target=blocks.find((block):block is ImageBlock=>block.id===targetId&&block.kind==='image'&&block.brandRole==='partner');
 if(!target||target.editor?.locked)throw Error('Select an unlocked partner logo.');
 const identity=blocks.find((block):block is ImageBlock=>block.id==='brand-identity'&&block.kind==='image');
 const sourceDivider=blocks.find(block=>block.id==='brand-divider'),divider=sourceDivider&&nativeBrandDivider(sourceDivider);
 if(!identity||!divider||divider.kind!=='shape'||divider.shape!=='line')return replaceBlocks(editor,[fittedBrandLogo(target,logo.src,logo.name,logo.width,logo.height)]);
 const left=identity.editor??{},right=target.editor??{},line=divider.editor??{};
 if((left.rotation??0)!==0||(right.rotation??0)!==0||Math.abs(line.rotation??0)!==90)throw Error('Return the signature to a horizontal layout before replacing its logo.');
 const lw=left.widthPx??358,lh=left.height??65.19,lx=left.x??190,ly=left.y??307;
 const stroke=line.appearance?.lineWidth??line.height??2,dividerCenter=(line.x??0)+(line.widthPx??0)/2;
 const gap=Math.max(0,dividerCenter-stroke/2-lx-lw),center=(lx+(right.x??686)+(right.widthPx??306))/2;
 const baseline=ly+lh*(identityInk.top+identityInk.height),height=lh*identityInk.height/logo.ink.height,width=height*logo.width/logo.height;
 const total=lw+2*gap+stroke+width,scale=Math.min(1,Math.max(1,canvasWidth-2*gap)/total),span=total*scale;
 const start=Math.max(0,Math.min(canvasWidth-span,center-span/2)),newLeftHeight=lh*scale,newHeight=height*scale;
 const newDividerCenter=start+lw*scale+gap*scale+stroke*scale/2;
 const identityNext={...identity,editor:{...left,x:start,y:baseline-newLeftHeight*(identityInk.top+identityInk.height),widthPx:lw*scale,height:newLeftHeight}};
 const dividerNext={...divider,editor:{...line,x:newDividerCenter-(line.widthPx??65.19)*scale/2,y:identityNext.editor.y+((line.y??0)+(line.height??2)/2-ly)*scale-stroke*scale/2,widthPx:(line.widthPx??65.19)*scale,height:stroke*scale,appearance:{...line.appearance,lineWidth:stroke*scale}}};
 const partnerNext:ImageBlock={...target,value:{...target.value,src:logo.src,alt:logo.name,crop:undefined,playIcon:undefined},editor:{...right,x:newDividerCenter+stroke*scale/2+gap*scale,y:baseline-newHeight*(logo.ink.top+logo.ink.height),widthPx:width*scale,height:newHeight,appearance:{...right.appearance,imageFit:'contain'}}};
 if(identity.editor?.locked||divider.editor?.locked)throw Error('Unlock the Lovable logo and divider to balance the complete signature.');
 return replaceBlocks(editor,[identityNext,dividerNext,partnerNext]);
}

/** Measure the original identity at its source resolution, without changing its artwork. */
export async function partnershipIdentityInk(editor:HtmlEditorState){
 const identity=allBlocks(editor).find(block=>block.id==='brand-identity');
 if(identity?.kind!=='image')return {top:0,height:1};
 const image=new Image();image.src=identity.value.src;await image.decode();
 const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
 const context=canvas.getContext('2d')!;context.drawImage(image,0,0);
 return logoInkBand(context.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
}
