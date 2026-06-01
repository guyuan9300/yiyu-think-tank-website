import { useEffect, useMemo, useRef, useState } from 'react';
// 本地打包 pdf.js worker(避免从 unpkg 加载被 CORS 拦)
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { isIdbPdf, idbPdfId, getPdf } from '../lib/reportPdfStore';

type Props = {
  pdfUrl: string;
  alt: string;
  className?: string;
  /** Render width in px (approx). Smaller = faster. */
  width?: number;
};

type Cover = { url: string; bg: string | null };

const memCache = new Map<string, Cover>();

function normalizeUrl(u: string) {
  if (u.startsWith('idb://')) return u; // IndexedDB 内的 PDF, 原样作 key
  try {
    return new URL(u, typeof window !== 'undefined' ? window.location.origin : 'https://example.com').toString();
  } catch {
    return u;
  }
}

function storageKey(url: string, width: number) {
  return `yiyu_pdfcover:v2:${width}:${url}`;
}

// 纯 JS 边缘采样取主色 = 封面底色(无需模型)。沿四条边取样, 量化分桶取出现最多的色, 返回其平均色。
function dominantEdgeColor(ctx: CanvasRenderingContext2D, w: number, h: number): string | null {
  try {
    const data = ctx.getImageData(0, 0, w, h).data;
    const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
    const sample = (x: number, y: number) => {
      x = Math.max(0, Math.min(w - 1, x));
      y = Math.max(0, Math.min(h - 1, y));
      const i = (y * w + x) * 4;
      if (data[i + 3] === 0) return; // 跳过透明
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const e = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += r; e.g += g; e.b += b;
      buckets.set(key, e);
    };
    const stepX = Math.max(1, Math.floor(w / 48));
    const stepY = Math.max(1, Math.floor(h / 48));
    for (let x = 0; x < w; x += stepX) { sample(x, 1); sample(x, h - 2); }
    for (let y = 0; y < h; y += stepY) { sample(1, y); sample(w - 2, y); }
    let best: { n: number; r: number; g: number; b: number } | null = null;
    for (const e of buckets.values()) if (!best || e.n > best.n) best = e;
    if (!best) return null;
    return `rgb(${Math.round(best.r / best.n)}, ${Math.round(best.g / best.n)}, ${Math.round(best.b / best.n)})`;
  } catch {
    return null; // getImageData 被跨域污染等情况, 回退到默认底色
  }
}

async function renderFirstPage(pdfUrl: string, width: number): Promise<Cover> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  (pdfjs as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  let docSource: any;
  if (isIdbPdf(pdfUrl)) {
    const blob = await getPdf(idbPdfId(pdfUrl));
    if (!blob) throw new Error('IndexedDB 中无此 PDF');
    docSource = { data: await blob.arrayBuffer() };
  } else {
    docSource = { url: pdfUrl };
  }
  const doc = await (pdfjs as any).getDocument(docSource).promise;
  const page = await doc.getPage(1);

  const viewport0 = page.getViewport({ scale: 1 });
  const scale = Math.max(0.2, width / viewport0.width);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('canvas 2d ctx not available');

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  const bg = dominantEdgeColor(ctx, canvas.width, canvas.height);
  return { url: canvas.toDataURL('image/jpeg', 0.82), bg };
}

// 清除某个 PDF 的封面缓存(替换 PDF 后调用, 让封面重新渲染)
export function clearPdfCoverCache(pdfUrl: string) {
  const norm = normalizeUrl(pdfUrl);
  memCache.delete(norm);
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('yiyu_pdfcover:') && k.includes(norm)) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}

function readCache(normalized: string, width: number): Cover | null {
  if (memCache.has(normalized)) return memCache.get(normalized) ?? null;
  try {
    const v = localStorage.getItem(storageKey(normalized, width));
    if (!v) return null;
    if (v.startsWith('{')) return JSON.parse(v) as Cover;
    return { url: v, bg: null }; // 兼容旧版纯 dataUrl 缓存
  } catch {
    return null;
  }
}

export function PdfCoverImage({ pdfUrl, alt, className, width = 420 }: Props) {
  const normalized = useMemo(() => normalizeUrl(pdfUrl), [pdfUrl]);
  const initial = useMemo(() => readCache(normalized, width), [normalized, width]);
  const [cover, setCover] = useState<Cover | null>(initial);
  const [failed, setFailed] = useState(false);
  // 封面方向: 竖版填满(cover), 横版(PPT 16:9)完整展示(contain) + 底色补偿
  const [fit, setFit] = useState<'cover' | 'contain'>('cover');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!normalized || cover || failed) return;
    let cancelled = false;

    const run = async () => {
      try {
        const result = await renderFirstPage(normalized, width);
        if (cancelled) return;
        memCache.set(normalized, result);
        try { localStorage.setItem(storageKey(normalized, width), JSON.stringify(result)); } catch { /* quota */ }
        setCover(result);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      run();
      return () => { cancelled = true; };
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) { io.disconnect(); run(); }
      },
      { rootMargin: '250px' },
    );
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); };
  }, [normalized, cover, failed, width]);

  return (
    <div ref={ref} className={className} style={fit === 'contain' && cover?.bg ? { background: cover.bg } : undefined}>
      {cover ? (
        <img
          src={cover.url}
          alt={alt}
          loading="lazy"
          onLoad={(e) => {
            const img = e.currentTarget;
            // 明显横版(宽 > 高 * 1.15, 如 16:9 PPT)→ contain 完整展示 + 底色补偿; 否则 cover 填满
            setFit(img.naturalWidth > img.naturalHeight * 1.15 ? 'contain' : 'cover');
          }}
          className={fit === 'contain' ? 'w-full h-full object-contain' : 'w-full h-full object-cover'}
        />
      ) : null}
    </div>
  );
}
