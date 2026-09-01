import { describe, it, expect } from 'vitest';
import { generateTailwindPreset } from '../output/tailwind-generator.js';
import type { DesignTokens } from '@stackby/schema-types';

const TOKENS: DesignTokens = {
  id: '00000000-0000-0000-0000-000000000001',
  workspaceId: '00000000-0000-0000-0000-000000000002',
  name: 'Test',
  colors: { background: '#ffffff', buttonBg: '#2563eb' },
  typography: { fontFamily: "'Inter', sans-serif", fontSize: { base: '1rem' }, fontWeight: { normal: '400' } },
  radii: { md: '6px' },
  version: 1,
  updatedAt: new Date().toISOString(),
};

describe('Tailwind preset generator', () => {
  it('exports a default object', () => {
    const p = generateTailwindPreset(TOKENS);
    expect(p).toContain('export default');
    expect(p).toContain('theme:');
  });

  it('color values reference CSS custom properties', () => {
    const p = generateTailwindPreset(TOKENS);
    expect(p).toContain("var(--color-background)");
    expect(p).toContain("var(--color-button-bg)");
  });

  it('fontFamily is an array', () => {
    const p = generateTailwindPreset(TOKENS);
    expect(p).toContain('"Inter"');
    expect(p).toContain('fontFamily');
  });

  it('border-radius values reference CSS custom properties', () => {
    expect(generateTailwindPreset(TOKENS)).toContain("var(--radius-md)");
  });

  it('braces are balanced (valid JS structure)', () => {
    const p = generateTailwindPreset(TOKENS);
    expect(p.match(/{/g)?.length).toBe(p.match(/}/g)?.length);
  });
});
