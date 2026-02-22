import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  pdfUrl: string;
  alt: string;
  className?: string;
  /** Render width in px (approx). Smaller = faster. */
  width?: number;
};

const memCache = new Map<string, string>();

function normalizeUrl(u: string) {
  try {
    // Support relative urls (e.g. /yiyu-think-tank-website/docs/a.pdf)
    return new URL(u, typeof window !== 'undefined' ? window.location.origin : 'https://example.com').toString();
  } catch {
    return u;
  }
}

function storageKey(url: string, width: number) {
  return `yiyu_pdfcover:v1:${width}:${url}`;
}

async function renderFirstPageToDataUrl(pdfUrl: string, width: number) {
  // Dynamic import to avoid inflating initial bundle.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Ensure worker is configured (CDN). This is simplest for GitHub Pages.
  // If you later want to bundle worker locally, we can switch to Vite worker import.
  (pdfjs as any).GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.js`;

  const loadingTask = (pdfjs as any).getDocument({ url: pdfUrl });
  const doc = await loadingTask.promise;
  const page = await doc.getPage(1);

  const viewport0 = page.getViewport({ scale: 1 });
  const scale = Math.max(0.2, width / viewport0.width);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('canvas 2d ctx not available');

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  // White background (avoid transparent black on dark theme)
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  // Use jpeg for smaller size
  return canvas.toDataURL('image/jpeg', 0.82);
}

export function PdfCoverImage({ pdfUrl, alt, className, width = 420 }: Props) {
  const normalized = useMemo(() => normalizeUrl(pdfUrl), [pdfUrl]);
  const [src, setSrc] = useState<string | null>(() => {
    if (memCache.has(normalized)) return memCache.get(normalized) ?? null;
    try {
      const k = storageKey(normalized, width);
      const v = localStorage.getItem(k);
      if (v) return v;
    } catch {
      // ignore
    }
    return null;
  });
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!normalized || src || failed) return;

    let cancelled = false;

    const run = async () => {
      try {
        const dataUrl = await renderFirstPageToDataUrl(normalized, width);
        if (cancelled) return;
        memCache.set(normalized, dataUrl);
        try {
          localStorage.setItem(storageKey(normalized, width), dataUrl);
        } catch {
          // ignore quota
        }
        setSrc(dataUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      run();
      return () => {
        cancelled = true;
      };
    }

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { rootMargin: '250px' }
    );

    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [normalized, src, failed, width]);

  return (
    <div ref={ref} className={className}>
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" />
      ) : null}
    </div>
  );
}
