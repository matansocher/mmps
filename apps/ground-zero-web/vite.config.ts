import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: '/ground-zero/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5178,
  },
});
