import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'apps/savings-web/src/**/*.spec.ts', 'apps/mindloop-web/src/**/*.spec.ts', 'test/eval/**/*.spec.ts'],
    exclude: ['node_modules', 'test/integration'],
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
