// These are presentation studies requested by Luc, not new numeric brand rules.
// Keep the supplied vectors intact; the guides illustrate protected empty space.
const logo = (symbol=false,color=false) => color
 ? '<img src="/brand/assets/logomark-color.svg" alt="Lovable gradient heart"/>'
 : `<img class="lovable-ink-dark" src="/brand/assets/${symbol?'logomark-black':'full-black'}.svg" alt="Lovable${symbol?' symbol':''}"/><img class="lovable-ink-light" src="/brand/assets/${symbol?'logomark-white':'full-white-pure'}.svg" alt="Lovable${symbol?' symbol':''}"/>`;

export function clearSpaceDiagrams(){
 return `<div class="lovable-study-grid">${[true,false].map(symbol=>`<figure><div class="lovable-study lovable-space-study ${symbol?'is-symbol':''}"><div class="lovable-protected-area"><span class="lovable-protected-art">${logo(symbol)}</span><span class="lovable-guide-top" aria-hidden="true"></span><span class="lovable-guide-left" aria-hidden="true"></span></div><span class="lovable-space-label">Keep this area clear</span></div><figcaption>${symbol?'Symbol':'Complete logo'}</figcaption></figure>`).join('')}</div>`;
}

export function collaborationDiagrams(){
 return `<div class="lovable-study-grid"><figure><div class="lovable-study lovable-collab-study"><div class="lovable-collab-row"><span class="lovable-collab-logo">${logo()}</span><span class="lovable-collab-divider" aria-hidden="true"></span><span class="lovable-partner-placeholder">Partner</span></div></div><figcaption>Side by side</figcaption></figure><figure><div class="lovable-study lovable-collab-study"><div class="lovable-collab-stack"><span class="lovable-collab-logo">${logo()}</span><span class="lovable-collab-divider" aria-hidden="true"></span><span class="lovable-partner-placeholder">Partner</span></div></div><figcaption>Stacked</figcaption></figure></div>`;
}

export function gradientHeartStudies(){
 return `<div class="lovable-study-grid"><figure><div class="lovable-study lovable-heart-master">${logo(true,true)}</div><figcaption>The original gradient heart</figcaption></figure><figure><div class="lovable-study lovable-heart-post"><span class="lovable-post-signature">${logo()}</span><p>Build<br/>something<br/>lovable.</p><img class="lovable-post-heart" src="/brand/assets/logomark-color.svg" alt="Large original Lovable gradient heart"/></div><figcaption>Scale the artwork. Keep the shape.</figcaption></figure></div>`;
}
