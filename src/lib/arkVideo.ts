const DEFAULT_PROXY = 'http://127.0.0.1:8787';

export async function arkVideoCreate(params: {
  prompt?: string;
  imageUrl?: string;
  model?: string;
  duration?: number | string;
  ratio?: string;
  payload?: Record<string, unknown>;
}, endpoint = `${DEFAULT_PROXY}/api/ark/video/create`) {
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`Ark video create failed: ${resp.status} ${JSON.stringify(data)}`);
  }
  return data;
}

export async function arkVideoStatus(taskId: string, endpoint = `${DEFAULT_PROXY}/api/ark/video/status`) {
  const resp = await fetch(`${endpoint}?task_id=${encodeURIComponent(taskId)}`);
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`Ark video status failed: ${resp.status} ${JSON.stringify(data)}`);
  }
  return data;
}
