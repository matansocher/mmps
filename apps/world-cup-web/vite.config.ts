import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/world-cup/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5176,
    proxy: {
      '/api/world-cup': 'http://localhost:3000',
    },
  },
});
