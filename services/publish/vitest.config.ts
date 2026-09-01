import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 10_000,
    coverage: { provider: 'v8', thresholds: { lines: 80, branches: 75 } },
  },
});
