import {createContext,useEffect,useRef,useState,type RefObject} from 'react';
import type {AssetDocument} from './model';
import {renderAmbassador} from './ambassadorAsset';
import {applyCommunityRender,communityBlocks,needsCommunityRender} from './communityDocument';

export const CommunityRenderErrors=createContext<Record<string,string>>({});
export function useCommunityRendering(asset:AssetDocument|undefined,current:RefObject<AssetDocument|undefined>,put:(asset:AssetDocument)=>void,enabled:boolean){
  const [errors,setErrors]=useState<Record<string,string>>({});
  const callbacks=useRef({current,put});callbacks.current={current,put};
  const jobs=useRef(new Map<string,{controller:AbortController;timer:ReturnType<typeof setTimeout>}>());
  const pending=enabled?communityBlocks(asset).filter(needsCommunityRender):[];
  const key=JSON.stringify([asset?.id,pending.map(block=>[block.id,block.ambassadorRender!.revision])]);
  useEffect(()=>{
    const desired=new Set(pending.map(block=>`${asset!.id}:${block.id}:${block.ambassadorRender!.revision}`));
    for(const [key,job] of jobs.current){if(!desired.has(key)){clearTimeout(job.timer);job.controller.abort();jobs.current.delete(key);}}
    setErrors(old=>Object.fromEntries(Object.entries(old).filter(([id])=>pending.some(block=>block.id===id))));
    for(const block of pending){
      const documentId=asset!.id,revision=block.ambassadorRender!.revision,jobKey=`${documentId}:${block.id}:${revision}`;
      if(jobs.current.has(jobKey))continue;
      const controller=new AbortController();
      setErrors(old=>{const next={...old};delete next[block.id];return next;});
      const timer=setTimeout(()=>{
        void renderAmbassador(block.ambassador,{pixels:1600,element:block.ambassadorElement,signal:controller.signal}).then(image=>{
          if(controller.signal.aborted)return;
          const latest=callbacks.current.current.current;if(!latest)return;
          const next=applyCommunityRender(latest,documentId,block.id,revision,image.src);
          if(next!==latest)callbacks.current.put(next);
        }).catch(reason=>{if(!controller.signal.aborted)setErrors(old=>({...old,[block.id]:reason instanceof Error?reason.message:'Could not update this artwork. Please retry.'}));});
      },350);
      jobs.current.set(jobKey,{controller,timer});
    }
  },[key]);
  useEffect(()=>()=>{for(const job of jobs.current.values()){clearTimeout(job.timer);job.controller.abort();}jobs.current.clear();},[]);
  return errors;
}
