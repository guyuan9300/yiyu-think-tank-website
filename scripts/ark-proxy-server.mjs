import http from 'node:http';

const PORT = Number(process.env.ARK_PROXY_PORT || 8787);
const API_KEY = process.env.ARK_API_KEY;
const BASE_URL = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com';
const MODEL = process.env.ARK_MODEL || 'doubao-seed-2-0-lite-260215';

// 视频接口路径可按火山文档调整
const VIDEO_CREATE_PATH = process.env.ARK_VIDEO_CREATE_PATH || '/api/v3/contents/generations/tasks';
const VIDEO_STATUS_PATH = process.env.ARK_VIDEO_STATUS_PATH || '/api/v3/contents/generations/tasks/:task_id';

if (!API_KEY) {
  console.error('[ark-proxy] Missing ARK_API_KEY');
  process.exit(1);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

async function readJsonBody(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return JSON.parse(body || '{}');
}

async function forwardJson(res, { method = 'POST', path, payload }) {
  const upstream = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const data = await upstream.text();
  res.writeHead(upstream.status, {
    'Content-Type': 'application/json',
    ...corsHeaders,
  });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  // 可选共享密钥闸门:设置了 ARK_PROXY_TOKEN 就强制校验,挡住未授权调用刷火山账单。
  const requiredToken = process.env.ARK_PROXY_TOKEN;
  if (requiredToken && req.headers['x-ark-proxy-token'] !== requiredToken) {
    res.writeHead(401, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  try {
    // 1) 视觉理解（原有）
    if (url.pathname === '/api/ark/vision' && req.method === 'POST') {
      const { imageUrl, text } = await readJsonBody(req);
      if (!imageUrl || !text) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'imageUrl and text are required' }));
        return;
      }

      await forwardJson(res, {
        method: 'POST',
        path: '/api/v3/responses',
        payload: {
          model: MODEL,
          input: [
            {
              role: 'user',
              content: [
                { type: 'input_image', image_url: imageUrl },
                { type: 'input_text', text },
              ],
            },
          ],
        },
      });
      return;
    }

    // 2) 视频任务创建（新）
    if (url.pathname === '/api/ark/video/create' && req.method === 'POST') {
      const body = await readJsonBody(req);

      // 允许外部完整传 payload；未传时按最小字段组装
      const payload = body.payload || {
        model: body.model || MODEL,
        prompt: body.prompt,
        image_url: body.imageUrl,
        duration: body.duration,
        ratio: body.ratio,
      };

      await forwardJson(res, {
        method: 'POST',
        path: VIDEO_CREATE_PATH,
        payload,
      });
      return;
    }

    // 3) 视频任务状态查询（新）
    if (url.pathname === '/api/ark/video/status' && req.method === 'GET') {
      const taskId = url.searchParams.get('task_id');
      if (!taskId) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'task_id is required' }));
        return;
      }

      const path = VIDEO_STATUS_PATH.replace(':task_id', encodeURIComponent(taskId));
      await forwardJson(res, { method: 'GET', path });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'unknown error' }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[ark-proxy] listening on http://127.0.0.1:${PORT}`);
  console.log(`[ark-proxy] video create path: ${VIDEO_CREATE_PATH}`);
  console.log(`[ark-proxy] video status path: ${VIDEO_STATUS_PATH}`);
});
