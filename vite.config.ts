import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-ignore - .mjs plugin
import { adminAiPlugin } from './vite-plugin-admin-ai.mjs';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // dev 期 admin-v2 文章 AI 服务 (端点 /api/admin-ai/*)
    // 在 vite node 侧调豆包 + 写磁盘到 public/ai-generated/articles/
    adminAiPlugin(),
  ],
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
      // 2026-05-28 移除 /api → yiyu.love 这条 proxy 规则:
      //   原因: vite 内置 http-proxy 跟 yiyu.love 的 TLS 握手反复偶发卡死.
      //   替换: vite-plugin-admin-ai.mjs 用 node 原生 fetch 接管 /api/auth/* 和
      //         /api/content-snapshot 的转发. 其它 /api/* 路径如有需要再加 plugin
      //         middleware. 这样彻底避开 vite proxy 不稳定问题.
    },
  },
}));
