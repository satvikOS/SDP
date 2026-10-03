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
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Button, FileTrigger } from 'react-aria-components';
import type { PDFDocumentProxy } from 'pdfjs-dist';

type SlideElement = {
  id: string;
  kind: 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  src?: string;
  fontSize?: number;
  color?: string;
};

type ParsedSlide = { id: string; title: string; elements: SlideElement[] };
type DocumentState = {
  name: string;
  type: 'pdf' | 'pptx';
  url: string;
  slides?: ParsedSlide[];
  pdf?: PDFDocumentProxy;
};

export function DocumentStudio() {
  const [document, setDocument] = useState<DocumentState | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  async function openFile(file: File) {
    setIsLoading(true);
    setError(null);
    setPage(1);
    setZoom(1);
    if (document?.url) URL.revokeObjectURL(document.url);
    const url = URL.createObjectURL(file);

    try {
      const buffer = await file.arrayBuffer();
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
        setDocument({ name: file.name, type: 'pdf', url, pdf });
      } else if (file.name.toLowerCase().endsWith('.pptx')) {
        const slides = await parsePresentation(buffer);
        setDocument({ name: file.name, type: 'pptx', url, slides });
      } else {
        throw new Error('Choose a PDF or PowerPoint .pptx file.');
      }
    } catch (caught) {
      URL.revokeObjectURL(url);
      setDocument(null);
      setError(caught instanceof Error ? caught.message : 'The document could not be opened.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!document?.pdf || !canvasRef.current) return;
    let active = true;
    const render = async () => {
      const pdfPage = await document.pdf?.getPage(page);
      if (!pdfPage || !active || !canvasRef.current) return;
      const viewport = pdfPage.getViewport({ scale: Math.max(1.2, zoom * 1.45) });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / 1.45}px`;
      canvas.style.height = `${viewport.height / 1.45}px`;
      await pdfPage.render({ canvas, canvasContext: context, viewport }).promise;
    };
    void render();
    return () => { active = false; };
  }, [document?.pdf, page, zoom]);

  useEffect(() => () => {
    if (document?.url) URL.revokeObjectURL(document.url);
    document?.slides?.forEach((slide) => slide.elements.forEach((element) => {
      if (element.kind === 'image' && element.src) URL.revokeObjectURL(element.src);
    }));
  }, [document]);

  const pageCount = document?.type === 'pdf' ? document.pdf?.numPages ?? 0 : document?.slides?.length ?? 0;
  const currentSlide = document?.slides?.[page - 1];

  if (!document) {
    return (
      <section className="document-empty glass-panel">
        <div className="document-icons"><FileText /><Presentation /></div>
        <h2>Open a document</h2>
        <p>Review PDF and PowerPoint evidence without leaving the workspace.</p>
        <FileTrigger
          acceptedFileTypes={['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.pptx']}
          onSelect={(files) => files?.[0] && void openFile(files[0])}
        >
          <Button className="button primary-button"><Upload size={17} /> Choose document</Button>
        </FileTrigger>
        <small>Files remain in this browser session and are not uploaded.</small>
        {isLoading && <span className="document-loading">Opening document…</span>}
        {error && <div className="form-error" role="alert">{error}</div>}
      </section>
    );
  }

  return (
    <section className="document-studio glass-panel">
      <header className="document-toolbar">
        <div><span>{document.type === 'pdf' ? <FileText size={17} /> : <Presentation size={17} />}</span><strong>{document.name}</strong><small>{pageCount} {document.type === 'pdf' ? 'pages' : 'slides'}</small></div>
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
          <FileTrigger acceptedFileTypes={['application/pdf', '.pptx']} onSelect={(files) => files?.[0] && void openFile(files[0])}>
            <Button aria-label="Open another document"><Upload size={17} /></Button>
          </FileTrigger>
        </nav>
      </header>

      <div className="document-body">
        <aside className="document-thumbnails" aria-label="Pages">
          {Array.from({ length: pageCount }, (_, index) => (
            <Button data-active={page === index + 1} onPress={() => setPage(index + 1)} key={index}>
              <span>{index + 1}</span>
              {document.type === 'pptx' && <small>{document.slides?.[index]?.title || 'Untitled slide'}</small>}
            </Button>
          ))}
        </aside>
        <div className="document-stage-wrap" ref={stageRef}>
          <div className="document-stage" style={{ transform: `scale(${zoom})` }}>
            {document.type === 'pdf' ? <canvas ref={canvasRef} /> : currentSlide && <PptxSlide slide={currentSlide} />}
          </div>
        </div>
      </div>
    </section>
  );
}

function PptxSlide({ slide }: { slide: ParsedSlide }) {
  return (
    <div className="pptx-slide" role="img" aria-label={slide.title}>
      {slide.elements.map((element) => (
        <div
          className={`pptx-element pptx-${element.kind}`}
          key={element.id}
          style={{
            left: `${element.x}%`,
            top: `${element.y}%`,
            width: `${element.width}%`,
            height: `${element.height}%`,
            fontSize: `${Math.max(9, element.fontSize ?? 18)}px`,
            color: element.color ?? '#f4f7fb',
          }}
        >
          {element.kind === 'image' && element.src ? <Image src={element.src} alt="" fill unoptimized /> : element.text}
        </div>
      ))}
    </div>
  );
}

async function parsePresentation(buffer: ArrayBuffer): Promise<ParsedSlide[]> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(buffer);
  const parser = new DOMParser();
  const presentationXml = await zip.file('ppt/presentation.xml')?.async('text');
  const presentation = presentationXml ? parser.parseFromString(presentationXml, 'application/xml') : null;
  const sizeNode = presentation?.getElementsByTagNameNS('*', 'sldSz')[0];
  const slideWidth = Number(sizeNode?.getAttribute('cx')) || 12_192_000;
  const slideHeight = Number(sizeNode?.getAttribute('cy')) || 6_858_000;
  const slideFiles = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .toSorted((a, b) => slideNumber(a) - slideNumber(b));

  return Promise.all(slideFiles.map(async (path, slideIndex) => {
    const xml = await zip.file(path)?.async('text') ?? '';
    const slide = parser.parseFromString(xml, 'application/xml');
    const relPath = path.replace('slides/', 'slides/_rels/') + '.rels';
    const relXml = await zip.file(relPath)?.async('text');
    const relationships = new Map<string, string>();
    if (relXml) {
      const rels = parser.parseFromString(relXml, 'application/xml');
      Array.from(rels.getElementsByTagNameNS('*', 'Relationship')).forEach((relationship) => {
        relationships.set(relationship.getAttribute('Id') ?? '', relationship.getAttribute('Target') ?? '');
      });
    }

    const elements: SlideElement[] = [];
    Array.from(slide.getElementsByTagNameNS('*', 'sp')).forEach((shape, index) => {
      const text = Array.from(shape.getElementsByTagNameNS('*', 't')).map((node) => node.textContent ?? '').join(' ').trim();
      if (!text) return;
      const box = readBox(shape, slideWidth, slideHeight);
      const run = shape.getElementsByTagNameNS('*', 'rPr')[0] ?? shape.getElementsByTagNameNS('*', 'defRPr')[0];
      const colorNode = shape.getElementsByTagNameNS('*', 'srgbClr')[0];
      elements.push({ id: `text-${index}`, kind: 'text', text, ...box, fontSize: Number(run?.getAttribute('sz')) / 100 || 18, color: colorNode?.getAttribute('val') ? `#${colorNode.getAttribute('val')}` : undefined });
    });

    await Promise.all(Array.from(slide.getElementsByTagNameNS('*', 'pic')).map(async (picture, index) => {
      const embed = picture.getElementsByTagNameNS('*', 'blip')[0]?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed');
      const target = embed ? relationships.get(embed) : null;
      if (!target) return;
      const normalized = `ppt/${target.replace('../', '')}`;
      const asset = zip.file(normalized);
      if (!asset) return;
      const blob = await asset.async('blob');
      elements.push({ id: `image-${index}`, kind: 'image', src: URL.createObjectURL(blob), ...readBox(picture, slideWidth, slideHeight) });
    }));

    const title = elements.find((element) => element.kind === 'text')?.text?.slice(0, 80) || `Slide ${slideIndex + 1}`;
    return { id: `slide-${slideIndex + 1}`, title, elements };
  }));
}

function readBox(node: Element, slideWidth: number, slideHeight: number) {
  const transform = node.getElementsByTagNameNS('*', 'xfrm')[0];
  const offset = transform?.getElementsByTagNameNS('*', 'off')[0];
  const extent = transform?.getElementsByTagNameNS('*', 'ext')[0];
  return {
    x: (Number(offset?.getAttribute('x')) / slideWidth) * 100 || 6,
    y: (Number(offset?.getAttribute('y')) / slideHeight) * 100 || 6,
    width: (Number(extent?.getAttribute('cx')) / slideWidth) * 100 || 88,
    height: (Number(extent?.getAttribute('cy')) / slideHeight) * 100 || 12,
  };
}

function slideNumber(path: string) {
  return Number(path.match(/slide(\d+)\.xml/)?.[1] ?? 0);
}
