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
const contentSnapshotUrl = process.env.CONTENT_SNAPSHOT_URL || 'http://134.175.96.251/api/content-snapshot';

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
  if (u.startsWith('/')) return `${baseUrl.replace(/\/$/, '')}${u}`;
  return `${baseUrl.replace(/\/$/, '')}/${u}`;
};

const buildShareHtml = ({ title, description, image, shareUrl, redirectUrl, contentType }) => `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="${contentType === 'article' ? 'article' : 'website'}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ''}
  <meta property="og:url" content="${escapeHtml(shareUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : ''}
  <link rel="canonical" href="${escapeHtml(shareUrl)}" />
  <script>
    (function(){
      var target = ${JSON.stringify(redirectUrl)};
      setTimeout(function(){
        try { window.location.replace(target); } catch (e) { window.location.href = target; }
      }, 60);
    })();
  </script>
</head>
<body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px;">
  <div style="max-width: 720px; margin: 0 auto;">
    <h1 style="font-size: 18px; margin: 0 0 8px;">正在打开内容…</h1>
    <p style="color:#666; margin:0 0 16px;">若未自动跳转，请点击下面链接。</p>
    <a href="${escapeHtml(redirectUrl)}">继续打开</a>
  </div>
</body>
</html>`;

async function loadContentSnapshot() {
  try {
    const res = await fetch(contentSnapshotUrl);
    if (!res.ok) {
      throw new Error(`content snapshot ${res.status}`);
    }
    return await res.json();
  } catch (_) {
    const fallbackInsightsPath = path.join(repoRoot, 'src', 'content', 'defaultInsights.json');
    const insights = JSON.parse(fs.readFileSync(fallbackInsightsPath, 'utf8'));
    return { insights, reports: [], books: [], methodologies: [] };
  }
}

function buildContentEntries(snapshot) {
  const entries = [];
  const pushEntries = (items, contentType, redirectBuilder) => {
    for (const item of items || []) {
      if (!item || item.status !== 'published' || !item.id) continue;
      const slug = String(item.shareSlug || item.id);
      const description = item.shareDescription || item.excerpt || item.summary || item.subtitle || '';
      const title = item.shareTitle || item.title || '';
      if (!title) continue;
      entries.push({
        contentType,
        id: String(item.id),
        slug,
        title,
        description,
        image: toAbsUrl(item.shareImage || item.coverImage || ''),
        redirectUrl: redirectBuilder(item.id),
      });
    }
  };

  pushEntries(snapshot.insights, 'article', (id) => `${spaBasePath}/?page=article&id=${encodeURIComponent(id)}`);
  pushEntries(snapshot.reports, 'report', (id) => `${spaBasePath}/?page=report&id=${encodeURIComponent(id)}`);
  pushEntries(snapshot.books, 'book', (id) => `${spaBasePath}/?page=book-reader&id=${encodeURIComponent(id)}`);
  pushEntries(snapshot.methodologies, 'methodology', (id) => `${spaBasePath}/?page=methodology-library&id=${encodeURIComponent(id)}`);
  return entries;
}

async function main() {
  ensureDir(distDir);
  const snapshot = await loadContentSnapshot();
  const entries = buildContentEntries(snapshot);
  let count = 0;

  for (const entry of entries) {
    const dir = path.join(distDir, 'share', entry.contentType, entry.slug);
    const shareUrl = `${baseUrl.replace(/\/$/, '')}/share/${entry.contentType}/${encodeURIComponent(entry.slug)}/`;
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
      }),
      'utf8'
    );
    count += 1;
  }

  console.log(`[share] generated ${count} share pages from content snapshot`);
}

await main();
