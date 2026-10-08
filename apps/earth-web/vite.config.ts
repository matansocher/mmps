import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, normalizePath } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const require = createRequire(import.meta.url);
const cesiumBuild = normalizePath(path.join(path.dirname(require.resolve('cesium/package.json')), 'Build/Cesium'));
// Drop node_modules/cesium/Build/Cesium/<dir> when copying (the plugin ignores leading `..` segments).
const cesiumStripBase =
  normalizePath(path.relative(r('.'), cesiumBuild))
    .split('/')
    .filter((segment) => segment !== '..').length + 1;
const BASE = '/earth/';
const CESIUM_STATIC = 'cesiumStatic';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: ['Workers', 'ThirdParty', 'Assets', 'Widgets'].map((dir) => ({ src: `${cesiumBuild}/${dir}`, dest: `${CESIUM_STATIC}/${dir}`, rename: { stripBase: cesiumStripBase } })),
    }),
  ],
  resolve: {
    // The workspace root hoists React 18 for other apps; pin this app's React 19 copy.
    dedupe: ['react', 'react-dom'],
    alias: {
      react: r('./node_modules/react'),
      'react-dom': r('./node_modules/react-dom'),
      'react/jsx-runtime': r('./node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': r('./node_modules/react/jsx-dev-runtime'),
      scheduler: r('./node_modules/scheduler'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 6000,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/cesium') || id.includes('node_modules/@cesium') ? 'cesium' : undefined),
      },
    },
  },
  server: {
    port: 5373,
    strictPort: true,
    proxy: {
      '/api/worldly': 'http://localhost:3000',
    },
  },
});
