import priority from './generated/lucidePriority.json';
import {lucideCanonicalNames,lucideIconAliases} from './generated/lucideNames';
const terms=new Map<string,string[]>();
for(const [alias,name] of Object.entries(lucideIconAliases))terms.set(name,[...(terms.get(name)??[]),alias.replaceAll('-',' ')]);
const rank=new Map(priority.map((name,index)=>[name,index]));
const ordered=[...lucideCanonicalNames].sort((a,b)=>(rank.get(a)??Infinity)-(rank.get(b)??Infinity)||a.localeCompare(b));
export function searchLucideIcons(query:string) {
 const words=query.trim().toLowerCase().replaceAll('-',' ').split(/\s+/).filter(Boolean);
 return ordered.filter(name=>!words.length||words.every(word=>terms.get(name)?.some(term=>term.includes(word))));
}
export const lucideLabel=(name:string)=>name.replaceAll('-',' ').replace(/^./,letter=>letter.toUpperCase());
