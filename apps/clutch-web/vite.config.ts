import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/clutch/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5177,
  },
});
