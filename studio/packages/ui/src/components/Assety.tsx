import {Icon} from './Icon';
export type AssetyVariant='classic'|'rosie'|'idea'|'question'|'glasses'|'book'|'painter';
export type AssetyProps={variant?:AssetyVariant;doubleTapVariant?:AssetyVariant;size?:number;interactive?:boolean;followCursor?:boolean;className?:string};
export function Assety({size=48,className}:AssetyProps){return <span className={className} aria-hidden="true"><Icon name="sparkles" size={size}/></span>;}
