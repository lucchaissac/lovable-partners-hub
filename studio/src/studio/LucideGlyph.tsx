import {createElement,type SVGProps} from 'react';
import vectors from './generated/lucide-icons.json';
import {lucideIconAliases} from './generated/lucideNames';

/** Official local Lucide vectors: synchronous rendering also keeps PNG exports complete. */
export function LucideGlyph({name,size=20,style,...props}:SVGProps<SVGSVGElement>&{name:string;size?:number}) {
 const nodes=(vectors as unknown as Record<string,[string,Record<string,string|number>][] >)[lucideIconAliases[name]??name];
 return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{flexShrink:0,...style}} {...props}>{nodes?.map(([tag,attributes],index)=>createElement(tag,{...attributes,key:index}))}</svg>;
}
