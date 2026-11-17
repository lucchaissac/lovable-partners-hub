import {communityMediaById} from '../../../shared/communityMediaLibrary.mjs';

// Embed the prepared single-image asset so save/reopen and source files are portable.
export async function communityMediaSource(id:string):Promise<string>{
 const item=communityMediaById.get(id);if(!item)throw Error('This library image could not be found.');
 const response=await fetch(item.src);if(!response.ok)throw Error('Could not load the library image.');
 const blob=await response.blob();
 return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('Could not read the library image.'));reader.readAsDataURL(blob);});
}
