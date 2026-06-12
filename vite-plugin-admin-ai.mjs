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
const NEG_PROMPT = 'text, any text, letters, words, chinese characters, hanzi, kanji, japanese text, korean text, typography, fonts, glyphs, calligraphy, handwriting, captions, subtitles, signage, sign, signboard, poster text, banner text, book title, newspaper, document, paperwork, labels, packaging text, numbers, digits, watermark, signature, logo, brand name, ui, interface, screen text, gibberish, garbled characters';

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 统一的方舟请求: 重试 + 指数退避 + 超时。
// 重试: 429(限流) / 5xx(服务端) / 网络错误(fetch failed) / 超时; 4xx(key/参数) 不重试。
async function arkFetch(apiPath, body, { tries = 4, timeoutMs = 90000, label = 'ark' } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let r;
    try {
      r = await fetch(`${ARK}${apiPath}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getKey()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      lastErr = new Error(`${label} 网络/超时: ${(e?.message || e).toString().slice(0, 80)}`);
      if (i < tries - 1) { await sleep(2000 * (i + 1)); continue; }
      break;
    }
    clearTimeout(timer);
    const d = await r.json().catch(() => ({}));
    if (r.ok) return d;
    if (r.status === 429 || r.status >= 500) {
      lastErr = new Error(`${label} ${r.status}(限流/服务端)`);
      if (i < tries - 1) { await sleep(2500 * (i + 1)); continue; }
      break;
    }
    throw new Error(`${label} ${r.status}: ${JSON.stringify(d).slice(0, 140)}`); // key/参数错, 不重试
  }
  throw lastErr || new Error(`${label} 重试耗尽`);
}

async function callChat(messages, maxTokens = 200) {
  const d = await arkFetch('/api/v3/chat/completions',
    { model: TEXT_MODEL, messages, max_tokens: maxTokens, temperature: 0.8 },
    { label: 'chat', timeoutMs: 45000 });
  return d.choices?.[0]?.message?.content?.trim() || '';
}

async function callImage(prompt, size = '1792x1024') {
  const d = await arkFetch('/api/v3/images/generations',
    { model: IMAGE_MODEL, prompt, negative_prompt: NEG_PROMPT, size, n: 1, response_format: 'url' },
    { label: 'image', timeoutMs: 120000 });
  const url = d.data?.[0]?.url;
  if (!url) throw new Error('image: 无返回 url');
  return url;
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
    { role: 'system', content: 'You are an editorial art director for a Chinese think-tank. Generate a SHORT English image prompt (under 70 words) for a VERTICAL 3:4 portrait magazine cover (poster composition, balanced for a tall frame). Style: minimalist abstract editorial, deep navy blue (#16265E) and royal purple (#7C3AED) subtle gradients with soft light, refined high-end, modern Chinese aesthetic, generous negative space, premium quality. CRITICAL: the image must be PURELY ABSTRACT shapes/forms/light/texture, OR a clean TEXTLESS photographic object or scene. NEVER depict books, signs, screens, posters, documents, whiteboards, newspapers, labels, packaging, or ANYTHING bearing writing — because any rendered text comes out as garbled characters. Absolutely no text of any language. Return ONLY the prompt.' },
    { role: 'user', content: `Article title: ${article.title}\nTopics: ${(article.topics || []).join(', ')}\nExcerpt: ${(article.excerpt || '').slice(0, 220)}` },
  ], 220);
  return p + '. ABSOLUTELY NO TEXT of any language, no letters, no words, no Chinese/Japanese/Korean characters, no numbers, no signage, no captions, no watermark, no logo, no UI. Pure abstract or textless photographic image only.';
}

async function makeIllustrationPrompt(chapter, title, topics) {
  const p = await callChat([
    { role: 'system', content: 'You are a creative director. Given a Chinese article section, generate a SHORT English image prompt (under 60 words) for a photorealistic/cinematic OR abstract illustration. Style: realistic photography or abstract forms, cinematic lighting, deep navy blue and purple subtle tones, magazine editorial aesthetic. CRITICAL: the image must be PURELY ABSTRACT or a TEXTLESS photographic object/environment. NEVER include books, signs, screens, posters, documents, whiteboards, labels, packaging or ANYTHING bearing writing — rendered text always comes out garbled. No text of any language, no captions, no logos, no faces in extreme closeup. Focus on objects, environments, abstract metaphors made tangible. Return ONLY the prompt.' },
    { role: 'user', content: `Article: ${title}\nTopics: ${(topics || []).join(', ')}\nSection: ${chapter.title}\nContent: ${chapter.body.slice(0, 320)}` },
  ], 180);
  return p + '. ABSOLUTELY NO TEXT of any language, no letters, no words, no Chinese/Japanese/Korean characters, no numbers, no signage, no captions, no watermark, no logo. Pure abstract or textless photographic image only.';
}

async function loadManifest() {
  try { return JSON.parse(await fs.readFile(MANIFEST, 'utf8')); } catch { return {}; }
}

async function saveManifest(m) {
  await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
  await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2), 'utf8');
}

async function processArticle(article, task, force = false) {
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
  if (force || !(await fileExists(coverPath))) {
    task.currentStep = '生成封面 prompt';
    const prompt = await makeCoverPrompt(article);
    task.currentStep = '调豆包生成封面';
    const url = await callImage(prompt, '1080x1440'); // 3:4 竖版封面 (面积更大、更高级)
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
      if (!force && (await fileExists(fp))) continue;
      // 单张插图失败不拖垮整篇: 出错则跳过这张, 继续下一张 (封面已成则整篇仍算成功)
      try {
        task.currentStep = `章节 ${i + 1}/${chapters.length} prompt`;
        const prompt = await makeIllustrationPrompt(chapters[i], article.title, article.topics);
        task.currentStep = `章节 ${i + 1}/${chapters.length} 配图`;
        const url = await callImage(prompt);
        await downloadImage(url, fp);
        entry.illustrations[i] = { filename: file, prompt, title: chapters[i].title };
        await saveManifest(manifest);
      } catch (e) {
        task.log.push(`  · ${article.title} 插图${i + 1}跳过: ${(e?.message || e).toString().slice(0, 80)}`);
      }
    }
  }
  await saveManifest(manifest);
}

async function runBatchTask(taskId, articleIds, force = false) {
  const task = tasks.get(taskId);
  try {
    const snap = await loadSnapshot(); // 优先本地缓存, 不强依赖 yiyu.love (避免"fetch failed"致命错误)
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
        await processArticle(article, task, force);
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

// ============================================================
// M0 · 结构化文本生成 (综述 + 总结) —— 豆包 JSON 输出 → 回写本地缓存。
// 走"结构化输出": response_format=json_object + schema 写进 prompt + 防御性解析/规整。
// ============================================================
async function callChatJson(messages, maxTokens = 900) {
  const d = await arkFetch('/api/v3/chat/completions',
    { model: TEXT_MODEL, messages, max_tokens: maxTokens, temperature: 0.4, response_format: { type: 'json_object' } },
    { label: 'chat-json', timeoutMs: 60000 });
  let raw = (d.choices?.[0]?.message?.content || '').trim();
  raw = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const s = raw.indexOf('{'); const e = raw.lastIndexOf('}');
  if (s >= 0 && e > s) raw = raw.slice(s, e + 1);
  return JSON.parse(raw);
}

async function writeSnapshotCache(snap) {
  await fs.mkdir(path.dirname(SNAPSHOT_CACHE), { recursive: true });
  await fs.writeFile(SNAPSHOT_CACHE, JSON.stringify(snap, null, 2), 'utf8');
}

// 文章 → { overview(综述), summary:{ points[], outline[] } }
async function generateArticleSummary(article) {
  const text = extractText(article);
  const user = [
    `文章标题: ${article.title || ''}`,
    `文章正文(可能已截断):\n${text}`,
    '',
    '请基于以上文章, 严格输出符合下面结构的 JSON, 不要任何额外文字:',
    '{',
    '  "overview": "综述: 这篇文章讲的是什么、核心是什么; 一段话, 80-160 字",',
    '  "summary": {',
    '    "points": ["核心观点, 3-6 条, 每条一句话"],',
    '    "outline": [{ "title": "结构小节标题(指向逻辑结构, 不是页码)", "desc": "一句话说明" }]',
    '  }',
    '}',
    '要求: 中文; 忠于原文、不杜撰; outline 反映文章论述结构, 3-6 节。',
  ].join('\n');
  const obj = await callChatJson([
    { role: 'system', content: '你是益语智库的资深编辑。只输出 JSON。' },
    { role: 'user', content: user },
  ]);
  const overview = String(obj.overview || '').trim();
  const points = Array.isArray(obj?.summary?.points)
    ? obj.summary.points.map((x) => String(x).trim()).filter(Boolean).slice(0, 8) : [];
  const outline = Array.isArray(obj?.summary?.outline)
    ? obj.summary.outline.map((o) => ({ title: String(o?.title || '').trim(), desc: String(o?.desc || '').trim() })).filter((o) => o.title).slice(0, 8) : [];
  return { overview, summary: { points, outline } };
}

async function runSummaryTask(taskId, articleIds) {
  const task = tasks.get(taskId);
  try {
    const snap = await loadSnapshot();
    let targets = (snap.insights || []).filter((a) => a.status === 'published');
    if (articleIds && articleIds.length > 0) {
      const set = new Set(articleIds);
      targets = targets.filter((a) => set.has(a.id));
    }
    task.total = targets.length;
    task.log.push(`待生成综述+总结: ${targets.length} 篇`);
    for (const article of targets) {
      if (task.status === 'cancelled') { task.log.push('任务已取消'); break; }
      task.currentArticleId = article.id;
      task.currentArticleTitle = article.title;
      task.currentStep = '生成综述+总结';
      try {
        const { overview, summary } = await generateArticleSummary(article);
        article.aiOverview = overview;
        article.aiSummary = summary;
        task.done++;
        task.log.push(`✓ ${article.title}`);
      } catch (e) {
        task.errors++;
        task.log.push(`❌ ${article.title}: ${(e?.message || e).toString().slice(0, 140)}`);
      }
    }
    await writeSnapshotCache(snap); // 即使部分失败, 也保存已生成的
    task.log.push('已回写本地缓存 .content-cache/content-snapshot.json');
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

// 通用转发到 yiyu.love (绕过 vite 内置 http-proxy 偶发 TLS 卡死).
// connect-style middleware: req.url 已经 strip 掉注册时的 prefix.
function makeYiyuForwarder(prefix) {
  return async (req, res, next) => {
    if (!req.url) return next();
    try {
      const upstream = `https://yiyu.love${prefix}${req.url}`;
      // 准备 headers: 拷贝 + 删 hop-by-hop
      const headers = { ...req.headers };
      delete headers.host;
      delete headers['content-length'];
      delete headers.connection;

      const init = { method: req.method, headers };
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())) {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        if (chunks.length > 0) init.body = Buffer.concat(chunks);
      }

      const r = await fetch(upstream, init);
      const buf = Buffer.from(await r.arrayBuffer());
      res.statusCode = r.status;
      for (const [k, v] of r.headers.entries()) {
        const lk = k.toLowerCase();
        if (['transfer-encoding', 'connection', 'content-encoding', 'content-length'].includes(lk)) continue;
        try { res.setHeader(k, v); } catch {}
      }
      res.end(buf);
    } catch (e) {
      console.error(`[forward ${prefix}]`, e?.message || e);
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: `upstream yiyu.love unreachable: ${e?.message || e}` }));
    }
  };
}

