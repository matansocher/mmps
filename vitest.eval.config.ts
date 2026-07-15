import path from 'path';
import { defineConfig } from 'vitest/config';

// Dedicated config for the (token-costing) eval suites. Kept out of `npm test` on purpose —
// run it explicitly with `npm run eval:chatbot`.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/eval/**/*.eval.ts', 'test/eval/**/*.spec.ts'],
    setupFiles: ['test/eval/setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 45 * 60 * 1000,
    // Keep eval files sequential — the harness already parallelizes case runs internally.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@decorators': path.resolve(__dirname, 'src/decorators'),
      '@mocks': path.resolve(__dirname, 'src/core/mocks'),
      '@test': path.resolve(__dirname, 'test'),
    },
  },
});
