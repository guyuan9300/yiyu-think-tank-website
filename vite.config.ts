import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // 默认部署到根路径（CVM/Nginx）；如需 GitHub Pages 可通过 VITE_BASE 覆盖
  base: mode === 'production' ? (process.env.VITE_BASE || '/') : '/',
  server: {
    port: 5173,
    host: true,
    // dev 模式把 /api 反代到线上 yiyu.love, 让本地开发能直接看到真实的报告/文章数据.
    // production build 不走 proxy, 由部署机 nginx 反代 /api → 本地 pg-auth-api 服务.
    proxy: {
      '/api': {
        target: 'https://yiyu.love',
        changeOrigin: true,
        secure: true,
      },
    },
  },
}));
