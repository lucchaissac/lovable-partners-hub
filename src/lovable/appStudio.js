import {appStudioTemplate as t} from '../../shared/brandTemplates.mjs';

export function appStudioSpecimen(){
 const image=asset=>`<image href="${asset.src}" x="${asset.x}" y="${asset.y}" width="${asset.width}" height="${asset.height}"/>`;
 return `<svg class="lovable-app-studio" viewBox="0 0 ${t.width} ${t.height}" role="img" aria-label="App Studio banner — Atlanta, December 2nd, 2026">
  ${image(t.heart)}
  <g fill="#fff" opacity="${t.grid.opacity}" style="mix-blend-mode:plus-lighter">${t.grid.horizontal.map(y=>`<rect x="-34" y="${y}" width="1975" height="1"/>`).join('')}${t.grid.vertical.map(x=>`<rect x="${x}" y="-776" width="1" height="1975"/>`).join('')}</g>
  ${image(t.logo)}${image(t.wordmark)}
  <foreignObject x="${t.details.x}" y="${t.details.y}" width="${t.details.width}" height="${t.details.height}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:'Camera Plain',sans-serif;font-weight:700;font-size:${t.details.size}px;line-height:${t.details.height}px;letter-spacing:${t.details.letterSpacing}px;text-align:center;white-space:nowrap;color:${t.details.color}">${t.details.text}</div></foreignObject>
 </svg>`;
}
