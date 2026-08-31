import { it, expect } from 'vitest';
import { StackbyProvider, validateFilter, StackbyStudioClient } from './index.js';

it('sdk module loads and exports key symbols', () => {
  expect(StackbyProvider).toBeDefined();
  expect(validateFilter).toBeDefined();
  expect(StackbyStudioClient).toBeDefined();
});
