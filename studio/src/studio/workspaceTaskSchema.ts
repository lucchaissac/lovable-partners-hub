import { z } from 'zod';
import type { EditorTask } from './workspaceTaskTypes.js';

const id = z.string().min(1).max(100);
const date = z.object({ date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), days:z.number().int().min(0).max(365).optional(), unit:z.enum(['business days','calendar days']).optional(), direction:z.enum(['After','Before']).optional(), anchor:z.enum(['Start date','Due date']).optional() }).strict();
export const editorTaskSchema: z.ZodType<EditorTask> = z.lazy(()=>z.object({
  id, name:z.string().max(500), status:z.enum(['To-do','In-progress']), complete:z.boolean(), internal:z.boolean(),
  start:date.optional(), due:date.optional(), assignees:z.array(z.string().max(200)).max(30), description:z.string().max(10000),
  subtasks:z.array(editorTaskSchema).max(100), comments:z.array(z.object({id,text:z.string().max(10000),files:z.array(z.string().max(255)).max(10)}).strict()).max(100),
  action:z.object({name:z.string().max(200),url:z.url().max(1000).refine(url=>url.startsWith('https://')),type:z.enum(['Link','Video','Calendar'])}).strict().optional(),
}).strict());
const designColor=z.string().max(180).regex(/^(#[a-f0-9]{3,8}|transparent|(?:rgb|hsl|lab|lch|oklab|oklch)a?\([0-9.,% /-]+\)|var\(--(?:ui|ramp)-[a-z0-9-]+(?:,\s*#[a-f0-9]{3,8})?\))$/i);
const taskDesign=z.object({background:designColor,accent:designColor,color:designColor,size:z.number().min(8).max(32),weight:z.number().min(100).max(900)}).strict();
export const editorChecklistSchema = z.object({ title:z.string().max(200),tasks:z.array(editorTaskSchema).max(100),view:z.enum(['list','card']),expandOnPublic:z.boolean(),design:taskDesign.optional() }).strict().superRefine((value,context)=>{
  const ids = new Set<string>();
  function check(tasks:EditorTask[],depth:number) {
    if(depth>8){context.addIssue({code:'custom',message:'Use at most eight levels of subtasks.'});return;}
    for(const task of tasks){if(ids.has(task.id))context.addIssue({code:'custom',message:'Task IDs must be unique.'});ids.add(task.id);check(task.subtasks,depth+1);}
  }
  check(value.tasks,0);
  if(ids.size>300)context.addIssue({code:'custom',message:'Use at most 300 tasks per widget.'});
});
export const workspaceTaskEditSchema = z.object({kind:z.literal('tasks'),original:editorChecklistSchema,value:editorChecklistSchema,hidden:z.boolean().optional(),width:z.number().min(10).max(100).optional()}).strict();
