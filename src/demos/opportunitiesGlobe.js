import {cityLocation} from '../ambassadors/source/renderer.mjs';

// Reuse the kit's same-origin frame bridge. No second scene or perpetual loop.
export function mountOpportunityGlobe(canvas) {
  const city = canvas.dataset.city;
  const coordinates = cityLocation(city);
  if (!coordinates) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frame = document.createElement('iframe');
  frame.title = 'Community artwork renderer';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  Object.assign(frame.style, {position:'fixed',left:'-1200px',top:'0',width:'1080px',height:'1080px',border:'0',pointerEvents:'none'});
  const context = canvas.getContext('2d');
  let ready = false;
  let finished = false;
  let visible = true;
  const send = message => frame.contentWindow?.postMessage(message, location.origin);
  const setActive = () => {
    if (ready && !finished) send({type:'renderer-active',active:visible && !document.hidden});
  };
  const observer = new IntersectionObserver(([entry]) => {visible=entry.isIntersecting;setActive();});
  const dispose = () => {
    finished = true;
    clearTimeout(loadTimeout);
    observer.disconnect();
    document.removeEventListener('visibilitychange', setActive);
    window.removeEventListener('message', onMessage);
    window.removeEventListener('pagehide', dispose);
    frame.remove();
  };
  const draw = image => {
    context.clearRect(0,0,canvas.width,canvas.height);
    context.drawImage(image,0,0,canvas.width,canvas.height);
    canvas.hidden = false;
    canvas.classList.add('is-ready');
  };
  const onMessage = async event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow || finished) return;
    const message = event.data || {};
    if (message.type === 'ready') {
      clearTimeout(loadTimeout);
      ready = true;
      if (!reducedMotion) frame.contentWindow.setGlobeFrameListener(draw);
      canvas.dataset.renderState = reducedMotion ? 'preparing' : 'rotating';
      send({type:'city',name:city,lat:coordinates[0],lon:coordinates[1],requestId:1,heartScale:6.4,...(!reducedMotion && {intro:'opposite'})});
      setActive();
    } else if (message.type === 'globe-intro-phase' && ['rotating','heart','wave'].includes(message.phase)) {
      canvas.dataset.renderState = message.phase;
    } else if (message.type === 'globe-city-settled' && message.requestId === 1) {
      send({type:'render-globe',pixels:2160,requestId:2});
    } else if (message.type === 'globe-render-done' && message.requestId === 2) {
      try {
        if (!(message.blob instanceof Blob)) throw Error('Missing globe capture');
        const image = await createImageBitmap(message.blob);
        if (finished) {image.close();return;}
        canvas.width = canvas.height = 2160;
        draw(image);
        image.close();
        canvas.dataset.renderState = 'settled';
      } catch (error) {
        console.error('Community globe capture failed:',error);
      } finally {
        dispose();
      }
    } else if (message.type === 'globe-error') dispose();
  };
  const loadTimeout = setTimeout(dispose,25000);
  window.addEventListener('message',onMessage);
  window.addEventListener('pagehide',dispose,{once:true});
  document.addEventListener('visibilitychange',setActive);
  observer.observe(canvas.parentElement);
  frame.src = '/ambassadors/scene/asset.html?embed&hd&live-globe&bokeh=bottom-left';
  document.body.append(frame);
}
