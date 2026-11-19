import {partnershipTemplate as t} from '../../shared/brandTemplates.mjs';

export function partnershipSpecimen(){
 const image=asset=>`<image href="${asset.src}" x="${asset.x}" y="${asset.y}" width="${asset.width}" height="${asset.height}"/>`;
 const d=t.divider;
 return `<svg viewBox="0 0 ${t.width} ${t.height}" role="img" aria-label="Partnership — Lovable and Cerebras"><rect width="${t.width}" height="${t.height}" fill="${t.background}"/>${image(t.glow)}${image(t.logo)}<rect x="${d.x}" y="${d.y}" width="${d.width}" height="${d.height}" fill="${d.color}"/>${image(t.partner)}</svg>`;
}
