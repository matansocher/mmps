import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base: '/mindloop/',
  plugins: [react(), tailwindcss()],
  resolve: {
    // This app lives in an npm workspace where the root hoists React 18 for
    // other apps. Pin React (and its scheduler) to this workspace's own copy
    // so framer-motion / react-router resolve the same React 19 instance and
    // we don't end up with two Reacts at runtime.
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
  },
  server: {
    port: 5273,
    strictPort: true,
    proxy: {
      '/api/mindloop': 'http://localhost:3111',
    },
  },
})
