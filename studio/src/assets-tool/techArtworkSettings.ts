import {z} from 'zod';
const common={stroke:z.number().min(.1).max(4),opacity:z.number().min(0).max(100),color:z.string().regex(/^#[0-9a-f]{6}$/i)};
export const techArtworkSchema=z.discriminatedUnion('kind',[
 z.object({...common,kind:z.literal('curves'),preset:z.enum(['convergence','rays','rings','flow']),count:z.number().int().min(3).max(64),spread:z.number().min(25).max(160),rotation:z.number().min(-180).max(180)}).strict(),
 z.object({...common,kind:z.literal('grid'),style:z.enum(['lines','dots']),spacing:z.number().min(10).max(84)}).strict(),
]);
export type TechArtworkSettings=z.infer<typeof techArtworkSchema>;
