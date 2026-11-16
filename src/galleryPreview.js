// Move the exact composition between its thumbnail and a restrained centered preview.
export function mountGalleryPreview(root, mountMedia, refreshMedia) {
  const cards = [...root.querySelectorAll('.gallery-item')];
  if (!cards.length) return () => {};
  const dialog = document.createElement('dialog');
  dialog.className = 'gallery-lightbox';
  dialog.tabIndex = -1;
  const stage = document.createElement('div');
  stage.className = 'gallery-lightbox-stage';
  dialog.append(stage);
  document.body.append(dialog);
  let selected, cleanupMedia, animation, width = 1, height = 1, overflow, visibility, closing = false;
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fit() {
    const scale = Math.min(3, innerWidth * .6 / width, innerHeight * .6 / height);
    stage.style.width = `${width * scale}px`;
    stage.style.height = `${height * scale}px`;
    stage.style.setProperty('--preview-scale', scale);
  }
  function atThumbnail() {
    const rect = selected.getBoundingClientRect();
    const x = rect.left - (innerWidth - stage.offsetWidth) / 2;
    const y = rect.top - (innerHeight - stage.offsetHeight) / 2;
    return `translate(${x}px, ${y}px) scale(${rect.width / stage.offsetWidth}, ${rect.height / stage.offsetHeight})`;
  }
  function finishClose(focus = true) {
    animation?.cancel();
    animation = undefined;
    const previewVideos = [...stage.querySelectorAll('video')];
    selected.querySelectorAll('video').forEach((video, index) => {
      const preview = previewVideos[index];
      if (video.readyState >= 1 && preview?.readyState >= 1) video.currentTime = preview.currentTime;
    });
    cleanupMedia?.();
    cleanupMedia = undefined;
    selected.style.visibility = visibility;
    dialog.close();
    stage.replaceChildren();
    document.documentElement.style.overflow = overflow;
    closing = false;
    refreshMedia();
    if (focus) selected.focus({ preventScroll: true });
  }
  function close() {
    if (!dialog.open || closing) return;
    closing = true;
    const current = getComputedStyle(stage).transform;
    const opacity = getComputedStyle(stage).opacity;
    animation?.cancel();
    if (reducedMotion()) { finishClose(); return; }
    animation = stage.animate([{ transform: current, opacity }, { transform: atThumbnail(), opacity: .92 }], {
      duration: 440, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards',
    });
    animation.onfinish = () => finishClose();
  }
  function open(card) {
    if (dialog.open) return;
    selected = card;
    const rect = card.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const copy = card.cloneNode(true);
    copy.removeAttribute('tabindex');
    copy.removeAttribute('aria-haspopup');
    copy.setAttribute('role', 'img');
    copy.style.cssText = `width:${width}px;height:${height}px;margin:0;grid-area:auto;`;
    const suffix = `-preview-${Date.now()}`;
    copy.querySelectorAll('[id]').forEach(node => {
      const old = node.id;
      node.id += suffix;
      copy.querySelectorAll('[aria-labelledby],[filter]').forEach(ref => {
        if (ref.getAttribute('aria-labelledby') === old) ref.setAttribute('aria-labelledby', old + suffix);
        if (ref.getAttribute('filter') === `url(#${old})`) ref.setAttribute('filter', `url(#${old + suffix})`);
      });
    });
    // Preserve the moment of a playing loop instead of restarting it on enlargement.
    const originals = [...card.querySelectorAll('video')];
    copy.querySelectorAll('video').forEach((video, index) => {
      const time = originals[index].currentTime;
      const seek = () => { if (Number.isFinite(time)) video.currentTime = time; };
      if (video.readyState >= 1) seek();
      else video.addEventListener('loadedmetadata', seek, { once: true });
    });
    stage.replaceChildren(copy);
    fit();
    dialog.setAttribute('aria-label', card.getAttribute('aria-label') || 'Gallery preview');
    overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    visibility = card.style.visibility;
    dialog.showModal();
    card.style.visibility = 'hidden';
    cleanupMedia = mountMedia(copy);
    refreshMedia();
    if (!reducedMotion()) {
      animation = stage.animate([{ transform: atThumbnail(), opacity: .92 }, { transform: 'none', opacity: 1 }], {
        duration: 560, easing: 'cubic-bezier(.4, 0, .2, 1)',
      });
    }
  }
  cards.forEach(card => {
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-haspopup', 'dialog');
  });
  const click = event => {
    const card = event.target.closest('.gallery-item');
    if (card && root.contains(card)) open(card);
  };
  const key = event => {
    const card = event.target.closest('.gallery-item');
    if (card && ['Enter', ' '].includes(event.key)) { event.preventDefault(); open(card); }
  };
  const resize = () => {
    if (!dialog.open) return;
    if (closing) { finishClose(); return; }
    animation?.cancel();
    fit();
  };
  root.addEventListener('click', click);
  root.addEventListener('keydown', key);
  dialog.addEventListener('click', event => { if (event.target === dialog || event.target === stage) close(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  window.addEventListener('resize', resize);
  return () => {
    if (dialog.open) finishClose(false);
    dialog.remove();
    root.removeEventListener('click', click);
    root.removeEventListener('keydown', key);
    window.removeEventListener('resize', resize);
  };
}
