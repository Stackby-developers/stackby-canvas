import { it, expect } from 'vitest';
import { UI_VERSION } from './index.js';

it('ui module loads', () => {
  expect(UI_VERSION).toBeDefined();
});
