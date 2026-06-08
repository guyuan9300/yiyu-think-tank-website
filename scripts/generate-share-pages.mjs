import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'dist');

const buildBase = process.env.VITE_BASE || '/';
const spaBasePath = buildBase === '/' ? '' : buildBase.replace(/\/$/, '');
const shareBaseOrigin = process.env.SHARE_BASE_ORIGIN || (spaBasePath ? 'https://guyuan9300.github.io' : 'http://134.175.96.251');
const baseUrl = `${shareBaseOrigin.replace(/\/$/, '')}${spaBasePath}`;
const baseUrlClean = baseUrl.replace(/\/$/, '');
const contentSnapshotUrl = process.env.CONTENT_SNAPSHOT_URL || 'http://134.175.96.251/api/content-snapshot';

const ORG_NAME = '益语智库';
const SITE_DESC = '益语智库 —— 把战略思想做成 AI 工具的组织陪伴公司，提供战略咨询、组织管理与 AI 工作系统，助力企业持续增长。';

const escapeHtml = (s = '') => String(s)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });

const toAbsUrl = (u) => {
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('/')) return `${baseUrlClean}${u}`;
  return `${baseUrlClean}/${u}`;
};

// Render plain text (may contain newlines) into safe <p> paragraphs.
const renderParagraphs = (text = '') => String(text)
  .split(/\n{1,}/)
  .map((p) => p.trim())
  .filter(Boolean)
  .map((p) => `<p>${escapeHtml(p)}</p>`)
  .join('\n');

const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;

const pageShell = ({ title, description, canonicalUrl, headExtra = '', body }) => `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
${headExtra}
</head>
<body style="font-family: 'Noto Serif SC', 'Songti SC', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; line-height: 1.8; color: #1a1a1a; max-width: 760px; margin: 0 auto;">
${body}
</body>
</html>`;

// ---------------------------------------------------------------------------
// Share content landing pages (with real body text + Article JSON-LD)
// ---------------------------------------------------------------------------

const buildShareHtml = ({ title, description, image, shareUrl, redirectUrl, contentType, bodyHtml, author, publishDate }) => {
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description || '',
    ...(publishDate ? { datePublished: publishDate } : {}),
    author: { '@type': author && author !== ORG_NAME ? 'Person' : 'Organization', name: author || ORG_NAME },
    ...(image ? { image } : {}),
    publisher: {
      '@type': 'Organization',
      name: ORG_NAME,
      logo: { '@type': 'ImageObject', url: toAbsUrl('/yiyu-avatar.png') },
    },
    mainEntityOfPage: shareUrl,
  };

  const headExtra = `  <meta property="og:type" content="${contentType === 'article' ? 'article' : 'website'}" />
${image ? `  <meta property="og:image" content="${escapeHtml(image)}" />\n` : ''}${image ? `  <meta name="twitter:image" content="${escapeHtml(image)}" />\n` : ''}  ${jsonLd(articleLd)}`;

  const metaLine = [author || ORG_NAME, publishDate].filter(Boolean).map(escapeHtml).join(' · ');

  const body = `  <article>
    <h1 style="font-size: 26px; line-height: 1.4; margin: 0 0 12px;">${escapeHtml(title)}</h1>
    ${metaLine ? `<p style="color:#888; font-size:14px; margin:0 0 24px;">${metaLine}</p>` : ''}
    ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" style="max-width:100%;height:auto;border-radius:8px;margin:0 0 24px;" />` : ''}
    <div>
${bodyHtml || `<p>${escapeHtml(description)}</p>`}
    </div>
  </article>
  <hr style="margin:40px 0 24px;border:none;border-top:1px solid #eee;" />
  <p><a href="${escapeHtml(redirectUrl)}" style="color:#0a58ca;font-size:16px;">阅读完整版 →</a></p>
  <p style="color:#aaa;font-size:13px;margin-top:32px;">本文由${ORG_NAME}发布。${ORG_NAME}是把战略思想做成 AI 工具的组织陪伴公司。</p>`;

  // Build full HTML manually to preserve original head structure (title/desc/og/canonical) + article LD.
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="${contentType === 'article' ? 'article' : 'website'}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
${image ? `  <meta property="og:image" content="${escapeHtml(image)}" />\n` : ''}  <meta property="og:url" content="${escapeHtml(shareUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
${image ? `  <meta name="twitter:image" content="${escapeHtml(image)}" />\n` : ''}  <link rel="canonical" href="${escapeHtml(shareUrl)}" />
  ${jsonLd(articleLd)}
</head>
<body style="font-family: 'Noto Serif SC', 'Songti SC', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; line-height: 1.85; color: #1a1a1a; max-width: 760px; margin: 0 auto;">
${body}
</body>
</html>`;
};

