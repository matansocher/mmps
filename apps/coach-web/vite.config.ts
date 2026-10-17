import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { env } from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: '/coach/',
  plugins: [react(), tailwindcss()],
  resolve: {
    // The workspace root hoists React 18 for other apps; pin this app to its own React 19 copy.
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
    port: Number(env.COACH_WEB_PORT ?? 5174),
    strictPort: true,
    proxy: {
      '/api/coach': env.COACH_API_URL ?? 'http://localhost:3000',
    },
  },
});
