import {logoMisuse} from './logoMisuse.js';
import assets from './lovable/assets.json';
import './brand.css';
import {clearSpaceDiagrams,collaborationDiagrams} from './lovable/diagrams.js';
import {logoPlayground,mountLogoPlayground} from './lovable/logoPlayground.js';
import {qrGuide,mountQrGuide} from './lovable/qrGuide.js';
import {agentGuideSection} from './agentGuide.js';
import {appStudioSpecimen} from './lovable/appStudio.js';
import {partnershipSpecimen} from './lovable/partnership.js';

export const brandSections = [['overview','Overview'],['identity','Identity'],['clear-space','Clear space'],['collaborations','Co-branding'],['qr-code','QR code'],['gradients','Animated gradients'],['color','Color'],['typography','Typography'],['photography','Photography'],['incorrect-usage','Incorrect usage'],['for-your-agent','For your agent'],['downloads','Downloads']];
import {brandGalleryAssets} from './lovable/galleryMedia.js';
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const source = 'https://lovablebrand.lovable.app';
const heading = (title,copy) => `<div class="section-heading"><div><h2>${title}</h2><p>${copy}</p></div></div>`;
const image = (asset,eager=false) => `<img src="${asset.src}" srcset="${asset.thumbnail} ${Math.min(asset.width,640)}w, ${asset.src} ${Math.min(asset.width,1280)}w" sizes="(max-width:680px) calc(100vw - 48px), (max-width:1000px) 44vw, 36vw" width="${asset.width}" height="${asset.height}" alt="${escape(asset.name)}" loading="${eager?'eager':'lazy'}" decoding="async" ${eager?'fetchpriority="high"':''}/>`;
const external = (href,label,icon) => `<a class="text-link" href="${source}${href}" target="_blank" rel="noopener noreferrer">${label} ${icon('arrow')}</a>`;

export function brandGallery(){
 return `<section class="gallery lovable-gallery" aria-label="Lovable gallery"><div class="gallery-grid">${brandGalleryAssets.map((asset,i)=>`<figure class="gallery-item lovable-artwork" style="aspect-ratio:${asset.width}/${asset.height}" role="img" aria-label="${escape(asset.name)}"${asset.editHref?` data-gallery-edit="${escape(asset.editHref)}"`:''}>${asset.kind==='template'?(asset.id==='app-studio'?appStudioSpecimen():partnershipSpecimen()):asset.kind==='video'?`<img src="${asset.thumbnail}" width="${asset.width}" height="${asset.height}" alt="" loading="${i<3?'eager':'lazy'}" decoding="async"/><video class="gallery-media gallery-video" data-video-small="${asset.small}" data-video-large="${asset.src}" poster="${asset.thumbnail}" width="${asset.width}" height="${asset.height}" muted loop playsinline preload="none" disablepictureinpicture disableremoteplayback aria-hidden="true" tabindex="-1"></video>`:image(asset,i<3)}</figure>`).join('')}</div></section>`;
}

function logoCard(logo,icon){
 const label=`${logo.family} · ${logo.tone === 'color'?'Color':logo.tone[0].toUpperCase()+logo.tone.slice(1)}`;
 return `<article class="lovable-logo-card"><div class="lovable-logo-preview ${['white','creme'].includes(logo.tone)?'on-dark':'on-white'} ${logo.family === 'Logomark'?'is-symbol':''}"><img src="${logo.src}" alt="${label}" loading="lazy"/></div><div class="format-caption"><h3>${label}</h3><a class="subtle-button" href="${logo.src}" download="lovable-${logo.id}.svg" aria-label="Download ${label} vector" data-hub-tooltip="Download .svg">${icon('download')}</a></div></article>`;
}

