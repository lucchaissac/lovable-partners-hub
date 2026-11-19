import { z } from 'zod';

/** Local experiment: declarative settings only; never accept shader source in a document. */
export const shaderEffectSchema = z.object({
  preset: z.enum(['chrome', 'glass', 'ripple']),
  intensity: z.number().min(0).max(100).default(65),
  speed: z.number().min(0).max(200).default(50),
  animated: z.boolean().default(true),
}).strict();
export type ShaderEffect = z.infer<typeof shaderEffectSchema>;
export const shaderPresets = [{id:'none',label:'None'}, {id:'chrome',label:'Chrome'}, {id:'glass',label:'Glass'}, {id:'ripple',label:'Ripple'}];
export const newShaderEffect = (preset: ShaderEffect['preset']): ShaderEffect => ({ preset, intensity:65, speed:50, animated:true });
export const shaderMoves = (effect?: ShaderEffect) => !!effect?.animated && effect.speed > 0 && effect.intensity > 0;
