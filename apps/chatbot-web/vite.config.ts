import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/chatbot/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5175,
    proxy: {
      '/api/chatbot': 'http://localhost:3000',
    },
  },
});
