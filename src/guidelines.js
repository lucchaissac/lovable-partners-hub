import { FORMATS, badgeSvg, paddingDiagram } from './badges.js';

export function guidelines(tier,{icon,formatCard,sections}) {
 const badge=(id,options={})=>badgeSvg(id,{tier,...options});
 const heading=(title,copy='')=>`<div class="section-heading"><div><h2>${title}</h2>${copy?`<p>${copy}</p>`:''}</div></div>`;
 return `<aside class="guideline-sidebar"><nav aria-label="Guideline navigation">${sections.map(([id,name],i)=>`<a href="#guidelines/${id}" data-section="${id}" ${i===0?'aria-current="location"':''}>${name}</a>`).join('')}</nav></aside>
 <div class="guideline-content">
  <section id="overview" class="guide-section overview-section">
   <div class="page-intro"><h1>Partner badges</h1><p>Two families. One construction system.</p></div>
   <div class="family-pair"><figure class="family-card"><figcaption>Expert</figcaption><div>${badge('expert-compact')}</div><p>Expert status + year</p></figure><figure class="family-card"><figcaption>Solution Partner</figcaption><div>${badge('solution-compact')}</div><p>Partnership + tier + year</p></figure></div>
   <div class="intro-footer"><p>Both families use the same spacing, type and outlines.<br />Solution Partners add a Select, Premier or Elite tier.</p><button class="text-link" data-view="library">Open library ${icon('next')}</button></div>
  </section>
  <section id="construction" class="guide-section">
   ${heading('Construction','One unit, x. The same visible space on every side of the text.')}
   <div class="construction-board"><div class="padding-specimen">${paddingDiagram()}<span>x = the space around the visible letters</span></div><div class="relative-rules"><div><strong>x</strong><span>Top, right, bottom, left</span></div><div><strong>3x</strong><span>Two-line text height</span></div><div><strong>5x</strong><span>Module height</span></div></div></div>
   <div class="construction-strip"><div><span>Between modules</span><strong>0</strong></div><div><span>Corner radius</span><strong>1⅛x</strong></div><div><span>Outline</span><strong>⅛x</strong></div></div>
   <p class="quiet-note">The block width follows the text, with x on both sides. Logos stay proportional and centered, with at least x around them. Resize the complete badge together.</p>
   <div class="assembly-stage" aria-label="Repeating badge construction"><div class="assembly-badge">${badge('solution-compact')}</div><div class="motion-footer"><span>Identity, status, tier. One connected badge.</span><div class="assembly-controls"><button class="text-link" data-replay>Replay ${icon('replay')}</button><button class="text-link" data-pause aria-pressed="false">Pause ${icon('pause')}</button></div></div></div>
  </section>
  <section id="connections" class="guide-section">
   ${heading('Connections','Align the modules. Let their outlines meet as one line.')}
   <div class="connection-board"><div class="join-full">${badge('expert-compact')}</div><div class="join-detail"><svg viewBox="0 0 400 260" role="img" aria-label="Neighbouring modules overlap by one outline thickness to make a single shared contour"><g fill="none" stroke="white" stroke-width="4"><rect x="42" y="52" width="156" height="156" rx="34"/><rect x="198" y="52" width="156" height="156" rx="34"/></g><path d="M198 24V236" stroke="white" stroke-opacity=".22" stroke-width=".8"/><path d="M198 130H254" stroke="white" stroke-opacity=".5" stroke-width=".8"/><text x="264" y="135" font-family="Camera Plain" font-size="16" fill="white" fill-opacity=".6">⅛x</text></svg></div></div>
   <div class="minimal-caption"><span>No gap between blocks</span><span>Overlap by one outline thickness</span></div>
  </section>
  <section id="clear-space" class="guide-section">
   ${heading('Clear space','Leave at least x around the complete badge. Keep the same space on all four sides.')}
   <div class="diagram-stage clear-space-stage"><div class="clear-space-badge">${badge('expert-horizontal',{guides:true,clearSpace:true})}</div></div>
   <div class="minimal-caption"><span>Inside the modules: x</span><span>Outside the badge: at least x</span></div>
  </section>
  <section id="scale" class="guide-section">
   ${heading('Scale','The same badge, at the size people will actually see it.')}
   <div class="scale-board"><div class="scale-row"><div class="scale-badge size-large">${badge('expert-compact')}</div><span>Display</span></div><div class="scale-row"><div class="scale-badge size-medium">${badge('expert-compact')}</div><span>Standard</span></div><div class="scale-row"><div class="scale-badge size-small">${badge('expert-compact')}</div><span>Small</span></div></div>
   <div class="scale-notes"><p>Scale the whole composition. At small sizes, keep the outline at least one screen pixel wide.</p><p>The words and year must stay distinct at actual size. If they merge, enlarge the badge or use a compact format.</p></div>
  </section>
  <section id="motion" class="guide-section">
   ${heading('Motion','Direct movement. Clear rhythm. A precise finish.')}
   <div class="motion-guides">
    <article class="motion-rule"><svg viewBox="0 0 280 170" role="img" aria-label="An easing curve that rises quickly, then gradually settles"><g class="motion-grid"><path d="M24 20V140H260M24 80H260M142 20V140"/></g><path class="motion-curve" d="M24 140C76 20 109 20 260 20"/><circle cx="260" cy="20" r="3" fill="white"/><text x="24" y="163">Start</text><text x="260" y="163" text-anchor="end">Settle</text></svg><h3>Ease into place</h3><p>Start decisively, then slow into the final position. Keep the landing steady, with no bounce or overshoot.</p></article>
    <article class="motion-rule"><svg viewBox="0 0 280 170" role="img" aria-label="Small interactions take 160 milliseconds; entering elements take 320 milliseconds"><g class="motion-grid"><path d="M24 20V140H260M142 20V140"/></g><path class="motion-bar muted" d="M24 55H142"/><path class="motion-bar" d="M24 108H260"/><text x="24" y="38">160 ms · Interact</text><text x="24" y="91">320 ms · Enter</text><text x="24" y="163">Short</text><text x="260" y="163" text-anchor="end">Deliberate</text></svg><h3>Match the moment</h3><p>Keep small feedback quick. Give a new block more time to arrive so its movement is easy to follow.</p></article>
    <article class="motion-rule"><svg viewBox="0 0 280 170" role="img" aria-label="Three modules enter in sequence, with 120 milliseconds between their starts"><g class="motion-grid"><path d="M24 20V140H260M75 20V140M126 20V140"/></g><path class="motion-bar" d="M24 42H160M75 82H211M126 122H260"/><text x="24" y="163">+120 ms</text><text x="260" y="163" text-anchor="end">Together</text></svg><h3>Build a rhythm</h3><p>Lead with the identity, then the status and tier. Overlap the entrances slightly so the sequence feels continuous.</p></article>
   </div>
   <div class="intro-footer"><p>Move each block as a whole. Keep logos, letters and outlines intact.</p><a class="text-link" href="#guidelines/construction" data-section="construction">See the construction ${icon('next')}</a></div>
  </section>
  <section id="formats" class="guide-section">
   ${heading('Formats','Four layouts for each family. The construction stays the same.')}
   <div class="format-grid guide-format-grid">${FORMATS.map(f=>formatCard(f,true)).join('')}</div>
  </section>
  <section id="color" class="guide-section">
   ${heading('Color','White artwork. Transparent blocks.')}
   <div class="monochrome-stage"><div>${badge('solution-horizontal')}</div><div class="monochrome-key"><span><i></i> White symbol, type and outlines</span><span>No filled logo tile</span></div></div>
  </section>
  <section id="typography" class="guide-section">
   ${heading('Typography')}
   <div class="type-poster"><span class="specimen-label">Camera Plain · Bold</span><div>Camera Plain</div><div class="specimen-specs"><span>Weight <b>700</b></span><span>Case <b>Natural</b></span><span>Alignment <b>Left</b></span></div></div>
   <div class="type-pair"><div class="type-card"><span class="specimen-label">Badge text</span><div class="badge-type-demo">Solution<br />Partner</div><p>Two lines. 3x high. x around.</p></div><div class="type-card"><span class="specimen-label">Body text</span><div class="body-type-demo">Use clear, useful language. Keep sentences short and give each idea enough room to breathe.</div><p>Camera Plain · Semibold · 600 minimum</p></div></div>
  </section>
  <section id="usage" class="guide-section">
   ${heading('In use','Pick the shape that fits. Keep the badge intact.')}
   <div class="usage-examples"><figure><div>${badge('expert-horizontal')}</div><figcaption>Wide placements</figcaption></figure><figure><div>${badge('solution-stacked')}</div><figcaption>Stacked placements</figcaption></figure></div>
   <div class="usage-notes"><p>Scale as one. Keep blocks connected.</p><p>Use your current status, tier and year.</p><p>Give your logo its own block.</p></div>
   <div class="closing-line"><h2>Make it yours.</h2><button class="primary-button" data-view="create">Create a badge ${icon('next')}</button></div>
  </section>
 </div>`;
}