// 线上→本地 dev: 若存在本地内容缓存(由 scripts/pull-content.mjs 从 yiyu.love 拉取),
// content-snapshot 与 admin-ai 都优先读它 —— 本地无网/线上不可达时仍能用真实文章预览 + 跑 AI。
const SNAPSHOT_CACHE = path.resolve(process.cwd(), '.content-cache/content-snapshot.json');
async function readSnapshotCache() {
  try {
    return JSON.parse(await fs.readFile(SNAPSHOT_CACHE, 'utf8'));
  } catch {
    return null;
  }
}
async function loadSnapshot() {
  const cached = await readSnapshotCache();
  if (cached) return cached;
  const r = await fetch('https://yiyu.love/api/content-snapshot', { cache: 'no-store' });
  if (!r.ok) throw new Error(`snapshot ${r.status}`);
  return r.json();
}

export function adminAiPlugin() {
  return {
    name: 'admin-ai',
    configureServer(server) {
      // 所有 yiyu.love 后端 endpoint 走 plugin (node fetch), 绕过 vite proxy.
      // 注意: /api/admin/ai/* (火山引擎方舟) 仍走 vite proxy (它要注入 ARK_API_KEY).
      server.middlewares.use('/api/auth', makeYiyuForwarder('/api/auth'));
      // dev 预览兜底: 线上 auth-api 还没部署 GET /api/v1/beta/stats 时返回样例数(响应头标
      // X-Content-Source: dev-mock), 让内测计数器在本地能看到样式; 线上端点上线后自动透传真数。
      server.middlewares.use('/api/v1/beta/stats', async (req, res) => {
        try {
          const r = await fetch('https://yiyu.love/api/v1/beta/stats', { cache: 'no-store' });
          if (r.ok) {
            const buf = Buffer.from(await r.arrayBuffer());
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(buf);
            return;
          }
        } catch {}
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-Content-Source', 'dev-mock');
        res.end(JSON.stringify({ applicationCount: 0, downloadCount: 0 }));
      });
      // 发版与反馈控制台:/api/v1/* 转发到同一后端(yiyu.love → cloud_backend)。
      server.middlewares.use('/api/v1', makeYiyuForwarder('/api/v1'));
      server.middlewares.use('/api/content-snapshot', async (req, res, next) => {
        const cached = await readSnapshotCache();
        if (cached) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('X-Content-Source', 'local-cache');
          res.end(JSON.stringify(cached));
          return;
        }
        return makeYiyuForwarder('/api/content-snapshot')(req, res, next);
      });

      server.middlewares.use('/api/admin-ai', async (req, res, next) => {
        try {
          const fullUrl = req.url || '';
          const [pathOnly] = fullUrl.split('?');
          const method = (req.method || 'GET').toUpperCase();

          if (pathOnly === '/list-articles' && method === 'GET') {
            let snap;
            try { snap = await loadSnapshot(); }
            catch (e) { return json(res, { error: `snapshot ${e.message}` }, 502); }
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
            const { ids, force } = body ? JSON.parse(body) : {};
            const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const task = {
              id: taskId, status: 'running', total: 0, done: 0, errors: 0,
              startedAt: Date.now(), log: [],
            };
            tasks.set(taskId, task);
            // 不 await, 任务后台跑 (force=true 时覆盖已有图)
            runBatchTask(taskId, ids, force).catch((e) => {
              task.status = 'failed';
              task.log.push(`runBatch 异常: ${e?.message || e}`);
            });
            return json(res, { taskId });
          }

          if (pathOnly === '/generate-summaries' && method === 'POST') {
            if (!getKey()) return json(res, { error: 'ARK_API_KEY not configured · 请检查 .env.local' }, 500);
            const body = await readBody(req);
            const { ids } = body ? JSON.parse(body) : {};
            const taskId = `sum_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const task = { id: taskId, status: 'running', total: 0, done: 0, errors: 0, startedAt: Date.now(), log: [] };
            tasks.set(taskId, task);
            runSummaryTask(taskId, ids).catch((e) => { task.status = 'failed'; task.log.push(`runSummary 异常: ${e?.message || e}`); });
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
