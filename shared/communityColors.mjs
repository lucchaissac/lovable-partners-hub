import {z} from 'zod';

// Neutrals from the Community kit; accents from its original heart.svg stops.
export const communityBrandColors=['#1b1b1b','#f7f4ed','#ffffff','#4b73ff','#4e93ff','#ffa6f9','#ff0178','#ff6d1b'];
export const canvasBackgroundPresets=['ink','blue-soft','mint','yellow-soft','pink-soft','white','beige'];
export const isCustomCanvasColor=value=>value==='transparent'||/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(value);
export const canvasBackgroundSchema=z.union([z.enum(canvasBackgroundPresets),z.string().refine(isCustomCanvasColor,'Choose a hex color or an existing background preset.')]);
