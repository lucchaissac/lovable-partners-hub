import qrcode from '../ambassadors/source/qrcode.js';
import {makeOriginalQR} from '../ambassadors/source/original-qr.mjs';
import './qr-guide.css';

// The Community poster generator remains the single source of geometry.
const generate = makeOriginalQR(qrcode, {ink:'#1b1b1b', background:'#fff', quietZoneModules:4});
export function brandQrSvg(value) {
 const url = new URL(value.trim());
 if (!['https:','http:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error('Enter a complete https:// or http:// URL.');
 if (url.href.length > 500) throw new Error('Use a shorter URL, up to 500 characters.');
 return generate(url.href).replace('<svg ', '<svg width="512" height="512" ');
}

export function qrGuide(icon) {
 return `<div class="lovable-qr" data-qr-guide>
  <div class="lovable-qr-diagram">
   <div class="lovable-qr-specimen" data-qr-preview role="img" aria-label="Lovable QR code linking to https://lovable.dev/"></div>
   <div class="lovable-qr-annotations">
    <p><span>Concentric corners</span><span>Rounded outlines with proportional inner radii.</span></p>
    <p><span>Original Lovable heart</span><span>Keep the supplied silhouette and the space around it.</span></p>
    <p><span>Circular modules</span><span>Keep the dots, their size and their spacing intact.</span></p>
   </div>
  </div>
  <form class="lovable-qr-controls" novalidate>
   <label for="lovable-qr-url">Destination URL<input id="lovable-qr-url" type="url" value="https://lovable.dev" placeholder="https://lovable.dev" spellcheck="false" autocapitalize="off" autocomplete="off" maxlength="500" aria-describedby="lovable-qr-status"/></label>
   <a class="lovable-qr-download" data-qr-download download="lovable-qr-code.svg">Download .svg ${icon('download')}</a>
  </form>
  <p id="lovable-qr-status" class="lovable-qr-status" aria-live="polite">Keep the clear margin. Test the code at its final size before sharing.</p>
 </div>`;
}

export function mountQrGuide(root) {
 const stage=root.querySelector('[data-qr-guide]'); if(!stage)return()=>{};
 const input=stage.querySelector('input'), preview=stage.querySelector('[data-qr-preview]'), download=stage.querySelector('[data-qr-download]'), status=stage.querySelector('[aria-live]'), form=stage.querySelector('form');
 let objectUrl;
 const render=()=>{
  if(objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl=null;
  try {
   const svg=brandQrSvg(input.value);
   preview.innerHTML=svg;
   preview.setAttribute('aria-label',`Lovable QR code linking to ${new URL(input.value.trim()).href}`);
   objectUrl=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
   download.href=objectUrl;
   download.removeAttribute('aria-disabled');download.removeAttribute('tabindex');
   input.removeAttribute('aria-invalid');
   status.textContent='Keep the clear margin. Test the code at its final size before sharing.';
  } catch {
   preview.replaceChildren();preview.setAttribute('aria-label','Enter a valid URL to preview your QR code');
   download.removeAttribute('href');download.setAttribute('aria-disabled','true');download.setAttribute('tabindex','-1');
   input.setAttribute('aria-invalid','true');
   status.textContent='Enter a complete https:// or http:// URL, up to 500 characters.';
  }
 };
 const preventSubmit=event=>event.preventDefault();
 input.addEventListener('input',render);form.addEventListener('submit',preventSubmit);render();
 return()=>{input.removeEventListener('input',render);form.removeEventListener('submit',preventSubmit);if(objectUrl)URL.revokeObjectURL(objectUrl);};
}
