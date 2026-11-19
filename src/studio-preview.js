import { createElement, ArrowRight, ArrowUp, ChevronDown, Image, Library, PanelLeftClose, PanelRightClose, Plus, Shapes, Smile, Type, Video } from 'lucide';
import { badgeSvg } from './badges.js';
import { ambassadorDefaultFormat, ambassadorDefaultTemplate, ambassadorPreview } from './ambassadors/catalog.js';
import './studio-preview.css';

const glyph = shape => createElement(shape, { width: 16, height: 16, 'stroke-width': 1.8, 'aria-hidden': 'true' }).outerHTML;

// A lightweight illustration of the real studio: one live artwork, no second editor runtime.
export function studioInvitation({workspace='partners',artwork=''}={}) {
  const community=workspace==='ambassadors',tech=workspace==='tech-blog',template=community?ambassadorDefaultFormat:tech?'cover':'grow-your-business';
  const format=community?ambassadorDefaultTemplate:null,width=format?.width??(tech?674:1200),height=format?.height??(tech?337:738);
  return `<div class="studio-invitation" data-workspace-preview="${workspace}">
    <div class="studio-invitation-heading"><h2>Make it yours.</h2><button class="primary-button" data-view="create" data-create-template="${template}">Create ${tech?'a cover':community?'an asset':'a badge'} ${glyph(ArrowRight)}</button></div>
    <a class="studio-preview" style="--artwork-ratio:${width/height}" href="${tech?'#tech-blog/create':community?'#ambassadors/create':'#create'}/${template}" data-view="create" data-create-template="${template}" aria-label="Open Make your own to create ${tech?'a Tech blog':community?'a community':'a partner'} asset">
      <div class="studio-mini-chat" aria-hidden="true">
        <div class="studio-mini-panel-title">${glyph(PanelLeftClose)}<span>Chat</span></div>
        <div class="studio-mini-composer"><span>Work with Studio...</span><div>${glyph(Plus)}<span class="studio-mini-send">${glyph(ArrowUp)}</span></div></div>
      </div>
      <div class="studio-mini-workspace" aria-hidden="true">
        <div class="studio-mini-toolbar"><span class="studio-mini-title">${tech?'Inside Chats · Tech blog':community?`${format.name} · Paris`:'Grow your business'}</span><div class="studio-mini-tools">${[Library, Type, Shapes, Smile, Image, Video].map(glyph).join('')}<span class="studio-mini-export">Export</span></div></div>
        <div class="studio-mini-canvas">
          <div class="studio-mini-artwork">
            ${tech?artwork:community?`<img class="studio-mini-community-image" src="${ambassadorPreview(template)}" alt="" width="${width}" height="${height}"/>`:`
            <video class="gallery-video" data-motion="8" poster="/gallery/motion-8.webp" width="960" height="960" muted loop playsinline preload="none" disablepictureinpicture disableremoteplayback tabindex="-1"></video>
            <div class="studio-mini-headline">Grow your<br />business</div>
            <div class="studio-mini-badge">${badgeSvg('solution-stacked', { tier: 'Select', year: '2026', partnerName: 'Logo' })}</div>`}

          </div>
        </div>
        <div class="studio-mini-status"><span>${width} × ${height}</span><span class="studio-mini-zoom"><i></i>100%</span></div>
      </div>
      <div class="studio-mini-design" aria-hidden="true">
        <div class="studio-mini-panel-title"><span>Design</span>${glyph(PanelRightClose)}</div>
        <div class="studio-mini-fields"><span>Canvas</span><div class="studio-mini-dimensions"><div><span>Width</span><b>${width}</b></div><div><span>Height</span><b>${height}</b></div></div><span>Background</span><div class="studio-mini-select">${community||tech?'Dark':'Video'} ${glyph(ChevronDown)}</div></div>
      </div>
    </a>
  </div>`;
}
