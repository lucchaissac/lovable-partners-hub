import { badgeSvg } from './badges.js';
import { createElement, Star } from 'lucide';
import './gallery.css';

const media = '/gallery/';
const sizes = '(max-width: 680px) calc(100vw - 64px), (max-width: 1000px) 42vw, 32vw';

function photo(name, width, height, eager = false) {
  const src = name === 'portrait' ? 'portrait.webp' : `${name}-960.webp`;
  const responsive = name === 'portrait' ? '' : `srcset="${media}${name}-480.webp 480w, ${media}${name}-960.webp 960w" sizes="${sizes}"`;
  return `<img class="gallery-media" src="${media}${src}" ${responsive} width="${width}" height="${height}" alt="" loading="${eager ? 'eager' : 'lazy'}" decoding="async" ${eager ? 'fetchpriority="high"' : ''} />`;
}

function motion(number, portal = false) {
  // No src until the card enters the viewport. The poster also covers blocked autoplay.
  return `<img class="gallery-media gallery-poster" src="${media}motion-${number}.webp" width="960" height="960" alt="" loading="lazy" decoding="async" />
    <video class="gallery-media gallery-video" data-motion="${number}" poster="${media}motion-${number}.webp" width="960" height="960" muted loop playsinline preload="none" disablepictureinpicture disableremoteplayback aria-hidden="true" tabindex="-1"></video>${portal ? '<canvas class="gallery-media gallery-portal-canvas" aria-hidden="true"></canvas>' : ''}`;
}

function badge(format, className = '', options = {}) {
  return `<div class="gallery-badge ${className}" aria-hidden="true">${badgeSvg(format, { tier: 'Select', year: '2026', partnerName: 'CroissantStudio', ...options })}</div>`;
}

function card(node, className, label, content) {
  return `<figure class="gallery-item ${className}" data-gallery-node="${node}" role="img" aria-label="${label}">${content}</figure>`;
}

function partnerCard() {
  const icon = (shape, className) => createElement(shape, { class: className, width: 20, height: 20, 'stroke-width': 1.8, 'aria-hidden': 'true' }).outerHTML;
  return `<figure class="gallery-item gallery-partner-demo" data-gallery-example="partner-card" role="img" aria-label="Partner profile illustration: LoCo AI Solutions, Expert 2026, United States, rated 5.0, with an Eames Institute website preview.">
    <div class="partner-card">
      <div class="partner-preview">${motion(4)}<img class="partner-site-preview" src="${media}eames-preview-1280.webp" srcset="${media}eames-preview-640.webp 640w, ${media}eames-preview-1280.webp 1280w" sizes="${sizes}" width="3392" height="1788" alt="" decoding="async" /></div>
      <div class="partner-summary">
        <div class="partner-avatar"><img src="${media}loco-logo.webp" width="128" height="128" alt="" decoding="async" /></div>
        <div class="partner-name">LoCo AI Solutions</div>
        <div class="partner-rating">${icon(Star, 'partner-star')}<span>5.0</span></div>
        <div class="partner-credentials">
          <div class="partner-expert" aria-hidden="true">${badgeSvg('expert-compact', { year: '2026' })}</div>
          <span class="partner-country">United States</span>
        </div>
      </div>
    </div>
  </figure>`;
}

export function gallery() {
  return `<section class="gallery" aria-label="Partner gallery"><div class="gallery-grid">
    <div class="gallery-column">
      ${card('3:8', 'gallery-portrait', 'Expert badge on an outdoor portrait', photo('portrait', 399, 501, true) + badge('expert-compact', 'badge-portrait'))}
      ${card('3:10', 'gallery-landscape gallery-portal', 'Solution Partner badge inside a moving color composition', motion(4, true) + badge('solution-compact', 'badge-portal', { tier: 'Elite' }))}
      ${card('3:52', 'gallery-square', 'Stacked Solution Partner badge on flowing pink and blue', motion(3) + badge('solution-stacked', 'badge-stacked'))}
    </div>
    <div class="gallery-column">
      ${partnerCard()}
      ${card('3:27', 'gallery-landscape gallery-portal gallery-portal-alt', 'Outlined Solution Partner badge inside a moving color composition', motion(8, true) + badge('solution-compact', 'badge-portal', { tier: 'Premier' }))}
      ${card('3:100', 'gallery-hoodie', 'White outlined partner badge printed on a pink hoodie', photo('hoodie', 1024, 1536, true) + badge('solution-stacked', 'badge-hoodie'))}
      ${card('3:9', 'gallery-portrait', 'Solution Partner badge on an outdoor portrait', photo('portrait', 399, 501) + badge('solution-horizontal', 'badge-portrait-wide'))}
    </div>
    <div class="gallery-column">
      ${card('3:44', 'gallery-square', 'Symbol-led Solution Partner badge on a flowing color field', motion(4) + badge('solution-symbol', 'badge-symbol', { tier: 'Elite', symbolSize: 'large' }))}
      ${card('3:101', 'gallery-blanket', 'White outlined partner badge on a charcoal woven blanket', photo('blanket', 1096, 1435) + badge('solution-stacked', 'badge-blanket'))}
      ${card('3:76', 'gallery-landscape gallery-signature', 'Grow your business with a Solution Partner signature', motion(8) + '<p class="gallery-artwork-copy">Grow your<br />business</p>' + badge('solution-stacked', 'badge-signature', { partnerName: 'Logo' }))}
    </div>
  </div></section>`;
}

