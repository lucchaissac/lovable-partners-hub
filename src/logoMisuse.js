import {createElement,X} from 'lucide';
import './logo-misuse.css';

// Two compact examples, always using the workspace's own identity artwork.
export function logoMisuse(artwork){
 const cross=createElement(X,{width:14,height:14,'stroke-width':1.8,'aria-hidden':'true'}).outerHTML;
 return `<section id="incorrect-usage" class="guide-section logo-misuse"><div class="section-heading"><h2>Incorrect usage</h2></div><div class="logo-misuse-grid">${[
  ['stretch','Don’t stretch the logo.'],
  ['shadow','Don’t add shadows.'],
 ].map(([type,label])=>`<figure><div class="logo-misuse-card"><div class="logo-misuse-art is-${type}" aria-hidden="true"><div class="logo-misuse-ink">${artwork}</div></div></div><figcaption>${cross}<span>${label}</span></figcaption></figure>`).join('')}</div></section>`;
}
