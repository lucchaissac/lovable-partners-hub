import {buildScreenDemo} from './screenDemoModel';
import {readReference} from './media';
import {materializeScreenComponent} from './screenComponent';
import {screenImportPlanSchema} from '../../../shared/screenImport.mjs';
import exampleUrl from '../../../examples/screen-demo/lovable-hub.jpg?url';
import prepared from '../../../examples/screen-demo/prepared.plan.json';

/** Local-only prepared example; every new upload is reconstructed dynamically. */
export async function screenDemoAsset(){
 const response=await fetch(exampleUrl);if(!response.ok)throw Error('The example screen could not be opened.');
 const reference=await readReference(new File([await response.blob()],'Lovable hub.jpg',{type:'image/jpeg'}));
 return materializeScreenComponent(buildScreenDemo(reference),reference,screenImportPlanSchema.parse(prepared));
}