async function loadContentSnapshot() {
  try {
    const res = await fetch(contentSnapshotUrl);
    if (!res.ok) {
      throw new Error(`content snapshot ${res.status}`);
    }
    const json = await res.json();
    console.log('[snapshot] fetched OK from', contentSnapshotUrl);
    return json;
  } catch (err) {
    console.warn('[snapshot] fetch FAILED:', err && err.message ? err.message : err);
    try {
      const fallbackInsightsPath = path.join(repoRoot, 'src', 'content', 'defaultInsights.json');
      const insights = JSON.parse(fs.readFileSync(fallbackInsightsPath, 'utf8'));
      console.warn('[snapshot] using local fallback defaultInsights.json (', insights.length, 'insights )');
      return { insights, reports: [], books: [], methodologies: [] };
    } catch (_) {
      console.warn('[snapshot] no fallback available; generating SEO/sitemap/robots skeleton with empty content');
      return { insights: [], reports: [], books: [], methodologies: [] };
    }
  }
}

// Build a share-content entry with full body, tolerating empty fields.
function buildContentEntries(snapshot) {
  const entries = [];

  const pushEntries = (items, contentType, redirectBuilder, bodyBuilder) => {
    for (const item of items || []) {
      try {
        if (!item || !['published', 'parsed'].includes(item.status) || !item.id) continue;
        const slug = String(item.shareSlug || item.id);
        const title = item.shareTitle || item.title || '';
        if (!title) continue;
        const description = item.shareDescription || item.excerpt || item.summary || item.subtitle || item.description || '';
        const bodyHtml = bodyBuilder(item);
        entries.push({
          contentType,
          id: String(item.id),
          slug,
          title,
          description,
          image: toAbsUrl(item.shareImage || item.coverImage || ''),
          redirectUrl: redirectBuilder(item.id),
          bodyHtml,
          author: item.author || ORG_NAME,
          publishDate: item.publishDate || '',
        });
      } catch (e) {
        console.warn('[share] skipped one item due to error:', e && e.message);
      }
    }
  };

  // insights: contentText (plain text) -> paragraphs; fallback excerpt.
  pushEntries(
    snapshot.insights,
    'article',
    (id) => `${spaBasePath}/?page=article&id=${encodeURIComponent(id)}`,
    (item) => renderParagraphs(item.contentText || '') || renderParagraphs(item.excerpt || ''),
  );

  // reports: summary + markdownContent (rendered as plain text paragraphs).
  pushEntries(
    snapshot.reports,
    'report',
    (id) => `${spaBasePath}/?page=report&id=${encodeURIComponent(id)}`,
    (item) => {
      const parts = [];
      if (item.summary) parts.push(renderParagraphs(item.summary));
      if (item.markdownContent) parts.push(renderParagraphs(item.markdownContent));
      return parts.filter(Boolean).join('\n');
    },
  );

  // books: description + abstract.
  pushEntries(
    snapshot.books,
    'book',
    (id) => `${spaBasePath}/?page=book-reader&id=${encodeURIComponent(id)}`,
    (item) => {
      const parts = [];
      if (item.description) parts.push(renderParagraphs(item.description));
      if (item.abstract && item.abstract !== item.description) parts.push(renderParagraphs(item.abstract));
      return parts.filter(Boolean).join('\n');
    },
  );

  // methodologies: contentText; fallback excerpt.
  pushEntries(
    snapshot.methodologies,
    'methodology',
    (id) => `${spaBasePath}/?page=methodology-library&id=${encodeURIComponent(id)}`,
    (item) => renderParagraphs(item.contentText || '') || renderParagraphs(item.excerpt || ''),
  );

  return entries;
}

// ---------------------------------------------------------------------------
// SEO navigation pages: home / articles / reports / about
// ---------------------------------------------------------------------------

