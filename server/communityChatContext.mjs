import {loadCommunityDesignReferences} from './communityDesignReferences.mjs';
import {communityDesignMetrics} from '../shared/communityDesignRules.mjs';

// Both planners receive the same masters, measurements, attachments and canvas.
export async function communityChatContext(request){
 const gallery=await loadCommunityDesignReferences();
 const images=gallery.references.map(reference=>({
  data:`data:image/webp;base64,${reference.preview.toString('base64')}`,
  role:'Approved gallery master',reference:reference.id,
 }));
 for(const item of [...(request.preview?[{id:'current-canvas',image:request.preview}]:[]),...request.sources.filter(s=>s.image),...(request.canvasImages??[])].slice(0,9)){
  images.push({data:item.image,role:item.id==='current-canvas'?'Current editable canvas, not a brand master':'User attachment',sourceId:item.id});
 }
 const imageOrder=images.map(({data,...metadata},i)=>({image:i+1,...metadata}));
 const payload={...request,preview:undefined,canvasImages:request.canvasImages?.map(({id})=>({id,attachedImage:true})),
  sources:request.sources.map(({image,...source})=>({...source,...(image?{attachedImage:true}:{})})),
  galleryContext:{...gallery,references:gallery.references.map(({preview,...reference})=>reference),imageOrder,
   currentCanvasMetrics:Object.fromEntries(gallery.references.map(reference=>[reference.id,communityDesignMetrics(reference.id,request.width,request.height)]))},
 };
 return {payload,images};
}
