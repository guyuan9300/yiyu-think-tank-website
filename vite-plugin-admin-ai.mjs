/**
 * vite plugin · admin-v2 文章 AI 服务 (本地验收期)
 *
 * 提供端点 (挂在 vite middleware /api/admin-ai/*):
 *   GET  /api/admin-ai/list-articles   拉 yiyu.love 所有 published 文章 + 当前 manifest 状态
 *   GET  /api/admin-ai/manifest        当前 AI 资产 manifest
 *   POST /api/admin-ai/regenerate      启动批量生成任务 (body: { ids?: string[] }), 返回 taskId
 *   GET  /api/admin-ai/task/:taskId    查询任务进度
 *   POST /api/admin-ai/cancel/:taskId  取消正在跑的任务
 *
 * 生成产物:
 *   public/ai-generated/articles/{safe_id}/cover.jpg
 *   public/ai-generated/articles/{safe_id}/illustration-{n}.jpg
 *   public/ai-generated/manifest.json   id → { cover, illustrations[] }
 *
 * 部署生产时: 把本文件逻辑移植到 pg-auth-api.mjs, 由后端跑.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const ARK = 'https://ark.cn-beijing.volces.com';
const TEXT_MODEL = process.env.ARK_TEXT_MODEL || 'doubao-seed-2-0-pro-260215';
const IMAGE_MODEL = process.env.ARK_IMAGE_MODEL || 'doubao-seedream-4-0-250828';
const OUT_DIR = path.join('public', 'ai-generated', 'articles');
const MANIFEST = path.join('public', 'ai-generated', 'manifest.json');
const NEG_PROMPT = 'text, letters, digits, numbers, characters, words, chinese characters, watermark, signature, label, logo, captions, gibberish';

const tasks = new Map(); // taskId → { status, total, done, errors, currentArticleId, currentArticleTitle, currentStep, log, startedAt, finishedAt }

const getKey = () => process.env.ARK_API_KEY;

async function readBody(req) {
  return new Promise((res, rej) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => res(Buffer.concat(chunks).toString('utf8')));
    req.on('error', rej);
  });
}

function json(res, data, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

async function callChat(messages, maxTokens = 200) {
  const r = await fetch(`${ARK}/api/v3/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: TEXT_MODEL, messages, max_tokens: maxTokens, temperature: 0.8 }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`chat ${r.status}: ${JSON.stringify(d).slice(0, 160)}`);
  return d.choices?.[0]?.message?.content?.trim() || '';
}

async function callImage(prompt, size = '1792x1024') {
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${ARK}/api/v3/images/generations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getKey()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: IMAGE_MODEL, prompt, negative_prompt: NEG_PROMPT, size, n: 1, response_format: 'url',
      }),
    });
    const d = await r.json();
    if (r.ok && d.data?.[0]?.url) return d.data[0].url;
    if (r.status === 429) { await new Promise((rr) => setTimeout(rr, 3000)); continue; }
    throw new Error(`image ${r.status}: ${JSON.stringify(d).slice(0, 160)}`);
  }
  throw new Error('image retries exhausted');
}

async function downloadImage(url, filepath) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await fs.writeFile(filepath, buf);
  return buf.length;
}

const fileExists = async (p) => { try { await fs.stat(p); return true; } catch { return false; } };

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?(p|h[1-6]|li|tr|td|br|div)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function extractText(a) {
  if (a.contentText && String(a.contentText).trim().length > 50) return String(a.contentText).slice(0, 4000);
  if (a.content && String(a.content).trim().length > 50) return String(a.content).slice(0, 4000);
  if (a.contentHtml) return stripHtml(a.contentHtml).slice(0, 4000);
  return a.excerpt || '';
}

function splitChapters(text, title) {
  if (/^##?\s+/m.test(text)) {
    const parts = text.split(/(?=^##?\s+)/m).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return parts.slice(0, 5).map((p) => {
        const lines = p.split('\n');
        const t = lines[0].replace(/^##?\s+/, '').trim() || title;
        return { title: t, body: lines.slice(1).join('\n').trim() };
      });
    }
  }
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 40);
  if (paras.length === 0) return [];
  if (paras.length <= 2) return paras.map((p, i) => ({ title: `${title} · ${i + 1}`, body: p }));
  const chunk = Math.ceil(paras.length / 3);
  return [0, 1, 2].map((i) => ({
    title: `${title} · 第 ${i + 1} 部分`,
    body: paras.slice(i * chunk, (i + 1) * chunk).join('\n\n'),
  }));
}

async function makeCoverPrompt(article) {
  const p = await callChat([
    { role: 'system', content: 'You are an editorial art director for a Chinese think-tank. Generate a SHORT English image prompt (under 70 words) for a magazine cover. Style: minimalist abstract editorial, deep navy blue (#16265E) and royal purple (#7C3AED) subtle gradients, modern Chinese aesthetic, generous negative space, magazine cover quality. ABSOLUTELY NO TEXT in image. Return ONLY the prompt.' },
    { role: 'user', content: `Article title: ${article.title}\nTopics: ${(article.topics || []).join(', ')}\nExcerpt: ${(article.excerpt || '').slice(0, 220)}` },
  ], 220);
  return p + '. ABSOLUTELY NO TEXT, NO LETTERS, NO DIGITS, NO CHINESE CHARACTERS, NO WATERMARKS, NO LOGOS.';
}

async function makeIllustrationPrompt(chapter, title, topics) {
  const p = await callChat([
    { role: 'system', content: 'You are a creative director. Given a Chinese article section, generate a SHORT English image prompt (under 60 words) for a photorealistic/cinematic illustration. Style: realistic photography, cinematic lighting, deep navy blue and purple subtle tones, magazine editorial aesthetic. No text in image, no captions, no logos, no faces in extreme closeup. Focus on objects, environments, abstract metaphors made tangible. Return ONLY the prompt.' },
    { role: 'user', content: `Article: ${title}\nTopics: ${(topics || []).join(', ')}\nSection: ${chapter.title}\nContent: ${chapter.body.slice(0, 320)}` },
  ], 180);
  return p + '. Absolutely no text, no letters, no digits, no chinese characters, no watermarks.';
}

async function loadManifest() {
  try { return JSON.parse(await fs.readFile(MANIFEST, 'utf8')); } catch { return {}; }
}

async function saveManifest(m) {
  await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
  await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2), 'utf8');
}

async function processArticle(article, task) {
  task.currentArticleId = article.id;
  task.currentArticleTitle = article.title;
  const safe = article.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dir = path.join(OUT_DIR, safe);
  await fs.mkdir(dir, { recursive: true });

  const manifest = await loadManifest();
  const entry = manifest[article.id] || { id: article.id, title: article.title, illustrations: [] };
  entry.title = article.title;
  manifest[article.id] = entry;

  // Cover
  const coverPath = path.join(dir, 'cover.jpg');
  if (!(await fileExists(coverPath))) {
    task.currentStep = '生成封面 prompt';
    const prompt = await makeCoverPrompt(article);
    task.currentStep = '调豆包生成封面';
    const url = await callImage(prompt);
    task.currentStep = '下载封面';
    await downloadImage(url, coverPath);
    entry.cover = { filename: 'cover.jpg', prompt };
    await saveManifest(manifest);
  }

  // Illustrations
  const text = extractText(article);
  if (text && text.length >= 80) {
    const chapters = splitChapters(text, article.title);
    entry.illustrations = (entry.illustrations || []).slice(0, chapters.length);
    for (let i = 0; i < chapters.length; i++) {
      if (task.status === 'cancelled') return;
      const file = `illustration-${i + 1}.jpg`;
      const fp = path.join(dir, file);
      if (await fileExists(fp)) continue;
      task.currentStep = `章节 ${i + 1}/${chapters.length} prompt`;
      const prompt = await makeIllustrationPrompt(chapters[i], article.title, article.topics);
      task.currentStep = `章节 ${i + 1}/${chapters.length} 配图`;
      const url = await callImage(prompt);
      await downloadImage(url, fp);
      entry.illustrations[i] = { filename: file, prompt, title: chapters[i].title };
      await saveManifest(manifest);
    }
  }
  await saveManifest(manifest);
}

async function runBatchTask(taskId, articleIds) {
  const task = tasks.get(taskId);
  try {
    const r = await fetch('https://yiyu.love/api/content-snapshot', { cache: 'no-store' });
    const snap = await r.json();
    let articles = (snap.insights || []).filter((a) => a.status === 'published');
    if (articleIds && articleIds.length > 0) {
      const set = new Set(articleIds);
      articles = articles.filter((a) => set.has(a.id));
    }
    task.total = articles.length;
    task.log.push(`拉到 ${articles.length} 篇 published 文章`);

    for (const article of articles) {
      if (task.status === 'cancelled') { task.log.push('任务已取消'); break; }
      try {
        await processArticle(article, task);
        task.done++;
        task.log.push(`✓ ${article.title}`);
      } catch (e) {
        task.errors++;
        task.log.push(`❌ ${article.title}: ${(e?.message || e).toString().slice(0, 140)}`);
      }
    }
    if (task.status !== 'cancelled') task.status = 'completed';
  } catch (e) {
    task.status = 'failed';
    task.log.push(`致命错误: ${e?.message || e}`);
  } finally {
    task.currentStep = undefined;
    task.currentArticleId = undefined;
    task.currentArticleTitle = undefined;
    task.finishedAt = Date.now();
  }
}

export function adminAiPlugin() {
  return {
    name: 'admin-ai',
    configureServer(server) {
      server.middlewares.use('/api/admin-ai', async (req, res, next) => {
        try {
          const fullUrl = req.url || '';
          const [pathOnly] = fullUrl.split('?');
          const method = (req.method || 'GET').toUpperCase();

          if (pathOnly === '/list-articles' && method === 'GET') {
            const r = await fetch('https://yiyu.love/api/content-snapshot', { cache: 'no-store' });
            if (!r.ok) return json(res, { error: `snapshot ${r.status}` }, 502);
            const snap = await r.json();
            const articles = (snap.insights || []).filter((a) => a.status === 'published');
            const manifest = await loadManifest();
            return json(res, {
              articles: articles.map((a) => ({
                id: a.id,
                title: a.title,
                excerpt: a.excerpt,
                topics: a.topics || [],
                publishDate: a.publishDate,
                originalCoverImage: a.coverImage || null,
                hasAiCover: !!manifest[a.id]?.cover,
                aiIllustrationCount: manifest[a.id]?.illustrations?.length || 0,
              })),
              manifest,
              total: articles.length,
            });
          }

          if (pathOnly === '/manifest' && method === 'GET') {
            return json(res, await loadManifest());
          }

          if (pathOnly === '/regenerate' && method === 'POST') {
            if (!getKey()) return json(res, { error: 'ARK_API_KEY not configured · 请检查 .env.local' }, 500);
            const body = await readBody(req);
            const { ids } = body ? JSON.parse(body) : {};
            const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const task = {
              id: taskId, status: 'running', total: 0, done: 0, errors: 0,
              startedAt: Date.now(), log: [],
            };
            tasks.set(taskId, task);
            // 不 await, 任务后台跑
            runBatchTask(taskId, ids).catch((e) => {
              task.status = 'failed';
              task.log.push(`runBatch 异常: ${e?.message || e}`);
            });
            return json(res, { taskId });
          }

          const taskMatch = pathOnly.match(/^\/task\/(.+)$/);
          if (taskMatch && method === 'GET') {
            const t = tasks.get(taskMatch[1]);
            if (!t) return json(res, { error: 'task not found' }, 404);
            return json(res, t);
          }

          const cancelMatch = pathOnly.match(/^\/cancel\/(.+)$/);
          if (cancelMatch && method === 'POST') {
            const t = tasks.get(cancelMatch[1]);
            if (!t) return json(res, { error: 'task not found' }, 404);
            if (t.status === 'running') { t.status = 'cancelled'; t.log.push('用户请求取消'); }
            return json(res, { ok: true, status: t.status });
          }

          return next();
        } catch (e) {
          console.error('[admin-ai]', e);
          return json(res, { error: e?.message || String(e) }, 500);
        }
      });
    },
  };
}
