const DEFAULT_REQUEST_TIMEOUT_MS = 12000;

function toNumber(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const appConfig = {
  env: import.meta.env.MODE,
  baseUrl: import.meta.env.BASE_URL,
  zhixiaoyun: {
    appId: import.meta.env.VITE_ZHIXIAOYUN_APP_ID || 'your_app_id',
    apiKey: import.meta.env.VITE_ZHIXIAOYUN_API_KEY || 'your_api_key',
    serverURL: import.meta.env.VITE_ZHIXIAOYUN_SERVER_URL || 'https://api.zhixiaoyun.com',
    version: '1.0.0',
  },
  wechat: {
    appId: import.meta.env.VITE_WECHAT_APP_ID || 'your_wechat_app_id',
  },
  requestTimeoutMs: toNumber(import.meta.env.VITE_REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS),
  healthEndpoint: import.meta.env.VITE_HEALTH_ENDPOINT || '/health',
};
