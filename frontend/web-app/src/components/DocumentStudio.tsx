'use client';

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  FileText,
  Presentation,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, FileTrigger } from 'react-aria-components';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { LoadedPresentation, SlideElement } from 'pptx-viewer';

type DocumentState = {
  name: string;
  url: string;
} & (
  | { type: 'pdf'; pdf: PDFDocumentProxy }
  | { type: 'pptx'; presentation: LoadedPresentation }
);

type DocumentStudioProps = {
  initialFile?: File | null;
  allowUpload?: boolean;
};

const acceptedTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.pptx',
];

export function DocumentStudio({ initialFile = null, allowUpload = true }: DocumentStudioProps) {
  const [document, setDocument] = useState<DocumentState | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pptxRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const resourceRef = useRef<DocumentState | null>(null);
  const openedInitialFile = useRef<File | null>(null);

  const openFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setPage(1);
    setZoom(1);
    releaseDocument(resourceRef.current);
    resourceRef.current = null;
    setDocument(null);
    const url = URL.createObjectURL(file);

    try {
      const buffer = await file.arrayBuffer();
      let next: DocumentState;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
        next = { name: file.name, type: 'pdf', url, pdf };
      } else if (file.name.toLowerCase().endsWith('.pptx')) {
        const { loadPresentation } = await import('pptx-viewer');
        const presentation = await loadPresentation(buffer);
        next = { name: file.name, type: 'pptx', url, presentation };
      } else {
        throw new Error('Choose a PDF or PowerPoint .pptx file.');
      }
      resourceRef.current = next;
      setDocument(next);
    } catch (caught) {
      URL.revokeObjectURL(url);
      setError(caught instanceof Error ? caught.message : 'The document could not be opened.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialFile || openedInitialFile.current === initialFile) return;
    openedInitialFile.current = initialFile;
    void openFile(initialFile);
  }, [initialFile, openFile]);

  useEffect(() => () => releaseDocument(resourceRef.current), []);

  useEffect(() => {
    if (document?.type !== 'pdf' || !canvasRef.current) return;
    let active = true;
    const render = async () => {
      const pdfPage = await document.pdf.getPage(page);
      if (!active || !canvasRef.current) return;
      const viewport = pdfPage.getViewport({ scale: 1.45 });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / 1.45}px`;
      canvas.style.height = `${viewport.height / 1.45}px`;
      await pdfPage.render({ canvas, canvasContext: context, viewport }).promise;
    };
    void render().catch(() => active && setError('This PDF page could not be rendered.'));
    return () => { active = false; };
  }, [document, page]);

  useEffect(() => {
    if (document?.type !== 'pptx' || !pptxRef.current) return;
    let active = true;
    const container = pptxRef.current;
    void import('pptx-viewer').then(({ renderSlideToElement }) => {
      if (!active) return;
      container.replaceChildren();
      renderSlideToElement(document.presentation, page - 1, container, { width: 960 });
    }).catch(() => active && setError('This PowerPoint slide could not be rendered.'));
    return () => {
      active = false;
      container.replaceChildren();
    };
  }, [document, page]);

  const pageCount = document?.type === 'pdf'
    ? document.pdf.numPages
    : document?.presentation.slides.length ?? 0;

  if (!document) {
    if (!allowUpload) {
      return <section className="report-preparing glass-panel">{isLoading ? 'Opening saved PDF report…' : error ?? 'Preparing saved PDF report…'}</section>;
    }
    return (
      <section className="document-empty glass-panel">
        <div className="document-icons"><FileText /><Presentation /></div>
        <h2>Open a document</h2>
        <p>Review PDF and PowerPoint evidence without leaving the workspace.</p>
        <FileTrigger acceptedFileTypes={acceptedTypes} onSelect={(files) => files?.[0] && void openFile(files[0])}>
          <Button className="button primary-button"><Upload size={17} /> Choose document</Button>
        </FileTrigger>
        <small>Files remain in this browser session and are not uploaded.</small>
        {isLoading ? <span className="document-loading">Opening document…</span> : null}
        {error ? <div className="form-error" role="alert">{error}</div> : null}
      </section>
    );
  }

  return (
    <section className="document-studio glass-panel">
      <header className="document-toolbar">
        <div><span>{document.type === 'pdf' ? <FileText size={17} /> : <Presentation size={17} />}</span><strong>{document.name}</strong><small>{pageCount} {document.type === 'pdf' ? 'page' : 'slide'}{pageCount === 1 ? '' : 's'}</small></div>
        <nav aria-label="Document controls">
          <Button onPress={() => setPage((value) => Math.max(1, value - 1))} isDisabled={page === 1} aria-label="Previous page"><ChevronLeft size={17} /></Button>
          <span>{page} / {pageCount}</span>
          <Button onPress={() => setPage((value) => Math.min(pageCount, value + 1))} isDisabled={page === pageCount} aria-label="Next page"><ChevronRight size={17} /></Button>
          <i />
          <Button onPress={() => setZoom((value) => Math.max(0.6, value - 0.15))} aria-label="Zoom out"><ZoomOut size={17} /></Button>
          <span>{Math.round(zoom * 100)}%</span>
          <Button onPress={() => setZoom((value) => Math.min(2, value + 0.15))} aria-label="Zoom in"><ZoomIn size={17} /></Button>
          <Button onPress={() => stageRef.current?.requestFullscreen()} aria-label="Enter fullscreen"><Expand size={17} /></Button>
          <a href={document.url} download={document.name} aria-label="Download original"><Download size={17} /></a>
          {allowUpload ? (
            <FileTrigger acceptedFileTypes={acceptedTypes} onSelect={(files) => files?.[0] && void openFile(files[0])}>
              <Button aria-label="Open another document"><Upload size={17} /></Button>
            </FileTrigger>
          ) : null}
        </nav>
      </header>

      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <div className="document-body">
        <aside className="document-thumbnails" aria-label="Pages">
          {Array.from({ length: pageCount }, (_, index) => (
            <Button data-active={page === index + 1} onPress={() => setPage(index + 1)} key={index}>
              <span>{index + 1}</span>
              {document.type === 'pptx' ? <small>{slideTitle(document.presentation.slides[index]?.elements, index)}</small> : null}
            </Button>
          ))}
        </aside>
        <div className="document-stage-wrap" ref={stageRef}>
          <div className="document-stage" style={{ transform: `scale(${zoom})` }}>
            {document.type === 'pdf'
              ? <canvas ref={canvasRef} />
              : <div className="pptx-render" ref={pptxRef} role="img" aria-label={`Slide ${page}`} />}
          </div>
        </div>
      </div>
    </section>
  );
}

function releaseDocument(document: DocumentState | null) {
  if (!document) return;
  URL.revokeObjectURL(document.url);
  if (document.type === 'pptx') document.presentation.cleanup();
  else void document.pdf.cleanup();
}

function slideTitle(elements: SlideElement[] | undefined, index: number) {
  if (!elements) return `Slide ${index + 1}`;
  for (const element of elements) {
    const text = elementText(element).trim();
    if (text) return text.slice(0, 70);
  }
  return `Slide ${index + 1}`;
}

function elementText(element: SlideElement): string {
  if ('text' in element && element.text) {
    return element.text.paragraphs
      .map((paragraph) => paragraph.runs.map((run) => run.text).join(''))
      .join(' ');
  }
  if ('children' in element && element.children) return element.children.map(elementText).join(' ');
  return '';
}
