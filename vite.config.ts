import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // 默认部署到根路径（CVM/Nginx）；如需 GitHub Pages 可通过 VITE_BASE 覆盖
  base: mode === 'production' ? (process.env.VITE_BASE || '/') : '/',
  server: {
    port: 5173,
    host: true,
    // dev 模式 proxy:
    //  /api/admin/ai/* → 火山引擎方舟 (本地直调, 注入 .env.local 里的 ARK_API_KEY)
    //  /api/*         → 线上 yiyu.love (拿真实文章/报告/会员数据)
    // production build 不走任何 proxy, 由部署机 nginx 处理.
    proxy: {
      // ★ 验收期临时直连: admin-v2 模型测试按钮 → 火山引擎方舟
      // 路径 /api/admin/ai/images/generations → https://ark.cn-beijing.volces.com/api/v3/images/generations
      // 路径 /api/admin/ai/chat/completions   → https://ark.cn-beijing.volces.com/api/v3/chat/completions
      // Authorization 由 process.env.ARK_API_KEY 注入 (前端 bundle 完全看不到 key)
      '/api/admin/ai': {
        target: 'https://ark.cn-beijing.volces.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/api\/admin\/ai/, '/api/v3'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            const key = process.env.ARK_API_KEY;
            if (key) {
              proxyReq.setHeader('Authorization', `Bearer ${key}`);
            } else {
              console.warn('[ark-proxy] ⚠️ ARK_API_KEY 未设置, 请检查 .env.local');
            }
          });
          proxy.on('error', (err) => {
            console.error('[ark-proxy] error:', err.message);
          });
        },
      },
      // 普通 /api/* → 线上后端 (报告/文章/会员等真实数据)
      '/api': {
        target: 'https://yiyu.love',
        changeOrigin: true,
        secure: true,
      },
    },
  },
}));
