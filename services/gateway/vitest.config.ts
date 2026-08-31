import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      thresholds: { lines: 80, branches: 80 },
      include: ['src/**'],
      exclude: ['src/index.ts', 'src/__tests__/**'],
    },
  },
});
