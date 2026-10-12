import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import { defineConfig } from 'vite';
import { rewindOfflinePlugin } from './pwa-plugin.js';

const require = createRequire(import.meta.url);

export default defineConfig({
  base: '/rewind/',
  plugins: [react(), rewindOfflinePlugin()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: /^react$/, replacement: require.resolve('react') },
      { find: /^react-dom$/, replacement: require.resolve('react-dom') },
      { find: /^react-dom\/client$/, replacement: require.resolve('react-dom/client') },
      { find: /^react\/jsx-runtime$/, replacement: require.resolve('react/jsx-runtime') },
      { find: /^react\/jsx-dev-runtime$/, replacement: require.resolve('react/jsx-dev-runtime') },
    ],
  },
  build: { outDir: 'dist', emptyOutDir: true },
  server: { port: 5275, strictPort: true, proxy: { '/api/rewind': 'http://127.0.0.1:5276' } },
});
