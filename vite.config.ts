import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // GitHub Pages project site needs a base path like "/<repo>/"
  base: mode === 'production' ? '/yiyu-think-tank-website/' : '/',
  server: {
    port: 5173,
    host: true,
  },
}));
