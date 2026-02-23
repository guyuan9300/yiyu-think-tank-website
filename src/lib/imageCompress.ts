export type CompressOptions = {
  /** Max output pixel width (maintains aspect ratio). */
  maxWidth: number;
  /** Max output pixel height (maintains aspect ratio). */
  maxHeight: number;
  /** Output mime type. Prefer image/webp if you want smaller size. */
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
  /** 0..1, only used for jpeg/webp. */
  quality?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function canvasToDataUrl(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<string> {
  // Prefer toBlob (async, less memory spikes) then FileReader.
  const q = typeof quality === 'number' ? clamp(quality, 0.1, 1) : undefined;
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('图片压缩失败：toBlob 返回空'))),
      mimeType,
      q,
    );
  });

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片压缩失败：读取 blob 失败'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert an image File into a smaller DataURL via canvas resize + lossy encoding.
 * For static-site MVP where images are stored in localStorage, this is essential.
 */
export async function fileToCompressedDataUrl(file: File, options: CompressOptions): Promise<string> {
  const { maxWidth, maxHeight, mimeType = 'image/jpeg', quality = 0.85 } = options;

  // If it's not an image, fallback to plain DataURL read.
  if (!file.type.startsWith('image/')) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsDataURL(file);
    });
  }

  // Decode
  const bitmap = await createImageBitmap(file);

  // Compute target size while keeping aspect ratio
  const scale = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1);
  const targetW = Math.max(1, Math.round(bitmap.width * scale));
  const targetH = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('图片压缩失败：无法创建 canvas 上下文');

  // Better downscale quality
  ctx.imageSmoothingEnabled = true;
  // @ts-ignore
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(bitmap, 0, 0, targetW, targetH);

  // Release
  try { bitmap.close(); } catch {}

  // Encode
  const dataUrl = await canvasToDataUrl(canvas, mimeType, quality);
  return dataUrl;
}
