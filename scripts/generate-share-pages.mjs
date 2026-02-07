import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'dist');

const baseUrl = process.env.SHARE_BASE_URL || 'https://guyuan9300.github.io/yiyu-think-tank-website';
const spaBasePath = '/yiyu-think-tank-website';

const insightsJsonPath = path.join(repoRoot, 'src', 'content', 'defaultInsights.json');
const insights = JSON.parse(fs.readFileSync(insightsJsonPath, 'utf8'));

const escapeHtml = (s = '') => String(s)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const toAbsUrl = (u) => {
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('/')) return baseUrl.replace(/\/$/, '') + u;
  return baseUrl.replace(/\/$/, '') + '/' + u;
};

const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });

const buildShareHtml = ({ title, description, image, shareUrl, redirectUrl }) => {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <meta property="og:type" content="article" />
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
      // small delay to ensure crawlers read meta
      setTimeout(function(){
        try { window.location.replace(target); } catch (e) { window.location.href = target; }
      }, 60);
    })();
  </script>
</head>
<body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px;">
  <div style="max-width: 720px; margin: 0 auto;">
    <h1 style="font-size: 18px; margin: 0 0 8px;">正在打开文章…</h1>
    <p style="color:#666; margin:0 0 16px;">若未自动跳转，请点击下面链接。</p>
    <a href="${escapeHtml(redirectUrl)}">继续打开</a>
  </div>
</body>
</html>`;
};

const outRoot = path.join(distDir, 'share', 'article');
ensureDir(outRoot);

let count = 0;
for (const a of insights) {
  if (a.status !== 'published') continue;
  if (a.shareEnabled === false) continue;

  const slug = (a.shareSlug || a.id).toString();
  const shareUrl = `${baseUrl.replace(/\/$/, '')}/share/article/${encodeURIComponent(slug)}/`;
  const redirectUrl = `${spaBasePath}/?page=article&id=${encodeURIComponent(a.id)}`;

  const title = a.shareTitle || a.title;
  const description = a.shareDescription || a.excerpt || '';
  const image = toAbsUrl(a.shareImage || a.coverImage || '');

  const dir = path.join(outRoot, slug);
  ensureDir(dir);

  fs.writeFileSync(
    path.join(dir, 'index.html'),
    buildShareHtml({ title, description, image, shareUrl, redirectUrl }),
    'utf8'
  );
  count++;
}

console.log(`[share] generated ${count} article share pages in dist/share/article/*/index.html`);
