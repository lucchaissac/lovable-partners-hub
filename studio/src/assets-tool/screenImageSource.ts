/** Fetch only an image chosen by the user, in the browser and without credentials. */
export async function screenImageFromUrl(value:string,signal:AbortSignal):Promise<File>{
 let url:URL;try{url=new URL(value.trim());}catch{throw Error('Enter a complete image URL.');}
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Use an HTTP or HTTPS image URL without credentials.');
 const limit=12_000_000;
 let response:Response;
 try{response=await fetch(url.href,{signal,credentials:'omit',referrerPolicy:'no-referrer'});}
 catch(error){signal.throwIfAborted();throw Error('This image cannot be read from its URL. Download it and choose the image file instead.');}
 if(!response.ok)throw Error('This image URL could not be opened.');
 const type=(response.headers.get('content-type')??'').split(';')[0].trim();
 if(!['image/png','image/jpeg','image/webp'].includes(type)){await response.body?.cancel();throw Error('Use a direct PNG, JPG or WebP image URL.');}
 if(Number(response.headers.get('content-length'))>limit){await response.body?.cancel();throw Error('Choose an image smaller than 12 MB.');}
 const reader=response.body?.getReader();if(!reader)throw Error('The image response was empty.');
 const chunks:Uint8Array<ArrayBuffer>[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('Choose an image smaller than 12 MB.');chunks.push(value);}}
 catch(error){await reader.cancel();throw error;}
 finally{reader.releaseLock();}
 signal.throwIfAborted();
 let name='Imported screen';try{name=decodeURIComponent(url.pathname.split('/').pop()||name);}catch{}
 return new File(chunks,name.slice(0,200),{type});
}
