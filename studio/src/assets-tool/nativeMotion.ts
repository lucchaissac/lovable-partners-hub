import {computeClipState,computeStaticTimeline,parseTimelineConfig,type TimelineConfig} from 'dialkit/timeline';
import type {AssetDocument} from './model';
import {nativeDocument} from './nativeDocument';

export type NativeMotion=NonNullable<AssetDocument['motion']>;
export const motionBlocks=(asset:AssetDocument)=>nativeDocument(asset).pages.flatMap(p=>p.sections.flatMap(s=>s.columns.flat()));
export function defaultNativeMotion(asset:AssetDocument):NativeMotion {
 return {version:1,duration:3,clips:motionBlocks(asset).filter(b=>!b.editor?.locked&&!b.editor?.hidden).slice(0,80).map((b,i)=>({
  id:`layer${i}`,label:b.kind==='text'?b.value.runs.map(r=>r.text).join('').slice(0,60)||'Text':b.kind==='image'?b.value.alt||'Image':b.kind==='shape'?b.icon||'Shape':'Layer',blockIds:[b.id],at:0,
  props:{x:{from:0,to:0,duration:1},y:{from:0,to:0,duration:1},scale:{from:1,to:1,duration:1},opacity:{from:b.editor?.opacity??1,to:b.editor?.opacity??1,duration:1}},
 }))};
}
export function nativeMotionConfig(motion:NativeMotion):TimelineConfig {
 return Object.fromEntries([['duration',motion.duration],...motion.clips.map(clip=>[clip.id,{at:clip.at,props:clip.props}])]) as TimelineConfig;
}
export function compileNativeMotion(motion:NativeMotion){
 const parsed=parseTimelineConfig(nativeMotionConfig(motion));
 return computeStaticTimeline(parsed,motion.values??{});
}
export function nativeMotionDuration(motion:NativeMotion){return Math.min(120,compileNativeMotion(motion).duration)*1000;}
export function sampleNativeMotion(motion:NativeMotion,timeMs:number,compiled=compileNativeMotion(motion),geometry:ReturnType<typeof motionBlocks>=[]){
 const result=new Map<string,{x:number;y:number;scale:number;rotation:number;opacity?:number;characters?:number;cursor?:boolean}>();
 for(const clip of compiled.clips){
  const source=motion.clips.find(item=>item.id===clip.key);if(!source)continue;
  const current=computeClipState(clip,timeMs/1000).current as Record<string,unknown>;
  const members=source.group?geometry.filter(block=>source.blockIds.includes(block.id)&&block.editor?.position==='absolute'):[];
  const cx=members.length?(Math.min(...members.map(b=>b.editor!.x??0))+Math.max(...members.map(b=>(b.editor!.x??0)+(b.editor!.widthPx??0))))/2:0;
  const cy=members.length?(Math.min(...members.map(b=>b.editor!.y??0))+Math.max(...members.map(b=>(b.editor!.y??0)+(b.editor!.height??0))))/2:0;
  for(const id of source.blockIds){
   const value=result.get(id)??{x:0,y:0,scale:1,rotation:0};
   for(const key of ['x','y','rotation'] as const)if(typeof current[key]==='number')value[key]+=current[key];
   const member=members.find(block=>block.id===id);
   if(member){
    const dx=(member.editor!.x??0)+(member.editor!.widthPx??0)/2-cx,dy=(member.editor!.y??0)+(member.editor!.height??0)/2-cy;
    const scale=typeof current.scale==='number'?Math.max(.001,current.scale):1,angle=(typeof current.rotation==='number'?current.rotation:0)*Math.PI/180;
    value.x+=scale*(dx*Math.cos(angle)-dy*Math.sin(angle))-dx;value.y+=scale*(dx*Math.sin(angle)+dy*Math.cos(angle))-dy;
   }
   if(typeof current.scale==='number')value.scale*=Math.max(.001,current.scale);
   if(typeof current.opacity==='number')value.opacity=(value.opacity??1)*Math.max(0,Math.min(1,current.opacity));
   if(typeof current.characters==='number'){value.characters=Math.max(0,Math.min(100,current.characters));value.cursor=source.cursor;}
   result.set(id,value);
  }
 }
 return result;
}
