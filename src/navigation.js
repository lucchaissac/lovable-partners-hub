import './navigation.css';

// One persistent background follows the active tab across all hub views.
const navigation = document.querySelector('.section-switcher');
if (navigation) {
  let frame;
  const placeIndicator = () => {
    const selected = navigation.querySelector('[aria-current="page"]');
    if (!selected) return;
    navigation.style.setProperty('--segment-x', `${selected.offsetLeft}px`);
    navigation.style.setProperty('--segment-width', `${selected.offsetWidth}px`);
    navigation.dataset.indicatorReady = '';
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(placeIndicator);
  };
  const selectionObserver = new MutationObserver(schedule);
  selectionObserver.observe(navigation, { subtree: true, attributes: true, attributeFilter: ['aria-current'] });
  const sizeObserver = new ResizeObserver(schedule);
  sizeObserver.observe(navigation);
  navigation.querySelectorAll('[data-view]').forEach(button => sizeObserver.observe(button));
  document.fonts.ready.then(schedule);
  placeIndicator();
}
