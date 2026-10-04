import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  base: '/zika/',
  plugins: [react()],
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
    port: 5274,
    strictPort: true,
  },
})
