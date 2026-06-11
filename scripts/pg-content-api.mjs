import http from 'node:http';
import { spawn } from 'node:child_process';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const PORT = Number(process.env.PG_API_PORT || 8790);
const PGHOST = process.env.PGHOST || '127.0.0.1';
const PGPORT = process.env.PGPORT || '5432';
const PGUSER = process.env.PGUSER || '';
const PGPASSWORD = process.env.PGPASSWORD || '';
const PGDATABASE = process.env.PGDATABASE || 'postgres';
const SITE_PUBLIC_ROOT = process.env.YIYU_SITE_ROOT || '/var/www/yiyu-site';
const ADMIN_UPLOAD_ROOT = process.env.YIYU_UPLOAD_ROOT || path.join(SITE_PUBLIC_ROOT, 'uploads');
const execFileAsync = promisify(execFile);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function runSql(sql) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, PGPASSWORD };
    const args = ['-h', PGHOST, '-p', PGPORT, '-U', PGUSER, '-d', PGDATABASE, '-v', 'ON_ERROR_STOP=1'];
    const child = spawn('psql', args, { env });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (err) => {
      reject(err);
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `psql exited with code ${code}`));
        return;
      }
      resolve(stdout);
    });

    child.stdin.end(sql);
  });
}

function psqlJson(sql) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, PGPASSWORD };
    const args = ['-h', PGHOST, '-p', PGPORT, '-U', PGUSER, '-d', PGDATABASE, '-At'];
    const child = spawn('psql', args, { env });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (err) => {
      reject(err);
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `psql exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse((stdout || '[]').trim() || '[]'));
      } catch (e) {
        reject(e);
      }
    });

    child.stdin.end(`select coalesce(json_agg(t), '[]'::json)::text from (${sql}) t;`);
  });
}

function escStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function toSql(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (Array.isArray(v)) {
    if (v.length === 0) return 'ARRAY[]::text[]';
    return `ARRAY[${v.map((x) => escStr(x)).join(',')}]`;
  }
  if (typeof v === 'object') return `${escStr(JSON.stringify(v))}::jsonb`;
  return escStr(v);
}

function camelToSnake(s) {
  return s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

// 列名只允许小写字母开头的标识符,挡住通过 JSON key 注入 SQL(如 "id)--")。
function assertSafeIdentifier(name) {
  if (!/^[a-z][a-z0-9_]*$/.test(String(name))) throw new Error(`非法列名: ${name}`);
  return name;
}

// ===== 管理员鉴权(复用 auth-api 同库的 auth_sessions/auth_users) =====
const DEFAULT_ADMIN_EMAILS = new Set(
  String(process.env.AUTH_ADMIN_EMAILS || 'guyuan9300@gmail.com')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function parseBearerToken(req) {
  const auth = String(req.headers.authorization || '');
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

function isAdminRow(row) {
  const email = String(row?.email || '').toLowerCase();
  return row?.admin_role === 'admin' || DEFAULT_ADMIN_EMAILS.has(email);
}

async function findSessionByToken(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  if (!/^[0-9a-f]{64}$/.test(tokenHash)) return null; // tokenHash 必为 64 位 hex,可安全内插
  const rows = await psqlJson(
    `select u.email as email, u.admin_role as "admin_role"
     from auth_sessions s join auth_users u on u.id = s.user_id
     where s.token_hash='${tokenHash}' and s.revoked_at is null
       and (s.expires_at is null or s.expires_at > now()) limit 1`,
  );
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function requireAdmin(req) {
  const token = parseBearerToken(req);
  if (!token) {
    const e = new Error('请先登录');
    e.statusCode = 401;
    throw e;
  }
  const row = await findSessionByToken(token);
  if (!row) {
    const e = new Error('登录状态已失效，请重新登录');
    e.statusCode = 401;
    throw e;
  }
  if (!isAdminRow(row)) {
    const e = new Error('需要管理员权限');
    e.statusCode = 403;
    throw e;
  }
  return row;
}

function buildUpsert(table, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const cols = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r || {})).filter((k) => k && rHasValue(rows, k)))
  );
  if (!cols.includes('id')) cols.unshift('id');
  const dbCols = cols.map(camelToSnake).map(assertSafeIdentifier);

  const values = rows
    .map((r) => `(${cols.map((c) => toSql((r && r[c]))).join(',')})`)
    .join(',\n');

  const updates = dbCols
    .filter((c) => c !== 'id')
    .map((c) => `${c}=EXCLUDED.${c}`)
    .join(',');

  return `INSERT INTO ${table} (${dbCols.join(',')}) VALUES ${values} ON CONFLICT (id) DO UPDATE SET ${updates};`;
}

function rHasValue(rows, key) {
  return rows.some((r) => r && r[key] !== undefined);
}

function hasPlaceholderCover(coverImage) {
  const value = String(coverImage || '').trim();
  return !value || value === 'images/placeholders/document.svg' || value.endsWith('/images/placeholders/document.svg');
}

function resolveUploadPath(fileUrl) {
  const raw = String(fileUrl || '').trim();
  if (!raw) return '';

  let pathname = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      pathname = new URL(raw).pathname;
    } catch {
      return '';
    }
  }

  if (!pathname.startsWith('/uploads/') || !pathname.toLowerCase().endsWith('.pdf')) return '';

  const uploadRoot = path.resolve(ADMIN_UPLOAD_ROOT);
  const resolved = path.resolve(path.join(uploadRoot, decodeURIComponent(pathname.slice('/uploads/'.length))));
  if (resolved !== uploadRoot && !resolved.startsWith(`${uploadRoot}${path.sep}`)) return '';
  return resolved;
}

async function ensureReadableFile(filePath) {
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size <= 0) throw new Error(`file not readable: ${filePath}`);
}

async function renderPdfFirstPageCover(filePath) {
  const coverDir = path.join(ADMIN_UPLOAD_ROOT, 'ai-covers', 'report');
  await fs.mkdir(coverDir, { recursive: true });

  const baseName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const outputPrefix = path.join(coverDir, baseName);
  await execFileAsync('pdftoppm', ['-png', '-f', '1', '-singlefile', filePath, outputPrefix], {
    maxBuffer: 16 * 1024 * 1024,
  });

  const coverPath = `${outputPrefix}.png`;
  await ensureReadableFile(coverPath);
  return `/uploads/ai-covers/report/${path.basename(coverPath)}`;
}

async function ensureReportCover(row) {
  if (!row || !hasPlaceholderCover(row.coverImage)) return row;

  const filePath = resolveUploadPath(row.fileUrl);
  if (!filePath) return row;

  try {
    await ensureReadableFile(filePath);
    return {
      ...row,
      coverImage: await renderPdfFirstPageCover(filePath),
    };
  } catch (error) {
    console.warn(
      `[pg-content-api-lite] failed to render report cover for ${row.id}: ${error instanceof Error ? error.message : String(error)}`
    );
    return row;
  }
}

async function syncKey(key, data) {
  const map = {
    yiyu_reports: 'reports',
    yiyu_insights: 'insights',
    yiyu_methodologies: 'methodologies',
    yiyu_books: 'books',
    yiyu_categories: 'categories',
    yiyu_tags: 'tags',
  };

  if (key === 'yiyu_system_settings') {
    const payload = data || {};
    const row = { ...payload, id: 1 };

    if (Array.isArray(row.seoKeywords) && row.seoKeywords.length === 0) row.seoKeywords = [];
    if (Array.isArray(row.teamMembers)) row.teamMembers = JSON.stringify(row.teamMembers);

    const cols = Object.keys(row);
    const dbCols = cols.map(camelToSnake).map(assertSafeIdentifier);

    const valuesSql = cols
      .map((c) => {
        if (c === 'teamMembers') return `${toSql(row[c])}::jsonb`;
        if (c === 'seoKeywords') {
          if (Array.isArray(row[c]) && row[c].length === 0) return 'ARRAY[]::text[]';
          return toSql(row[c]);
        }
        return toSql(row[c]);
      })
      .join(',');

    const sql = `INSERT INTO system_settings (${dbCols.join(',')}) VALUES (${valuesSql}) ON CONFLICT (id) DO UPDATE SET ${dbCols
      .filter((c) => c !== 'id')
      .map((c) => `${c}=EXCLUDED.${c}`)
      .join(',')};`;
    await runSql(sql);
    return;
  }

  const table = map[key];
  if (!table) throw new Error(`unsupported key: ${key}`);
  const rows = Array.isArray(data) ? data : [];
  let validRows = rows.filter((row) => row && row.id);
  if (table === 'reports') {
    validRows = await Promise.all(validRows.map(ensureReportCover));
  }

  if (validRows.length === 0) {
    // 安全护栏:空数组不再清空整表(防误发/回流空快照擦库)。如确需清空请走显式接口。
    console.warn(`[pg-content-api-lite] sync ${table} 收到空数组,已跳过(不清表)`);
    return;
  }

  const idsSql = validRows.map((row) => escStr(row.id)).join(',');
  await runSql(`DELETE FROM ${table} WHERE id NOT IN (${idsSql});`);

  const sql = buildUpsert(table, validRows);
  if (!sql) return;
  await runSql(sql);
}

async function loadSnapshot() {
  const [reports, insights, books, categories, tags, settings, methodologies] = await Promise.all([
    psqlJson("select id,title,publisher,summary,topics,version,format,cover_image as \"coverImage\",file_url as \"fileUrl\",file_size as \"fileSize\",markdown_content as \"markdownContent\",markdown_url as \"markdownUrl\",pages,to_char(publish_date,'YYYY-MM-DD') as \"publishDate\",status,show_on_home as \"showOnHome\",views,downloads,coalesce(likes,0) as likes,coalesce(favorites_count,0) as \"favoritesCount\",created_at as \"createdAt\",updated_at as \"updatedAt\" from reports where status in ('published','parsed') order by publish_date desc nulls last, created_at desc"),
    psqlJson("select id,title,excerpt,content,content_json as \"contentJson\",content_html as \"contentHtml\",content_text as \"contentText\",file_url as \"fileUrl\",file_size as \"fileSize\",topics,cover_image as \"coverImage\",cover_preset_id as \"coverPresetId\",to_char(publish_date,'YYYY-MM-DD') as \"publishDate\",status,show_on_home as \"showOnHome\",views,likes,coalesce(favorites_count,0) as \"favoritesCount\",created_at as \"createdAt\",updated_at as \"updatedAt\" from insights where status='published' order by publish_date desc nulls last, created_at desc"),
    psqlJson("select id,title,author,description,abstract,topics,pages,duration,rating,cover_image as \"coverImage\",cover_color as \"coverColor\",file_url as \"fileUrl\",file_size as \"fileSize\",to_char(publish_date,'YYYY-MM-DD') as \"publishDate\",status,show_on_home as \"showOnHome\",views,reviews,coalesce(likes,0) as likes,coalesce(favorites_count,0) as \"favoritesCount\",created_at as \"createdAt\",updated_at as \"updatedAt\" from books where status='published' order by publish_date desc nulls last, created_at desc"),
    psqlJson('select id,name,type,parent_id as \"parentId\",sort from categories order by sort asc, id asc'),
    psqlJson('select id,name,count from tags order by count desc, name asc'),
    psqlJson("select site_name as \"siteName\",site_logo as \"siteLogo\",site_description as \"siteDescription\",contact_email as \"contactEmail\",contact_phone as \"contactPhone\",seo_title as \"seoTitle\",seo_keywords as \"seoKeywords\",seo_description as \"seoDescription\",allow_registration as \"allowRegistration\",require_invitation as \"requireInvitation\",comment_moderation as \"commentModeration\",about_title as \"aboutTitle\",about_content as \"aboutContent\",team_title as \"teamTitle\",team_members as \"teamMembers\",updated_at as \"updatedAt\",updated_by as \"updatedBy\" from system_settings where id=1"),
    psqlJson("select id,title,excerpt,content,content_json as \"contentJson\",content_html as \"contentHtml\",content_text as \"contentText\",file_url as \"fileUrl\",file_size as \"fileSize\",topics,cover_image as \"coverImage\",cover_preset_id as \"coverPresetId\",to_char(publish_date,'YYYY-MM-DD') as \"publishDate\",status,show_on_home as \"showOnHome\",views,likes,coalesce(favorites_count,0) as \"favoritesCount\",created_at as \"createdAt\",updated_at as \"updatedAt\" from methodologies where status='published' order by publish_date desc nulls last, created_at desc").catch(() => []),
  ]);

  return {
    ok: true,
    ts: new Date().toISOString(),
    reports,
    insights,
    methodologies,
    books,
    categories,
    tags,
    systemSettings: settings[0] || null,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  try {
    if (url.pathname === '/healthz') {
      await psqlJson('select 1 as ok');
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (url.pathname === '/api/content-snapshot') {
      const payload = await loadSnapshot();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders });
      res.end(JSON.stringify(payload));
      return;
    }

    // 公开的原子下载计数端点:访客下载只 +1 单字段,不再走整集合全量上行覆盖。
    const downloadMatch = url.pathname.match(/^\/api\/content\/report\/([^/]+)\/download$/);
    if (downloadMatch && req.method === 'POST') {
      const reportId = decodeURIComponent(downloadMatch[1]);
      const rows = await psqlJson(
        `with u as (update reports set downloads = coalesce(downloads,0)+1 where id=${escStr(reportId)} returning downloads) select downloads from u`,
      );
      const downloads = Array.isArray(rows) && rows[0] ? rows[0].downloads : null;
      res.writeHead(downloads === null ? 404 : 200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify(downloads === null ? { ok: false, error: 'report not found' } : { ok: true, downloads }));
      return;
    }

    if (url.pathname === '/api/content-sync' && req.method === 'POST') {
      await requireAdmin(req); // 仅管理员可全量同步内容(堵死匿名/访客擦库)
      const body = await readJsonBody(req);
      await syncKey((body && body.key), (body && body.data));
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ ok: false, error: 'not found' }));
  } catch (err) {
    const status = (err && err.statusCode) || 500;
    res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  }
});

server.listen(PORT, () => {
  console.log(`[pg-content-api-lite] listening on http://127.0.0.1:${PORT}`);
});
