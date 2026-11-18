/** Capture completion before a nested drop zone consumes the event. */
export function listenForFileDragEnd(reset: () => void, target: Window = window) {
  const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') reset(); };
  const leave = (event: DragEvent) => {
    if (!event.relatedTarget && (event.clientX <= 0 || event.clientY <= 0 || event.clientX >= target.innerWidth || event.clientY >= target.innerHeight)) reset();
  };
  const events = ['drop', 'dragend', 'blur', 'pointerup'] as const;
  events.forEach(name => target.addEventListener(name, reset, true));
  target.addEventListener('keydown', escape, true);
  target.addEventListener('dragleave', leave, true);
  return () => {
    events.forEach(name => target.removeEventListener(name, reset, true));
    target.removeEventListener('keydown', escape, true);
    target.removeEventListener('dragleave', leave, true);
  };
}