function buildSeoPages(snapshot, shareEntries) {
  const pages = [];
  const articleEntries = shareEntries.filter((e) => e.contentType === 'article');
  const reportEntries = shareEntries.filter((e) => e.contentType === 'report');

  const shareLink = (e) => `${baseUrlClean}/share/${e.contentType}/${encodeURIComponent(e.slug)}/`;

  // --- home ---
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORG_NAME,
    url: `${baseUrlClean}/`,
    description: SITE_DESC,
    logo: toAbsUrl('/yiyu-avatar.png'),
  };
  pages.push({
    slug: 'home',
    spaQuery: '',
    title: `${ORG_NAME} | 把战略思想做成 AI 工具的组织陪伴公司`,
    description: SITE_DESC,
    headExtra: `  ${jsonLd(orgLd)}`,
    body: `  <article>
    <h1 style="font-size:28px;margin:0 0 20px;">${ORG_NAME}：把战略思想做成 AI 工具的组织陪伴公司</h1>
    <p>${ORG_NAME}是一家以战略陪伴为核心的组织。我们反对碎片化的 SaaS 工具堆叠，主张用一套连贯的战略思想，通过两种交付路径——专业的战略咨询与可落地的 AI 工作系统——陪伴企业完成从战略到执行的全过程。</p>
    <h2>${ORG_NAME}做什么</h2>
    <ul>
      <li><strong>战略咨询：</strong>${ORG_NAME}与企业一起厘清定位、设计业务、规划增长路径，把模糊的战略意图变成清晰可执行的行动方案。</li>
      <li><strong>组织管理：</strong>${ORG_NAME}帮助组织建立秩序与节奏，让战略真正穿透到团队的日常协作与执行中。</li>
      <li><strong>AI 工作系统：</strong>${ORG_NAME}把沉淀的战略思想与方法论做成 AI 工具，让组织的独特知识经验成为 AI 的支点，用 AI 放大组织的独特价值。</li>
    </ul>
    <h2>为什么选择${ORG_NAME}</h2>
    <p>${ORG_NAME}相信，AI 时代真正的壁垒不是工具本身，而是组织独有的知识、经验与判断。${ORG_NAME}不是卖软件，而是做组织的长期战略陪伴者——一套思想，两种交付路径，持续助力企业增长。</p>
  </article>`,
  });

  // --- articles ---
  const articleList = articleEntries.length
    ? articleEntries.map((e) => `    <li style="margin:0 0 24px;">
      <h2 style="font-size:20px;margin:0 0 6px;"><a href="${escapeHtml(shareLink(e))}" style="color:#1a1a1a;text-decoration:none;">${escapeHtml(e.title)}</a></h2>
      <p style="color:#555;margin:0 0 6px;">${escapeHtml(e.description)}</p>
      <a href="${escapeHtml(shareLink(e))}" style="color:#0a58ca;font-size:14px;">阅读全文 →</a>
    </li>`).join('\n')
    : '    <li><p>文章内容即将上线，敬请期待。</p></li>';
  pages.push({
    slug: 'articles',
    spaQuery: 'articles',
    title: `文章洞察 | ${ORG_NAME}`,
    description: `${ORG_NAME}的深度文章与战略洞察，覆盖战略咨询、组织管理与 AI 工作系统等主题。`,
    headExtra: '',
    body: `  <h1 style="font-size:28px;margin:0 0 24px;">${ORG_NAME} · 文章洞察</h1>
  <ul style="list-style:none;padding:0;">
${articleList}
  </ul>`,
  });

  // --- reports ---
  const reportList = reportEntries.length
    ? reportEntries.map((e) => `    <li style="margin:0 0 24px;">
      <h2 style="font-size:20px;margin:0 0 6px;"><a href="${escapeHtml(shareLink(e))}" style="color:#1a1a1a;text-decoration:none;">${escapeHtml(e.title)}</a></h2>
      <p style="color:#555;margin:0 0 6px;">${escapeHtml(e.description)}</p>
      <a href="${escapeHtml(shareLink(e))}" style="color:#0a58ca;font-size:14px;">查看报告 →</a>
    </li>`).join('\n')
    : '    <li><p>报告内容即将上线，敬请期待。</p></li>';
  pages.push({
    slug: 'reports',
    spaQuery: 'reports',
    title: `研究报告 | ${ORG_NAME}`,
    description: `${ORG_NAME}发布的研究报告与行业分析。`,
    headExtra: '',
    body: `  <h1 style="font-size:28px;margin:0 0 24px;">${ORG_NAME} · 研究报告</h1>
  <ul style="list-style:none;padding:0;">
${reportList}
  </ul>`,
  });

  // --- about ---
  pages.push({
    slug: 'about',
    spaQuery: 'about',
    title: `关于${ORG_NAME} | 战略陪伴与 AI 工作系统`,
    description: `关于${ORG_NAME}：把战略思想做成 AI 工具的组织陪伴公司。`,
    headExtra: `  ${jsonLd(orgLd)}`,
    body: `  <article>
    <h1 style="font-size:28px;margin:0 0 20px;">关于${ORG_NAME}</h1>
    <p>${ORG_NAME}是一家把战略思想做成 AI 工具的组织陪伴公司。我们不做碎片化的工具，而是用一套连贯的战略思想，陪伴企业从战略设计走到组织执行。</p>
    <p>${ORG_NAME}的交付有两条路径：一是面向人的战略咨询，与企业一起厘清定位、设计业务、规划增长；二是面向组织的 AI 工作系统，把沉淀的方法论做成可日常使用的工具，用 AI 放大组织独有的知识与经验。</p>
    <p>${ORG_NAME}相信，组织的长期竞争力来自独特的判断与积累，而不是工具的数量。我们愿意做企业长期的战略陪伴者。</p>
  </article>`,
  });

  return pages;
}

