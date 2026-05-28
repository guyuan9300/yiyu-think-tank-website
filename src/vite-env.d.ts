/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ZHIXIAOYUN_APP_ID: string;
  readonly VITE_ZHIXIAOYUN_API_KEY: string;
  readonly VITE_ZHIXIAOYUN_SERVER_URL?: string;
  readonly VITE_WECHAT_APP_ID?: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  readonly VITE_REQUEST_TIMEOUT_MS?: string;
  readonly VITE_HEALTH_ENDPOINT?: string;
  readonly VITE_DEMAND_FORM_ENDPOINT?: string;
  readonly VITE_VOLUNTEER_FORM_ENDPOINT?: string;
  readonly VITE_DEMAND_POOL_SOURCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
