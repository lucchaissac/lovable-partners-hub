import {z} from 'zod';
const photo=z.string().max(1_600_000).refine(value=>value===''||/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/]+=*$/.test(value));
export const ambassadorSchema=z.object({
 format:z.enum(['banner','poster','social','speakers','spotlight','badge']),
 city:z.string().max(45),url:z.string().max(300),headline:z.string().max(120),intro:z.string().max(100),cta:z.string().max(70),
 title:z.string().max(90),date:z.string().max(48),venue:z.string().max(65),eventFooter:z.string().max(90),
 name:z.string().max(48),role:z.string().max(55),photo,count:z.number().int().min(1).max(3),
 speakers:z.array(z.object({name:z.string().max(48),role:z.string().max(55),photo}).strict()).length(3),
}).strict();
export type AmbassadorSettings=z.infer<typeof ambassadorSchema>;
export const defaultAmbassador=(format:AmbassadorSettings['format']='social'):AmbassadorSettings=>({format,city:'Paris',url:'https://lovable.dev/community',headline:'Build\nsomething\nLovable.',intro:'Meet. Make.\nBuild together.',cta:'Scan to join the community',title:'Build something\nlovable.',date:'',venue:'',eventFooter:'Meet your local Lovable community.',name:'Alex Morgan',role:'Community ambassador',photo:'',count:2,speakers:[{name:'Alex Morgan',role:'Community ambassador',photo:''},{name:'Sam Rivera',role:'Builder & founder',photo:''},{name:'Jordan Lee',role:'Product designer',photo:''}]});
