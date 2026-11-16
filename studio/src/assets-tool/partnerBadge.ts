import type { HtmlBlock } from '../studio/htmlEditorModel';
import { badgeFormatName, type PartnerBadgeSettings } from './partnerBadgeSettings';
import { cleanLogoPixels } from './logoPixels';

export async function renderPartnerBadge(settings: PartnerBadgeSettings) {
  const { prepareTypography } = await import('../../../src/badges.js');
  await prepareTypography();
  const { makeExportSvg } = await import('../../../src/export.js');
  const expert=settings.format.startsWith('expert');
  const role=settings.role.map((line,index)=>line.trim()||['Solution','Partner'][index]);
  const detail=settings.detail.map((line,index)=>line.trim()||(index?'2026':expert?'Expert':'Select'));
  const svg=await makeExportSvg(settings.format,{roleLines:expert?detail:role,tierLines:detail,year:detail[1],tier:detail[0],partnerName:settings.partnerName,partnerImage:settings.partnerImage});
  const image=new Image();image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;await image.decode();
  const canvas=document.createElement('canvas'),scale=Math.min(3,2400/Math.max(image.naturalWidth,image.naturalHeight));
  canvas.width=Math.ceil(image.naturalWidth*scale);canvas.height=Math.ceil(image.naturalHeight*scale);
  canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);
  const src=canvas.toDataURL('image/png'),ready=new Image();ready.src=src;await ready.decode();
  return {src,width:image.naturalWidth,height:image.naturalHeight};
}

export async function createPartnerBadge(settings:PartnerBadgeSettings):Promise<Extract<HtmlBlock,{kind:'image'}>> {
  const image=await renderPartnerBadge(settings),scale=Math.min(480/image.width,320/image.height);
  return {id:crypto.randomUUID(),kind:'image',badge:settings,value:{src:image.src,alt:badgeFormatName(settings.format),caption:'',alignment:'center',width:100},editor:{widthPx:image.width*scale,height:image.height*scale,appearance:{imageFit:'contain'}}};
}

export async function importPartnerLogo(file:File) {
  if(!['image/svg+xml','image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Choose an SVG, PNG or JPG logo.');
  if(file.size>5_000_000)throw new Error('Choose a logo smaller than 5 MB.');
  const url=URL.createObjectURL(file);
  try {
    const image=new Image();image.src=url;await image.decode();
    if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>60_000_000)throw new Error('This logo is too large.');
    const canvas=document.createElement('canvas'),scale=Math.min(1,1200/Math.max(image.naturalWidth,image.naturalHeight));
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const context=canvas.getContext('2d')!;context.drawImage(image,0,0,canvas.width,canvas.height);
    const data=context.getImageData(0,0,canvas.width,canvas.height),cleaned=cleanLogoPixels(data.data,canvas.width,canvas.height);
    data.data.set(cleaned.pixels);context.putImageData(data,0,0);
    const cropped=document.createElement('canvas'),crop=cleaned.crop;cropped.width=crop.width;cropped.height=crop.height;
    cropped.getContext('2d')!.drawImage(canvas,crop.x,crop.y,crop.width,crop.height,0,0,crop.width,crop.height);
    const src=cropped.toDataURL('image/png');if(src.length>2_400_000)throw new Error('Choose a simpler or smaller logo.');
    return {src,removed:cleaned.removed};
  } finally {URL.revokeObjectURL(url);}
}
