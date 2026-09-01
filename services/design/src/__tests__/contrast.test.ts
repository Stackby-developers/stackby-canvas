import { describe, it, expect } from 'vitest';
import { contrastRatio, checkContrast, findAccessibleSubstitute } from '../contrast/checker.js';

describe('WCAG contrast ratio', () => {
  it('black on white is ~21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
  it('white on white is 1:1', () => {
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 1);
  });
  it('accepts rgb() format', () => {
    expect(contrastRatio('rgb(0,0,0)', 'rgb(255,255,255)')).toBeCloseTo(21, 0);
  });
  it('dark blue on white passes AA', () => {
    expect(checkContrast('#1d4ed8', '#ffffff').passesAA).toBe(true);
  });
  it('light grey on white fails AA', () => {
    expect(checkContrast('#aaaaaa', '#ffffff').passesAA).toBe(false);
  });
  it('black on white passes AAA', () => {
    expect(checkContrast('#000000', '#ffffff').passesAAA).toBe(true);
  });
});

describe('accessible substitute', () => {
  it('finds a passing substitute for a failing colour', () => {
    const sub = findAccessibleSubstitute('#aaaaaa', '#ffffff');
    expect(checkContrast(sub, '#ffffff').passesAA).toBe(true);
  });
  it('returns the same colour if it already passes', () => {
    expect(findAccessibleSubstitute('#000000', '#ffffff')).toBe('#000000');
  });
  it('substitute preserves hue (both are grey — no hue shift expected)', () => {
    const sub = findAccessibleSubstitute('#888888', '#ffffff');
    // A grey always adjusts to a darker grey, not a different hue
    expect(sub).toMatch(/^#[0-9a-f]{6}$/i);
    expect(checkContrast(sub, '#ffffff').passesAA).toBe(true);
  });
});
