export async function arkVisionAnalyze(imageUrl: string, text: string, endpoint = 'http://127.0.0.1:8787/api/ark/vision') {
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl, text }),
  });

  if (!resp.ok) {
    throw new Error(`Ark vision failed: ${resp.status} ${await resp.text()}`);
  }

  return await resp.json();
}