// ---------------------------------------------------------------------------
// sitemap.xml
// ---------------------------------------------------------------------------

function buildSitemap(shareEntries, seoPages) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];
  const push = (loc, changefreq, priority) => {
    urls.push(`  <url>
    <loc>${escapeHtml(loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`);
  };

  push(`${baseUrlClean}/`, 'daily', '1.0');
  for (const p of seoPages) {
    push(`${baseUrlClean}/seo/${p.slug}/`, 'weekly', '0.8');
  }
  for (const e of shareEntries) {
    push(`${baseUrlClean}/share/${e.contentType}/${encodeURIComponent(e.slug)}/`, 'monthly', '0.7');
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

// ---------------------------------------------------------------------------

async function main() {
  ensureDir(distDir);
  const snapshot = await loadContentSnapshot();
  const entries = buildContentEntries(snapshot);

  // 1. Share content landing pages.
  let shareCount = 0;
  for (const entry of entries) {
    try {
      const dir = path.join(distDir, 'share', entry.contentType, entry.slug);
      const shareUrl = `${baseUrlClean}/share/${entry.contentType}/${encodeURIComponent(entry.slug)}/`;
      ensureDir(dir);
      fs.writeFileSync(
        path.join(dir, 'index.html'),
        buildShareHtml({
          title: entry.title,
          description: entry.description,
          image: entry.image,
          shareUrl,
          redirectUrl: entry.redirectUrl,
          contentType: entry.contentType,
          bodyHtml: entry.bodyHtml,
          author: entry.author,
          publishDate: entry.publishDate,
        }),
        'utf8',
      );
      shareCount += 1;
    } catch (e) {
      console.warn('[share] failed to write one page:', e && e.message);
    }
  }
  console.log(`[share] generated ${shareCount} share landing pages`);

  // 2. SEO navigation pages.
  const seoPages = buildSeoPages(snapshot, entries);
  let seoCount = 0;
  for (const p of seoPages) {
    try {
      const dir = path.join(distDir, 'seo', p.slug);
      const canonicalUrl = `${baseUrlClean}/seo/${p.slug}/`;
      ensureDir(dir);
      const backLink = `${spaBasePath}/?page=${encodeURIComponent(p.spaQuery)}`;
      const body = `${p.body}
  <hr style="margin:40px 0 24px;border:none;border-top:1px solid #eee;" />
  <p><a href="${escapeHtml(backLink)}" style="color:#0a58ca;font-size:16px;">进入${ORG_NAME}官网 →</a></p>`;
      fs.writeFileSync(
        path.join(dir, 'index.html'),
        pageShell({
          title: p.title,
          description: p.description,
          canonicalUrl,
          headExtra: p.headExtra,
          body,
        }),
        'utf8',
      );
      seoCount += 1;
    } catch (e) {
      console.warn('[seo] failed to write page', p.slug, ':', e && e.message);
    }
  }
  console.log(`[seo] generated ${seoCount} navigation pages`);

  // 3. sitemap.xml
  try {
    const sitemap = buildSitemap(entries, seoPages);
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');
    const urlCount = (sitemap.match(/<url>/g) || []).length;
    console.log(`[sitemap] generated sitemap.xml with ${urlCount} URLs`);
  } catch (e) {
    console.warn('[sitemap] failed:', e && e.message);
  }

  // 4. robots.txt — emit to dist as well (in case public copy is missing).
  try {
    const robotsPath = path.join(distDir, 'robots.txt');
    if (!fs.existsSync(robotsPath)) {
      fs.writeFileSync(
        robotsPath,
        `User-agent: *\nAllow: /\nSitemap: ${baseUrlClean}/sitemap.xml\n`,
        'utf8',
      );
      console.log('[robots] generated dist/robots.txt (public copy was absent)');
    } else {
      console.log('[robots] dist/robots.txt already present (from public/)');
    }
  } catch (e) {
    console.warn('[robots] failed:', e && e.message);
  }
}

await main();
