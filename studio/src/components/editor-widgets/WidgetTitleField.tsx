import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

/** An inline widget title stays readable when its column narrows or its text grows. */
export const WidgetTitleField = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function WidgetTitleField(props, forwardedRef) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(forwardedRef, () => ref.current!);
  const fit = () => {
    const field = ref.current;
    if (!field || !field.clientWidth) return;
    field.style.height = '0px';
    field.style.height = `${field.scrollHeight}px`;
  };

  // Also remeasure when the widget's font settings change, without moving focus.
  useLayoutEffect(fit);
  useLayoutEffect(() => {
    const field = ref.current!;
    let width = field.clientWidth;
    const observer = new ResizeObserver(() => {
      if (width === field.clientWidth) return;
      width = field.clientWidth;
      fit();
    });
    observer.observe(field);
    let mounted = true;
    void document.fonts.ready.then(() => { if (mounted) fit(); });
    return () => { mounted = false; observer.disconnect(); };
  }, []);

  return <textarea {...props} ref={ref} rows={1} onKeyDown={event => {
    props.onKeyDown?.(event);
    if (event.key === 'Enter' && !event.nativeEvent.isComposing && !event.defaultPrevented) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }} />;
});
