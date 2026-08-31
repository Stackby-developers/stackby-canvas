import { describe, it, expect } from 'vitest';
import { buildPrompt, assemblePrompt } from '../assembly/builder.js';
import { AGENTS } from '../index.js';
import { SHARED_PREAMBLE } from '../shared/preamble.js';
import { SDK_DOCS } from '../shared/sdk-docs.js';

describe('prompt assembly', () => {
  it('always starts with shared preamble (cache hit anchor)', () => {
    const result = buildPrompt(AGENTS.intentAnalyzer, {});
    expect(result.startsWith(SHARED_PREAMBLE)).toBe(true);
  });

  it('SDK docs appear before schema (stable before variable)', () => {
    const result = buildPrompt(AGENTS.codeGenerator, { schema: '{"tables": []}' });
    const sdkIdx = result.indexOf(SDK_DOCS.slice(0, 20));
    const schemaIdx = result.indexOf('<stackby_schema>');
    expect(sdkIdx).toBeGreaterThanOrEqual(0);
    expect(schemaIdx).toBeGreaterThanOrEqual(0);
    expect(sdkIdx).toBeLessThan(schemaIdx);
  });

  it('schema appears before plan', () => {
    const result = buildPrompt(AGENTS.codeGenerator, {
      schema: 'schema content',
      plan: 'plan content',
    });
    expect(result.indexOf('<stackby_schema>')).toBeLessThan(result.indexOf('<plan>'));
  });

  it('plan appears before conversation', () => {
    const result = buildPrompt(AGENTS.codeGenerator, {
      plan: 'plan content',
      conversation: 'conversation content',
    });
    expect(result.indexOf('<plan>')).toBeLessThan(result.indexOf('<conversation_history>'));
  });

  it('turn instruction is last segment', () => {
    const result = buildPrompt(AGENTS.codeGenerator, {
      schema: 'schema',
      conversation: 'conv',
      turnInstruction: 'Generate the code NOW',
    });
    const turnIdx = result.lastIndexOf('Generate the code NOW');
    const convIdx = result.indexOf('<conversation_history>');
    expect(convIdx).toBeLessThan(turnIdx);
  });

  it('rejection feedback injected into turn segment', () => {
    const result = buildPrompt(AGENTS.planner, { rejectionFeedback: 'Too many components' });
    expect(result).toContain('Too many components');
  });

  it('all agent prompts are non-empty strings', () => {
    for (const [name, prompt] of Object.entries(AGENTS)) {
      expect(typeof prompt, `${name} should be string`).toBe('string');
      expect(prompt.length, `${name} should not be empty`).toBeGreaterThan(50);
    }
  });

  it('preamble contains UNTRUSTED USER DATA instruction', () => {
    const result = buildPrompt(AGENTS.intentAnalyzer, {});
    expect(result).toContain('UNTRUSTED USER DATA');
  });

  it('omits absent optional segments', () => {
    const result = buildPrompt(AGENTS.summariser, {});
    expect(result).not.toContain('<stackby_schema>');
    expect(result).not.toContain('<plan>');
    expect(result).not.toContain('<conversation_history>');
  });

  it('design tokens segment included when provided', () => {
    const result = buildPrompt(AGENTS.codeGenerator, { tokens: '{"primary": "blue"}' });
    expect(result).toContain('<design_tokens>');
    expect(result).toContain('"primary"');
  });
});
