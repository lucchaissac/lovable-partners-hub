import { useEffect, useRef, useState } from 'react';
import { Button, Icon } from '@asset/ui';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export function HtmlEditorPdf({ src }: { src: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy>();
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    let destroy: (() => void) | undefined;
    setDocument(undefined); setPageNumber(1); setLoading(true); setError('');
    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        if (disposed) return;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;
        const source = src.startsWith('data:') ? { data: Uint8Array.from(atob(src.split(',')[1]), char => char.charCodeAt(0)) } : { url: src };
        const task = pdfjs.getDocument(source);
        destroy = () => { void task.destroy(); };
        const loaded = await task.promise;
        if (!disposed) setDocument(loaded);
      } catch (error) { console.warn('PDF preview:', error); if (!disposed) { setError('This PDF could not be opened.'); setLoading(false); } }
    })();
    return () => { disposed = true; destroy?.(); };
  }, [src]);
  useEffect(() => {
    if (!document || !canvas.current) return;
    let disposed = false;
    let cancel: (() => void) | undefined;
    setLoading(true);
    void (async () => {
      try {
        const page = await document.getPage(pageNumber);
        if (disposed || !canvas.current) return;
        const viewport = page.getViewport({ scale: Math.min(1200 / page.getViewport({ scale: 1 }).width, 3) });
        canvas.current.width = Math.ceil(viewport.width);
        canvas.current.height = Math.ceil(viewport.height);
        const render = page.render({ canvas: canvas.current, viewport });
        cancel = () => render.cancel();
        await render.promise;
        if (!disposed) setLoading(false);
      } catch { if (!disposed) { setError('This page could not be displayed.'); setLoading(false); } }
    })();
    return () => { disposed = true; cancel?.(); };
  }, [document, pageNumber]);
  return <div className="hev-pdf-preview">
    <div className="hev-pdf-pages"><Button variant="ghost" size="sm" aria-label="Previous PDF page" disabled={!document || pageNumber === 1} onClick={() => setPageNumber(p => p - 1)}><Icon name="chevron-left" size={16} /></Button><span>{document ? `${pageNumber} / ${document.numPages}` : 'PDF'}</span><Button variant="ghost" size="sm" aria-label="Next PDF page" disabled={!document || pageNumber === document.numPages} onClick={() => setPageNumber(p => p + 1)}><Icon name="chevron-right" size={16} /></Button></div>
    <div className="hev-pdf-view" aria-busy={loading}>{error ? <p role="alert">{error}</p> : <><canvas ref={canvas} aria-label={`PDF page ${pageNumber}`} />{loading && <p role="status">Loading PDF…</p>}</>}</div>
  </div>;
}
