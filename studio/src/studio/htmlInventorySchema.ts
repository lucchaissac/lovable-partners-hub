import { z } from 'zod';
import { editorChecklistSchema } from './workspaceTaskSchema.js';
const text = z.string().max(16000);
const id = z.string().min(1).max(100);
const date = z.object({ date:z.string().optional(),days:z.number().optional(),unit:z.enum(['business days','calendar days']).optional(),direction:z.enum(['After','Before']).optional(),anchor:z.enum(['Start date','Due date']).optional() }).strict();
const adjustment = z.object({amount:z.number(),type:z.enum(['percent','fixed'])}).strict();
const frequency = z.enum(['Annual','Monthly','One-time']);
const quoteLine = z.object({id,name:text,quantity:z.number(),unitPrice:z.number(),discount:adjustment,frequency}).strict();
const quoteSection = z.object({id,title:text,lines:z.array(quoteLine).max(100),discount:adjustment,showSubtotal:z.boolean()}).strict();
const quoteOption = z.object({id,name:text,billingFrequency:frequency.optional(),sections:z.array(quoteSection).max(50),discount:adjustment,tax:z.number(),showTotals:z.boolean()}).strict();
const cellStyle=z.object({background:text,color:text,size:z.number(),weight:z.number(),italic:z.boolean(),underline:z.boolean(),spacing:z.number(),line:z.number(),uppercase:z.boolean(),align:z.enum(['left','center','right']),vertical:z.enum(['top','middle','bottom'])}).partial().strict();
const formRule=z.object({id,operator:z.enum(['is','not','contains','excludes','known','unknown']),value:text,action:z.enum(['show','hide','jump']),target:text}).strict();
export const htmlInventorySchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('Project plan'),value:z.object({title:text,start:date.optional(),end:date.optional(),showTimeline:z.boolean(),plans:z.array(z.object({id,source:text.optional(),title:text,tasks:editorChecklistSchema.shape.tasks,view:z.enum(['list','card']),expandOnPublic:z.boolean(),design:editorChecklistSchema.shape.design})).max(50)})}),
 z.object({type:z.literal('Timeline'),value:z.object({start:date.optional(),end:date.optional(),stages:z.array(z.object({id,name:text,start:date.optional(),end:date.optional(),progress:z.number(),description:text})).max(100)})}),
 z.object({type:z.literal('Sales quote'),value:z.object({title:text,currency:text,options:z.array(quoteOption).min(1).max(20),selected:id,status:z.enum(['draft','published']),terms:z.object({length:text,start:text,end:text,billingStart:text,billingTerms:text,paymentTerm:text,paymentMethods:text,marketing:z.array(text),additional:text})})}),
 z.object({type:z.literal('Library list'),value:z.object({source:z.enum(['selected','filtered']),selected:z.array(id),groups:z.array(z.array(z.object({id,field:z.enum(['type','tags','internal','views','shares']),operator:z.enum(['includes','excludes','gt','lt','eq']),values:z.array(text)}))),view:z.enum(['grid','table','carousel']),pageSize:z.number().min(1).max(100)})}),
 z.object({type:z.literal('Table'),value:z.object({columns:z.array(id).min(1).max(50),rows:z.array(z.object({id,cells:z.array(z.object({id,text,style:cellStyle})).min(1).max(50)})).min(1).max(500)}).refine(v=>v.rows.every(r=>r.cells.length===v.columns.length))}),
 z.object({type:z.literal('Forms'),value:z.object({title:text,description:text,intro:z.boolean(),ending:text,answerAgain:z.boolean(),questions:z.array(z.object({id,type:z.enum(['checkboxes','dropdown','file','choice','paragraph','text','url']),label:text,description:text,required:z.boolean(),visible:z.boolean(),options:z.array(text),rules:z.array(formRule)})).max(100)})}),
]);
export type HtmlInventory=z.infer<typeof htmlInventorySchema>;
