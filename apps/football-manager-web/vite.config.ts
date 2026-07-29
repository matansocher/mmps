import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: '/football-manager/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5182,
    proxy: {
      '/api/football-manager': 'http://localhost:3000',
    },
  },
});
