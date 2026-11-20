import {z} from 'zod';

const color=z.string().regex(/^(?:#[0-9a-f]{6}(?:[0-9a-f]{2})?|transparent)$/i);
const number=z.number().finite();
export const webPageImportRequestSchema=z.object({url:z.string().min(1).max(2000)}).strict();
export const webPageLayerSchema=z.object({
 id:z.string().regex(/^dom-[a-z0-9-]+$/),kind:z.enum(['text','shape','image']),
 x:number.min(-2000).max(4000),y:number.min(-2000).max(4000),width:number.positive().max(10000),height:number.positive().max(10000),
 text:z.string().max(8000).optional(),align:z.enum(['left','center','right']).optional(),fontSize:number.min(1).max(1000).optional(),fontWeight:number.min(100).max(900).optional(),lineHeight:number.min(50).max(300).optional(),letterSpacing:number.min(-20).max(100).optional(),color:color.optional(),
 fill:color.optional(),radius:number.min(0).max(1500).optional(),borderWidth:number.min(0).max(24).optional(),borderColor:color.optional(),opacity:number.min(0).max(100).optional(),
 src:z.string().max(2400000).regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/).optional(),alt:z.string().max(500).optional(),
}).strict();
export const webPageSnapshotSchema=z.object({
 version:z.literal(1),sourceUrl:z.string().url().max(2000),title:z.string().max(200),width:z.literal(1440),height:z.literal(900),
 preview:z.string().max(2400000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/),
 layers:z.array(webPageLayerSchema).min(1).max(240),warnings:z.array(z.string().max(500)).max(12),
}).strict().superRefine((value,context)=>{
 const ids=new Set();
 for(const layer of value.layers){
  if(ids.has(layer.id))context.addIssue({code:'custom',message:'Duplicate imported element.'});ids.add(layer.id);
  if(layer.kind==='text'&&!layer.text?.trim())context.addIssue({code:'custom',message:'Text elements require their original text.'});
  if(layer.kind==='image'&&!layer.src)context.addIssue({code:'custom',message:'Image elements require embedded image bytes.'});
 }
});
