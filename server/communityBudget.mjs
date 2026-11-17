import {get,put} from '@vercel/blob';
import {randomUUID} from 'node:crypto';

// One private, pre-created ledger is shared by localhost and every Vercel instance.
// Amounts are integer microdollars. Never reset or recreate a missing ledger at runtime.
export const budgetLimit=18_000_000;
export const planReservation=500_000;
export const imageReservation=1_000_000;
export function budgetConfig(env){
 const expiry=Date.parse(env.COMMUNITY_OPENAI_EXPIRES_AT??'');
 if(!Number.isFinite(expiry)||Date.now()>=expiry)throw Error('This two-day demo has expired. Create a new limited key to continue.');
 if(!env.BLOB_READ_WRITE_TOKEN||!env.COMMUNITY_BUDGET_PATH)throw Error('The shared demo budget is not configured. Generation is disabled.');
 return {expiry,path:env.COMMUNITY_BUDGET_PATH,token:env.BLOB_READ_WRITE_TOKEN};
}
export function blobBudgetStore(env){
 const {path,token}=budgetConfig(env);
 return {
  async read(){
   const result=await get(path,{access:'private',token,useCache:false});
   if(!result?.stream||result.statusCode!==200)throw Error('The demo budget is unavailable. No API request was sent.');
   const state=JSON.parse(await new Response(result.stream).text());return {state,version:result.blob.etag};
  },
  async write(state,version){
   try{await put(path,JSON.stringify(state),{access:'private',token,allowOverwrite:true,addRandomSuffix:false,ifMatch:version,contentType:'application/json',cacheControlMaxAge:60});return true;}
   catch(error){if(error?.name==='BlobPreconditionFailedError')return false;throw error;}
  },
 };
}
export function createBudget(store,{now=Date.now}={}){
 async function change(update){
  for(let i=0;i<12;i++){
   const {state,version}=await store.read();
   if(state.version!==1||!Number.isSafeInteger(state.spent)||state.spent<0||!Number.isSafeInteger(state.limit)||state.limit>budgetLimit||!state.reservations||!Number.isFinite(state.expiresAt))throw Error('The demo budget is invalid. Generation is disabled.');
   const result=update(state);
   if(await store.write(state,version))return result;
  }
  throw Error('The demo is busy. Please retry in a moment.');
 }
 return {
  async reserve(amount){
   if(!Number.isSafeInteger(amount)||amount<=0)throw Error('Invalid budget reservation.');
   const id=randomUUID();
   return change(state=>{
    if(now()>=state.expiresAt)throw Error('This two-day demo has expired.');
    const held=Object.values(state.reservations).reduce((sum,value)=>sum+value,0);
    if(!Number.isSafeInteger(held)||held<0||state.spent+held+amount>state.limit)throw Error('The demo spending limit has been reached. No additional API request was sent.');
    state.reservations[id]=amount;return id;
   });
  },
  async settle(id,cost){
   if(!Number.isFinite(cost)||cost<0)return; // Unknown billing stays reserved, including cancellation/timeouts.
   await change(state=>{
    if(!(id in state.reservations))return;
    const held=state.reservations[id];delete state.reservations[id];state.spent+=Math.ceil(cost);
    if(cost>held)state.spent=state.limit; // Fail closed if provider pricing ever changes.
   });
  },
 };
}
