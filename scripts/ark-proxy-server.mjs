import http from 'node:http';

const PORT = Number(process.env.ARK_PROXY_PORT || 8787);
const API_KEY = process.env.ARK_API_KEY;
const BASE_URL = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com';
const MODEL = process.env.ARK_MODEL || 'doubao-seed-2-0-pro-260215';

if (!API_KEY) {
  console.error('[ark-proxy] Missing ARK_API_KEY');
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    res.end();
    return;
  }

  if (req.url !== '/api/ark/vision' || req.method !== 'POST') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { imageUrl, text } = JSON.parse(body || '{}');

    if (!imageUrl || !text) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'imageUrl and text are required' }));
      return;
    }

    const upstream = await fetch(`${BASE_URL}/api/v3/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
    });

    const data = await upstream.text();
    res.writeHead(upstream.status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'unknown error' }));
  }
});

server.listen(PORT, () => {
  console.log(`[ark-proxy] listening on http://127.0.0.1:${PORT}`);
});
