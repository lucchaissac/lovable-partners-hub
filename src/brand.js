import './brand.css';

export function brandHub() {
  return `<section class="brand-hub-page" aria-label="Lovable brand hub">
    <video class="brand-hub-video" poster="/brand/motion-2-poster.webp" autoplay muted loop playsinline preload="none" disablepictureinpicture disableremoteplayback aria-hidden="true" tabindex="-1"></video>
    <a class="brand-hub-link" href="https://lovablebrand.lovable.app/" target="_blank" rel="noopener noreferrer">Visit brand hub</a>
  </section>`;
}

export function mountBrandHub(root) {
  const video = root.querySelector('.brand-hub-video');
  if (!video) return () => {};
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false;
  const sync = () => {
    if (disposed || document.hidden || reducedMotion.matches) { video.pause(); return; }
    if (!video.hasAttribute('src')) video.src = `/brand/motion-2-${innerWidth <= 800 ? 720 : 1280}.mp4`;
    video.muted = true;
    video.play()?.then(() => { if (disposed || document.hidden || reducedMotion.matches) video.pause(); }).catch(() => {});
  };
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);
  sync();
  return () => {
    disposed = true;
    document.removeEventListener('visibilitychange', sync);
    reducedMotion.removeEventListener('change', sync);
    video.pause(); video.removeAttribute('src'); video.load();
  };
}
