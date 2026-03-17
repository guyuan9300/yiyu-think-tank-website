import http from 'node:http';
import { execFile } from 'node:child_process';

const PORT = Number(process.env.PG_API_PORT || 8790);
const PGHOST = process.env.PGHOST || '127.0.0.1';
const PGPORT = process.env.PGPORT || '5432';
const PGUSER = process.env.PGUSER || '';
const PGPASSWORD = process.env.PGPASSWORD || '';
const PGDATABASE = process.env.PGDATABASE || 'postgres';

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
    const args = ['-h', PGHOST, '-p', PGPORT, '-U', PGUSER, '-d', PGDATABASE, '-v', 'ON_ERROR_STOP=1', '-c', sql];
    execFile('psql', args, { env, maxBuffer: 40 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

function psqlJson(sql) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, PGPASSWORD };
    const args = ['-h', PGHOST, '-p', PGPORT, '-U', PGUSER, '-d', PGDATABASE, '-At', '-c', `select coalesce(json_agg(t), '[]'::json)::text from (${sql}) t;`];
    execFile('psql', args, { env, maxBuffer: 20 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      try {
        resolve(JSON.parse((stdout || '[]').trim() || '[]'));
      } catch (e) {
        reject(e);
      }
    });
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

function buildUpsert(table, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const cols = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r || {})).filter((k) => k && rHasValue(rows, k)))
  );
  if (!cols.includes('id')) cols.unshift('id');
  const dbCols = cols.map(camelToSnake);

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
    const dbCols = cols.map(camelToSnake);

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
  const validRows = rows.filter((row) => row && row.id);

  if (validRows.length === 0) {
    await runSql(`DELETE FROM ${table};`);
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
    psqlJson("select id,title,publisher,summary,topics,version,format,cover_image as \"coverImage\",file_url as \"fileUrl\",file_size as \"fileSize\",pages,to_char(publish_date,'YYYY-MM-DD') as \"publishDate\",status,show_on_home as \"showOnHome\",views,downloads,created_at as \"createdAt\",updated_at as \"updatedAt\" from reports where status='published' order by publish_date desc nulls last, created_at desc"),
    psqlJson("select id,title,excerpt,content,topics,cover_image as \"coverImage\",to_char(publish_date,'YYYY-MM-DD') as \"publishDate\",status,show_on_home as \"showOnHome\",views,likes,created_at as \"createdAt\",updated_at as \"updatedAt\" from insights where status='published' order by publish_date desc nulls last, created_at desc"),
    psqlJson("select id,title,author,description,abstract,topics,pages,duration,rating,cover_image as \"coverImage\",cover_color as \"coverColor\",file_url as \"fileUrl\",file_size as \"fileSize\",to_char(publish_date,'YYYY-MM-DD') as \"publishDate\",status,show_on_home as \"showOnHome\",views,reviews,created_at as \"createdAt\",updated_at as \"updatedAt\" from books where status='published' order by publish_date desc nulls last, created_at desc"),
    psqlJson('select id,name,type,parent_id as \"parentId\",sort from categories order by sort asc, id asc'),
    psqlJson('select id,name,count from tags order by count desc, name asc'),
    psqlJson("select site_name as \"siteName\",site_logo as \"siteLogo\",site_description as \"siteDescription\",contact_email as \"contactEmail\",contact_phone as \"contactPhone\",seo_title as \"seoTitle\",seo_keywords as \"seoKeywords\",seo_description as \"seoDescription\",allow_registration as \"allowRegistration\",require_invitation as \"requireInvitation\",comment_moderation as \"commentModeration\",about_title as \"aboutTitle\",about_content as \"aboutContent\",team_title as \"teamTitle\",team_members as \"teamMembers\",updated_at as \"updatedAt\",updated_by as \"updatedBy\" from system_settings where id=1"),
    psqlJson("select id,title,excerpt,content,topics,cover_image as \"coverImage\",to_char(publish_date,'YYYY-MM-DD') as \"publishDate\",status,show_on_home as \"showOnHome\",views,likes,created_at as \"createdAt\",updated_at as \"updatedAt\" from methodologies where status='published' order by publish_date desc nulls last, created_at desc").catch(() => []),
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

    if (url.pathname === '/api/content-sync' && req.method === 'POST') {
      const body = await readJsonBody(req);
      await syncKey((body && body.key), (body && body.data));
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ ok: false, error: 'not found' }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  }
});

server.listen(PORT, () => {
  console.log(`[pg-content-api-lite] listening on http://127.0.0.1:${PORT}`);
});