export function mountGallery(root) {
  const videos = [...root.querySelectorAll('.gallery-video')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const visible = new Set();
  let disposed = false;
  const portalCleanups = videos.filter(video => video.closest('.gallery-portal')).map(mountPortal);

  function sync(video) {
    if (disposed || document.hidden || reducedMotion.matches || connection?.saveData || !visible.has(video)) {
      video.pause();
      return;
    }
    if (!video.hasAttribute('src')) {
      const pixels = video.clientWidth * Math.min(devicePixelRatio || 1, 2);
      video.src = `${media}motion-${video.dataset.motion}-${pixels <= 560 ? 480 : 960}.mp4`;
      video.muted = true;
    }
    const playing = video.play();
    playing?.then(() => {
      if (disposed || !visible.has(video) || document.hidden || reducedMotion.matches || connection?.saveData) video.pause();
    }).catch(() => { /* Keep the poster when autoplay is unavailable. */ });
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) visible.add(target);
      else visible.delete(target);
      sync(target);
    });
  }, { threshold: 0.05 });
  videos.forEach(video => observer.observe(video));

  const refresh = () => videos.forEach(sync);
  document.addEventListener('visibilitychange', refresh);
  reducedMotion.addEventListener('change', refresh);
  connection?.addEventListener('change', refresh);

  return () => {
    disposed = true;
    observer.disconnect();
    portalCleanups.forEach(cleanup => cleanup());
    document.removeEventListener('visibilitychange', refresh);
    reducedMotion.removeEventListener('change', refresh);
    connection?.removeEventListener('change', refresh);
    videos.forEach(video => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
    visible.clear();
  };
}

// Three video crops, one decoder. The gap is shared by every side of every layer.
function mountPortal(video) {
  const card = video.closest('.gallery-portal');
  const canvas = card.querySelector('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return () => {};
  const poster = card.querySelector('.gallery-poster');
  const badge = card.querySelector('.badge-graphic');
  const ratio = badge.viewBox.baseVal.width / badge.viewBox.baseVal.height;
  let frame, disposed = false, width = 0, height = 0, gap = 0;

  function crop(source, x, y, w, h, focus) {
    const sw = source.videoWidth || source.naturalWidth;
    const sh = source.videoHeight || source.naturalHeight;
    if (!sw || !sh) return;
    const scale = Math.max(w / sw, h / sh);
    const cw = w / scale, ch = h / scale;
    context.drawImage(source, (sw - cw) / 2, (sh - ch) * focus, cw, ch, x, y, w, h);
  }

  function paint() {
    const source = video.readyState >= 2 ? video : poster;
    crop(source, 0, 0, width, height, .2);
    for (let layer = 1; layer <= 2; layer++) {
      const inset = gap * layer, w = width - inset * 2, h = height - inset * 2;
      context.save();
      context.beginPath();
      context.roundRect(inset, inset, w, h, gap * (3.2 - layer));
      context.clip();
      crop(source, inset, inset, w, h, layer === 1 ? .85 : .4);
      context.restore();
    }
  }

  function resize() {
    const bounds = card.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = bounds.width; height = bounds.height;
    gap = Math.max(0, (height * ratio - width) / (6 * (ratio - 1)));
    card.style.setProperty('--portal-gap', `${gap}px`);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint();
  }

  function tick() {
    if (disposed || video.paused) return;
    paint();
    frame = video.requestVideoFrameCallback ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
  }
  function stop() {
    if (frame !== undefined) {
      if (video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(frame);
      else cancelAnimationFrame(frame);
      frame = undefined;
    }
  }
  function start() { stop(); tick(); }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(card);
  poster.addEventListener('load', resize);
  video.addEventListener('playing', start);
  video.addEventListener('pause', stop);
  resize();
  return () => {
    disposed = true; stop(); resizeObserver.disconnect();
    poster.removeEventListener('load', resize);
    video.removeEventListener('playing', start);
    video.removeEventListener('pause', stop);
  };
}
