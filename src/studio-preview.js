import { createElement, ArrowRight, ArrowUp, ChevronDown, Image, Library, PanelLeftClose, PanelRightClose, Plus, Shapes, Smile, Type, Video } from 'lucide';
import { badgeSvg } from './badges.js';
import './studio-preview.css';

const glyph = shape => createElement(shape, { width: 16, height: 16, 'stroke-width': 1.8, 'aria-hidden': 'true' }).outerHTML;

// A lightweight illustration of the real studio: one live artwork, no second editor runtime.
export function studioInvitation() {
  return `<div class="studio-invitation">
    <div class="studio-invitation-heading"><h2>Make it yours.</h2><button class="primary-button" data-view="create">Create a badge ${glyph(ArrowRight)}</button></div>
    <a class="studio-preview" href="#create" data-view="create" aria-label="Open Make your own to create a partner asset">
      <div class="studio-mini-chat" aria-hidden="true">
        <div class="studio-mini-panel-title">${glyph(PanelLeftClose)}<span>Chat</span></div>
        <div class="studio-mini-composer"><span>Ask Lovable…</span><div>${glyph(Plus)}<span class="studio-mini-send">${glyph(ArrowUp)}</span></div></div>
      </div>
      <div class="studio-mini-workspace" aria-hidden="true">
        <div class="studio-mini-toolbar"><span class="studio-mini-title">Grow your business</span><div class="studio-mini-tools">${[Library, Type, Shapes, Smile, Image, Video].map(glyph).join('')}<span class="studio-mini-export">Export</span></div></div>
        <div class="studio-mini-canvas">
          <div class="studio-mini-artwork">
            <video class="gallery-video" data-motion="8" poster="/gallery/motion-8.webp" width="960" height="960" muted loop playsinline preload="none" disablepictureinpicture disableremoteplayback tabindex="-1"></video>
            <div class="studio-mini-headline">Grow your<br />business</div>
            <div class="studio-mini-badge">${badgeSvg('solution-stacked', { tier: 'Select', year: '2026', partnerName: 'Logo' })}</div>
          </div>
        </div>
        <div class="studio-mini-status"><span>1200 × 738</span><span class="studio-mini-zoom"><i></i>100%</span></div>
      </div>
      <div class="studio-mini-design" aria-hidden="true">
        <div class="studio-mini-panel-title"><span>Design</span>${glyph(PanelRightClose)}</div>
        <div class="studio-mini-fields"><span>Canvas</span><div class="studio-mini-dimensions"><div><span>Width</span><b>1200</b></div><div><span>Height</span><b>738</b></div></div><span>Background</span><div class="studio-mini-select">Video ${glyph(ChevronDown)}</div></div>
      </div>
    </a>
  </div>`;
}
