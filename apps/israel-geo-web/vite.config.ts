import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: '/israel-geo/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5178,
    proxy: {
      '/israel-geo/api': 'http://localhost:3000',
    },
  },
});
