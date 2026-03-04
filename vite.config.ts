import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // 默认部署到根路径（CVM/Nginx）；如需 GitHub Pages 可通过 VITE_BASE 覆盖
  base: mode === 'production' ? (process.env.VITE_BASE || '/') : '/',
  server: {
    port: 5173,
    host: true,
  },
}));
