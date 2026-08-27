import { createServer } from 'node:http';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const PORT = Number(process.env.PORT || 8792);
const DATA_ROOT = process.env.LIBRARY_DATA_ROOT || '/var/www/yiyu-site-data/library-handbook';
const UPLOAD_ROOT = process.env.LIBRARY_UPLOAD_ROOT || '/var/www/yiyu-site-data/uploads/library-handbook';
const MANIFEST_PATH = join(DATA_ROOT, 'manifest.json');
const AUTH_SESSION_URL = process.env.AUTH_SESSION_URL || 'http://127.0.0.1:8791/api/auth/session';
const PUBLIC_PREFIX = '/uploads/library-handbook';
const MAX_BYTES = 64 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.md', '.txt', '.png', '.jpg', '.jpeg', '.webp']);
let manifestLock = Promise.resolve();

await mkdir(DATA_ROOT, { recursive: true });
await mkdir(UPLOAD_ROOT, { recursive: true });

function json(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(payload));
}

async function readManifest() {
  try {
    const parsed = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeManifest(items) {
  const temporary = `${MANIFEST_PATH}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify({ version: 1, items }, null, 2)}\n`, { mode: 0o640 });
  await rename(temporary, MANIFEST_PATH);
}

function updateManifest(mutator) {
  const operation = manifestLock.then(async () => {
    const items = await readManifest();
    const next = await mutator(items);
    await writeManifest(next);
    return next;
  });
  manifestLock = operation.catch(() => {});
  return operation;
}

async function requireAdmin(request, response) {
  const authorization = request.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) { json(response, 401, { ok: false, error: '请先使用管理员账号登录' }); return false; }
  try {
    const session = await fetch(AUTH_SESSION_URL, { headers: { Authorization: authorization } });
    const payload = await session.json();
    const user = payload?.data?.user || payload?.user;
    if (!session.ok || user?.adminRole !== 'admin') { json(response, 403, { ok: false, error: '当前账号没有手册资料管理权限' }); return false; }
    return true;
  } catch {
    json(response, 503, { ok: false, error: '管理员身份服务暂时不可用' });
    return false;
  }
}

function safeOriginalName(value) {
  return basename(value || '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180);
}

async function receiveFile(request, destination) {
  let received = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length;
      callback(received > MAX_BYTES ? new Error('FILE_TOO_LARGE') : null, chunk);
    },
  });
  await pipeline(request, limiter, createWriteStream(destination, { flags: 'wx', mode: 0o640 }));
  return received;
}

async function uploadItem(request, response, url) {
  if (!(await requireAdmin(request, response))) return;
  const originalName = safeOriginalName(url.searchParams.get('filename'));
  const extension = extname(originalName).toLowerCase();
  const volume = Number(url.searchParams.get('volume'));
  const title = (url.searchParams.get('title') || originalName.replace(/\.[^.]+$/, '')).trim().slice(0, 180);
  const declaredLength = Number(request.headers['content-length'] || 0);
  if (!originalName || !ALLOWED_EXTENSIONS.has(extension)) return json(response, 400, { ok: false, error: '不支持该文件类型' });
  if (!Number.isInteger(volume) || volume < 0 || volume > 10) return json(response, 400, { ok: false, error: '分册编号无效' });
  if (!title) return json(response, 400, { ok: false, error: '资料标题不能为空' });
  if (declaredLength > MAX_BYTES) return json(response, 413, { ok: false, error: '单个文件不能超过 64 MB' });

  const savedName = `${Date.now()}-${randomUUID()}${extension}`;
  const destination = join(UPLOAD_ROOT, savedName);
  try {
    const size = await receiveFile(request, destination);
    const item = { id: randomUUID(), volume, title, originalName, savedName, url: `${PUBLIC_PREFIX}/${savedName}`, size, mimeType: request.headers['content-type'] || 'application/octet-stream', uploadedAt: new Date().toISOString() };
    await updateManifest((items) => [item, ...items]);
    json(response, 201, { ok: true, item });
  } catch (error) {
    await unlink(destination).catch(() => {});
    json(response, error.message === 'FILE_TOO_LARGE' ? 413 : 500, { ok: false, error: error.message === 'FILE_TOO_LARGE' ? '单个文件不能超过 64 MB' : '文件保存失败' });
  }
}

async function deleteItem(request, response, id) {
  if (!(await requireAdmin(request, response))) return;
  let removed;
  try {
    await updateManifest((items) => {
      removed = items.find((item) => item.id === id);
      if (!removed) return items;
      return items.filter((item) => item.id !== id);
    });
    if (!removed) return json(response, 404, { ok: false, error: '资料不存在或已经移除' });
    await unlink(join(UPLOAD_ROOT, basename(removed.savedName))).catch((error) => { if (error.code !== 'ENOENT') throw error; });
    json(response, 200, { ok: true });
  } catch {
    json(response, 500, { ok: false, error: '资料移除失败' });
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  try {
    if (request.method === 'GET' && url.pathname === '/healthz') return json(response, 200, { ok: true, service: 'yiyu-library-workspace' });
    if (request.method === 'GET' && url.pathname === '/api/library-handbook/items') {
      const items = await readManifest();
      return json(response, 200, { ok: true, items });
    }
    if (request.method === 'POST' && url.pathname === '/api/library-handbook/items') return uploadItem(request, response, url);
    if (request.method === 'DELETE' && url.pathname.startsWith('/api/library-handbook/items/')) return deleteItem(request, response, decodeURIComponent(url.pathname.slice('/api/library-handbook/items/'.length)));
    json(response, 404, { ok: false, error: 'Not found' });
  } catch (error) {
    console.error(error);
    json(response, 500, { ok: false, error: '服务内部错误' });
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`yiyu-library-workspace listening on 127.0.0.1:${PORT}`));
