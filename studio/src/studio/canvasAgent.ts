/** Local file bridge: no parent application or account required. */
export const canvasAgent={
 async readSource(file:File):Promise<{name:string;data:string}>{
  if(file.size>12_000_000)throw new Error('Choose a file smaller than 12 MB.');
  const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read this file.'));reader.readAsDataURL(file);});
  return {name:file.name,data};
 },
 pickSource(kind?:'image'):Promise<{name:string;data:string}|null>{
  return new Promise((resolve,reject)=>{const input=document.createElement('input');input.type='file';input.hidden=true;input.accept=kind==='image'?'image/png,image/jpeg,image/webp':'.pdf,.pptx,.txt,.md,image/*';
   const finish=()=>input.remove();input.addEventListener('cancel',()=>{finish();resolve(null);},{once:true});
   input.addEventListener('change',async()=>{try{resolve(input.files?.[0]?await canvasAgent.readSource(input.files[0]):null);}catch(error){reject(error);}finally{finish();}},{once:true});document.body.append(input);input.click();});
 }
};
