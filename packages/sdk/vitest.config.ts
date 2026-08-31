import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: { lines: 80, branches: 75 },
      include: ['src/**'],
      exclude: ['src/__tests__/**', 'src/test-utils/**'],
    },
  },
});
