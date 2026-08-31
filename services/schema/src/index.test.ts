import { describe, it, expect } from 'vitest';

// Smoke test: the index module exports an app
describe('schema service module', () => {
  it('loads without throwing', async () => {
    const mod = await import('./index.js');
    expect(mod.app).toBeDefined();
    expect(mod.config).toBeDefined();
  });
});
