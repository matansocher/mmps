import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: '/learner/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5280,
    proxy: {
      '/api/learner': 'http://localhost:3000',
    },
  },
});
