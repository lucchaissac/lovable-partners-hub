export type TaskDate = {date?:string; days?:number; unit?:'business days'|'calendar days'; direction?:'After'|'Before'; anchor?:'Start date'|'Due date'};
export type EditorTask = {id:string; name:string; status:'To-do'|'In-progress'; complete:boolean; internal:boolean; start?:TaskDate; due?:TaskDate; assignees:string[]; description:string; subtasks:EditorTask[]; comments:{id:string;text:string;files:string[]}[]; action?:{name:string;url:string;type:string}};
export type EditorChecklistDesignValue = {background:string;accent:string;color:string;size:number;weight:number};
export type EditorChecklistValue = {title:string; tasks:EditorTask[]; view:'list'|'card'; expandOnPublic:boolean;design?:EditorChecklistDesignValue};
