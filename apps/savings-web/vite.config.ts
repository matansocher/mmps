import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: '/savings/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5178,
    proxy: {
      '/api/savings': 'http://localhost:3000',
    },
  },
});
