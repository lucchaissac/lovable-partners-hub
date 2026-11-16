import {ambassadorFormats,ambassadorPreview} from './ambassadors/catalog.js';
const loaded=new Set();
export function warmGallery(workspace){
 const paths=workspace==='ambassadors'?[...ambassadorFormats.map(f=>ambassadorPreview(f.id)),'/ambassadors/community-montreal-800.webp']:['portrait.webp','hoodie-480.webp','eames-preview-640.webp','loco-logo.webp','motion-4.webp','area-640.webp','storefront-480.webp','motion-8.webp','blanket-480.webp','program.webp','team-640.webp','team-foreground-640.webp','building-480.webp','motion-3.webp','locomotive-640.webp'].map(name=>`/gallery/${name}`);
 for(const src of paths){if(loaded.has(src))continue;loaded.add(src);const image=new Image();image.decoding='async';image.src=src;image.decode().catch(()=>{});}
}
