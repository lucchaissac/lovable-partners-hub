// Annotated composition studies, not unverified numeric brand standards.
const artwork = (family,x,y,w,h) => `<image class="lovable-ink-light" href="/brand/assets/${family==='full'?'full-white-pure':family==='symbol'?'logomark-white':`cerebras-${family==='symbol-mark'?'symbol':family}-white`}.svg" x="${x}" y="${y}" width="${w}" height="${h}"/><image class="lovable-ink-dark" href="/brand/assets/${family==='full'?'full-black':family==='symbol'?'logomark-black':`cerebras-${family==='symbol-mark'?'symbol':family}-black`}.svg" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const box = (x,y,w,h) => `<rect class="guide" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const hMeasure = (x1,x2,y,label='x') => `<path class="measure" d="M${x1} ${y-5}v10m0 -5H${x2}m0 -5v10"/><text x="${(x1+x2)/2}" y="${y-13}">${label}</text>`;
const vMeasure = (x,y1,y2,label='x') => `<path class="measure" d="M${x-5} ${y1}h10m-5 0V${y2}m-5 0h10"/><text x="${x-20}" y="${(y1+y2)/2+8}">${label}</text>`;
const figure = (label,body) => `<figure><div class="lovable-study"><svg class="lovable-diagram" viewBox="0 0 600 600" role="img" aria-label="${label}">${body}</svg></div><figcaption>${label}</figcaption></figure>`;

export function clearSpaceDiagrams(){
 const symbol=box(160,160,280,280)+box(230,230,140,140)+artwork('symbol',230,230,140,140)+hMeasure(160,230,300)+hMeasure(370,440,300)+vMeasure(300,160,230)+vMeasure(300,370,440);
 const full=box(40,220,520,160)+box(80,260,440,80)+artwork('full',80,260,440,80)+hMeasure(40,80,300)+hMeasure(520,560,300)+vMeasure(300,220,260)+vMeasure(300,340,380);
 return `<div class="lovable-study-grid">${figure('Symbol · equal space on every side',symbol)}${figure('Complete logo · measure from the artwork',full)}</div>`;
}

export function collaborationDiagrams(){
 const full=artwork('full',50,280,220,40)+artwork('logo',330,258,220,97.78)+`<path class="divider" d="M300 280v40"/>`+box(50,280,220,40)+box(330,280,220,40)+hMeasure(270,300,373)+hMeasure(300,330,373)+`<path class="guide" d="M50 280H550M50 320H550M270 260V383M330 260V383"/>`;
 const symbol=artwork('symbol',154,252,94,96)+artwork('symbol-mark',352,252,78,96)+`<path class="divider" d="M300 252v96"/>`+box(154,252,94,96)+box(352,252,78,96)+hMeasure(248,300,395)+hMeasure(300,352,395);
 const stacked=artwork('full',157,172,286,52)+artwork('logo',157,308,286,127.1)+`<path class="divider" d="M157 280H443"/>`+box(157,172,286,52)+box(157,336,286,52)+vMeasure(485,224,280)+vMeasure(485,280,336)+`<path class="guide" d="M157 152V460M443 152V460"/>`;
 const symbolStack=artwork('symbol',260,168,80,82)+artwork('symbol-mark',266,334,67,82)+`<path class="divider" d="M260 292H340"/>`+box(260,168,80,82)+box(266,334,67,82)+vMeasure(395,250,292)+vMeasure(395,292,334);
 return `<div class="lovable-study-grid">${figure('Complete logos · horizontal',full)}${figure('Symbols · horizontal',symbol)}${figure('Complete logos · stacked',stacked)}${figure('Symbols · stacked',symbolStack)}</div>`;
}
