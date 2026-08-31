import { it, expect } from 'vitest';
import { getPromptVersion } from './index.js';

it('prompts module exports version', () => {
  expect(getPromptVersion()).toBe('0.1.0');
});
