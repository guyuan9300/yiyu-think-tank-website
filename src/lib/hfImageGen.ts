// Hugging Face image generation (client-side; token stored in localStorage)
// NOTE: For production security, move this to a server-side proxy.

export const HF_TOKEN_STORAGE_KEY = 'yiyu_hf_token';
export const HF_MODEL_STORAGE_KEY = 'yiyu_hf_model';

export function getHfToken(): string {
  return localStorage.getItem(HF_TOKEN_STORAGE_KEY) || '';
}

export function setHfToken(token: string) {
  localStorage.setItem(HF_TOKEN_STORAGE_KEY, token.trim());
}

export function getHfModel(): string {
  // SDXL base is a decent default; can be swapped to another HF model later.
  return localStorage.getItem(HF_MODEL_STORAGE_KEY) || 'stabilityai/stable-diffusion-xl-base-1.0';
}

export function setHfModel(model: string) {
  localStorage.setItem(HF_MODEL_STORAGE_KEY, model.trim());
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

export type CoverStyle = 'semi-realistic';

export function buildCoverPrompt(params: {
  title: string;
  excerpt?: string;
  tags?: string[];
  style?: CoverStyle;
}): string {
  const { title, excerpt, tags } = params;

  const tagLine = (tags || []).slice(0, 5).join(', ');

  // Apple-ish editorial, semi-realistic illustration (no text, no logos)
  return [
    'Create a semi-realistic editorial cover illustration for a strategy consulting / think tank website.',
    'Minimal, high-end, modern, clean composition, soft natural light, shallow depth of field, premium feel.',
    'No text, no letters, no logos, no watermarks.',
    'Aspect ratio 16:10, suitable as a website card cover.',
    `Theme/title: ${title}.`,
    excerpt ? `Context: ${excerpt}.` : '',
    tagLine ? `Keywords: ${tagLine}.` : '',
    'Use a coherent color palette with subtle gradients (blue/indigo/violet accents) and lots of whitespace.',
  ].filter(Boolean).join(' ');
}

export async function generateCoverImage(params: {
  title: string;
  excerpt?: string;
  tags?: string[];
}): Promise<string> {
  const token = getHfToken();
  if (!token) {
    throw new Error('缺少 Hugging Face Token（请在后台设置里填写）');
  }

  const model = getHfModel();
  const prompt = buildCoverPrompt({
    title: params.title,
    excerpt: params.excerpt,
    tags: params.tags,
    style: 'semi-realistic',
  });

  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'image/png',
    },
    body: JSON.stringify({
      inputs: prompt,
      // Many models accept parameters; safe defaults.
      parameters: {
        // guidance_scale: 7,
        // num_inference_steps: 30,
      },
      options: {
        wait_for_model: true,
      },
    }),
  });

  if (!resp.ok) {
    let detail = '';
    try {
      const j = await resp.json();
      detail = j?.error || JSON.stringify(j);
    } catch {
      detail = await resp.text();
    }
    throw new Error(`生成失败：${resp.status} ${detail}`);
  }

  const ct = resp.headers.get('content-type') || '';
  if (!ct.startsWith('image/')) {
    const text = await resp.text();
    throw new Error(`生成失败：返回非图片响应：${text.slice(0, 200)}`);
  }

  const blob = await resp.blob();
  return await blobToDataUrl(blob);
}