export function brandGuidelines({icon}){
 return `<aside class="guideline-sidebar"><nav aria-label="Guideline navigation">${brandSections.map(([id,label],i)=>`<a href="#brand/guidelines/${id}" data-section="${id}" ${i===0?'aria-current="location"':''}>${label}</a>`).join('')}</nav></aside><div class="guideline-content lovable-guidelines">
 <section id="overview" class="guide-section overview-section"><div class="page-intro"><h1>Lovable</h1><p>The identity, the colors, the essentials.</p></div><div class="lovable-identity-hero"><img class="lovable-logo-light" src="/brand/assets/lockup-white.svg" alt="Lovable"/><img class="lovable-logo-dark" src="/brand/assets/lockup-black.svg" alt="Lovable"/></div><div class="intro-footer"><p>Original artwork and guidance from the Lovable brand hub.</p>${external('/','Visit brand hub',icon)}</div></section>
 <section id="identity" class="guide-section">${heading('Identity','Choose the supplied version for your background. Keep the artwork’s proportions and leave space around the logo.')}${logoPlayground()}<div class="lovable-logo-grid">${assets.logos.map(logo=>logoCard(logo,icon)).join('')}</div><div class="lovable-usage-notes"><p>Use a clear, contrasting background.</p><p>Keep the original colors and shapes.</p><p>Avoid stretching, shadows and added outlines.</p></div></section>
 <section id="clear-space" class="guide-section">${heading('Clear space','Keep text, images and edges away from the visible artwork. Leave a clear area around both the symbol and the complete logo.')}${clearSpaceDiagrams()}<p class="quiet-note">The x labels show equal spacing in these diagrams; they do not define an official minimum.</p></section>
 <section id="collaborations" class="guide-section">${heading('Co-branding','Use monochrome artwork, balance the visible size of both identities and keep equal space on either side of the divider.')}${collaborationDiagrams()}<div class="lovable-usage-notes"><p>Balance wordmark size optically.</p><p>Keep equal gaps around the divider.</p><p>Use symbols together when both brands are recognizable.</p></div></section>
 <section id="qr-code" class="guide-section">${heading('QR code','The QR code from our Community posters: circular dots, rounded corners and the original Lovable heart. Keep it monochrome and give it room to scan.')}${qrGuide(icon)}</section>
 <section id="gradients" class="guide-section">${heading('Animated gradients','Use the original motion artwork. Preserve its colors and let it fill the composition.')}<div class="lovable-motion-grid">${brandGalleryAssets.filter(asset=>asset.id.startsWith('gradient-')).map(asset=>`<div class="lovable-gradient-preview"><video class="gallery-video" data-video-small="${asset.small}" data-video-large="${asset.src}" poster="${asset.thumbnail}" muted loop playsinline preload="none" aria-label="Animated Lovable gradient"></video></div>`).join('')}</div></section>
 <section id="color" class="guide-section">${heading('Color','The original brand palette, with black and creme neutrals. Use the colors in brand artwork and marketing.')}<div class="lovable-color-grid">${assets.colors.map(color=>`<button class="lovable-color" data-brand-copy="${color.hex}" aria-label="Copy ${color.name}: ${color.hex}"><span class="lovable-color-chip" style="--swatch:${color.hex}" aria-hidden="true"></span><span class="lovable-color-name">${color.name}</span><span class="lovable-color-value">${color.hex} ${icon('copy')}</span></button>`).join('')}</div><p class="quiet-note">Keep interface controls neutral; the brand palette is not a set of button or toggle colors.</p></section>
 <section id="typography" class="guide-section">${heading('Typography','Camera Plain is the primary Lovable typeface, used for headlines, body copy and interface text.')}<div class="lovable-type-specimen"><span>Camera Plain</span><div>Make something<br/>people love.</div><p>Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj<br/>0123456789 &amp;?!</p></div><div class="intro-footer"><p>Use the original font files from the brand hub.</p>${external('/brand/typography','Get Camera Plain',icon)}</div></section>
 <section id="photography" class="guide-section">${heading('Photography','Original founder and company photographs, available for press and editorial use.')}<div class="lovable-photo-grid">${assets.media.filter(asset=>asset.kind==='photo').map(asset=>`<article>${image(asset)}<div class="format-caption"><h3>${asset.name}</h3><a class="subtle-button" href="${asset.url}" target="_blank" rel="noopener noreferrer" aria-label="Open original photo: ${asset.name}">${icon('arrow')}</a></div></article>`).join('')}</div></section>
 ${logoMisuse('<img src="/brand/assets/full-white-pure.svg" alt=""/>')}
${agentGuideSection('lovable')}
 <section id="downloads" class="guide-section">${heading('Downloads','Original files, ready to use.')}<div class="lovable-downloads">${[['/brand/logo','Logos and symbols','Vector masters'],['/brand/banners-wallpapers','Banners and wallpapers','Social covers and desktop backgrounds'],['/brand/photos','Photography','Full-resolution originals']].map(([href,title,detail])=>`<a href="${source}${href}" target="_blank" rel="noopener noreferrer"><span>${title}<small>${detail}</small></span>${icon('arrow')}</a>`).join('')}</div></section>
 </div>`;
}

export function mountBrandHub(root,notify){
 const cleanupLogo=mountLogoPlayground(root),cleanupQr=mountQrGuide(root);
 const click=async event=>{
  const button=event.target.closest('[data-brand-copy]');
  if(!button)return;
  try{await navigator.clipboard.writeText(button.dataset.brandCopy);notify('Color copied.');}
  catch{notify('Copy was unavailable. Please try again.');}
 };
 root.addEventListener('click',click);
 return()=>{cleanupLogo();cleanupQr();root.removeEventListener('click',click);};
}
