import {z} from 'zod';

const number=z.number().finite().min(-100000).max(100000);
const transition=z.union([
 z.object({type:z.literal('easing'),duration:z.number().min(.001).max(120),ease:z.tuple([number,number,number,number])}).strict(),
 z.object({type:z.literal('spring'),visualDuration:z.number().min(.001).max(120).optional(),bounce:z.number().min(0).max(1).optional(),stiffness:z.number().positive().optional(),damping:z.number().positive().optional(),mass:z.number().positive().optional()}).strict(),
]);
const prop=z.enum(['x','y','scale','opacity','rotation','characters']);
const track=z.object({from:number,to:number.optional(),duration:z.number().min(.001).max(120).optional(),delay:z.number().min(0).max(120).optional(),transition:transition.optional(),steps:z.array(z.object({to:number,duration:z.number().min(.001).max(120),transition:transition.optional()}).strict()).min(1).max(32).optional()}).strict();
export const nativeMotionSchema=z.object({
 version:z.literal(1),duration:z.number().min(.01).max(120),
 clips:z.array(z.object({id:z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/),label:z.string().min(1).max(80),blockIds:z.array(z.string().min(1).max(100)).min(1).max(80),at:z.number().min(0).max(120),props:z.partialRecord(prop,track),cursor:z.boolean().optional()}).strict()).max(80),
 values:z.record(z.string().max(300),z.union([number,z.string().max(80),z.boolean(),transition])).optional(),
}).strict();
