import { it, expect } from 'vitest';
import { getPromptVersion, AGENTS } from './index.js';

it('prompts module exports version', () => {
  expect(getPromptVersion()).toBe('0.1.0');
});

it('AGENTS exports all required agents', () => {
  const required = ['intentAnalyzer', 'schemaAnalyzer', 'clarifier', 'planner', 'codeGenerator', 'visualVerifier', 'fixer', 'summariser'];
  for (const name of required) {
    expect(name in AGENTS).toBe(true);
  }
});
