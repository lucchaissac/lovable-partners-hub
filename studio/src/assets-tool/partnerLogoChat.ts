import {importPartnerLogo} from './partnerBadge';

export async function prepareChatPartnerLogo(request:{kind:string;url?:string;source?:{image:string;name:string}},signal:AbortSignal){
 let src=request.source?.image,name=request.source?.name??'Partner logo';
 if(request.kind==='website'){
  const response=await fetch('/api/partner-logo',{method:'POST',headers:{'Content-Type':'application/json','X-Lovable-Logo':'1'},body:JSON.stringify({url:request.url}),signal});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.image)throw Error(result.error||'Could not retrieve this logo. Attach its SVG or PNG and retry.');
  src=result.image;name=`${result.name} logo`;
 }
 if(!src)throw Error('Attach a logo or include the partner’s website address.');
 const response=await fetch(src,{signal}),blob=await response.blob();
 const logo=await importPartnerLogo(new File([blob],name,{type:blob.type}),{vectorResolution:1200});
 const image=new Image();image.src=logo.src;await image.decode();signal.throwIfAborted();
 return {...logo,name,width:image.naturalWidth,height:image.naturalHeight};
}
