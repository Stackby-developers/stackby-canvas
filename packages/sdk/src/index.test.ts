import { it, expect } from 'vitest';
import { SDK_VERSION } from './index.js';

it('sdk module loads and exports version', () => {
  expect(SDK_VERSION).toBe('0.0.1');
});
