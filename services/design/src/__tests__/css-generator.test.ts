import { describe, it, expect } from 'vitest';
import { generateTokensCss } from '../output/css-generator.js';
import type { DesignTokens } from '@stackby/schema-types';

const TOKENS: DesignTokens = {
  id: '00000000-0000-0000-0000-000000000001',
  workspaceId: '00000000-0000-0000-0000-000000000002',
  name: 'Test',
  colors: { background: '#ffffff', surface: '#f8fafc', bodyText: '#1a1a1a' },
  typography: {
    fontFamily: "'Inter', sans-serif",
    fontSize: { base: '1rem', lg: '1.125rem' },
    fontWeight: { normal: '400', bold: '700' },
  },
  spacing: { '4': '16px', '8': '32px' },
  radii: { md: '6px', lg: '12px' },
  version: 1,
  updatedAt: new Date().toISOString(),
};

describe('CSS generator', () => {
  it('produces :root { } block', () => {
    const css = generateTokensCss(TOKENS);
    expect(css).toContain(':root {');
    expect(css.match(/\}/g)?.length).toBeGreaterThan(0);
  });

  it('emits --color-background', () => {
    expect(generateTokensCss(TOKENS)).toContain('--color-background: #ffffff');
  });

  it('emits --font-family', () => {
    expect(generateTokensCss(TOKENS)).toContain("--font-family: 'Inter'");
  });

  it('emits spacing', () => {
    expect(generateTokensCss(TOKENS)).toContain('--spacing-4: 16px');
  });

  it('emits border-radius', () => {
    expect(generateTokensCss(TOKENS)).toContain('--radius-md: 6px');
  });

  it('camelCase keys are kebab-cased in output', () => {
    const tokens: DesignTokens = { ...TOKENS, colors: { bodyText: '#111111' } };
    expect(generateTokensCss(tokens)).toContain('--color-body-text: #111111');
  });

  it('values are concrete — no var() references in output', () => {
    const css = generateTokensCss(TOKENS);
    expect(css).not.toContain('var(--');
  });
});
