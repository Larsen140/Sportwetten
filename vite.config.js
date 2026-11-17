import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  base: process.env.VITE_BASE || '/', // für GitHub Pages: /<Repository-Name>/
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true, chunkSizeWarningLimit: 800 },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8787' },
  },
});
