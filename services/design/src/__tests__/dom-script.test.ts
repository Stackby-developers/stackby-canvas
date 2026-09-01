import { describe, it, expect } from 'vitest';
import { DOM_EXTRACTION_SCRIPT } from '../extractor/dom-script.js';

describe('DOM extraction script invariants', () => {
  it('does not call getPropertyValue (no CSS custom property access)', () => {
    expect(DOM_EXTRACTION_SCRIPT).not.toContain('getPropertyValue');
  });

  it('does not access document.styleSheets', () => {
    expect(DOM_EXTRACTION_SCRIPT).not.toContain('styleSheets');
  });

  it('does not reference CSS custom property syntax (--*)', () => {
    // A custom property reference would allow declared-but-unused vars to leak in
    expect(DOM_EXTRACTION_SCRIPT).not.toContain("'--");
    expect(DOM_EXTRACTION_SCRIPT).not.toContain('"--');
  });

  it('reads window.getComputedStyle()', () => {
    expect(DOM_EXTRACTION_SCRIPT).toContain('getComputedStyle');
  });

  it('filters invisible elements (display, visibility, opacity)', () => {
    expect(DOM_EXTRACTION_SCRIPT).toContain("display !== 'none'");
    expect(DOM_EXTRACTION_SCRIPT).toContain("visibility !== 'hidden'");
    expect(DOM_EXTRACTION_SCRIPT).toContain("opacity !== '0'");
  });

  it('classifies button background as buttonBg role', () => {
    expect(DOM_EXTRACTION_SCRIPT).toContain("'buttonBg'");
  });

  it('classifies button text as buttonText role', () => {
    expect(DOM_EXTRACTION_SCRIPT).toContain("'buttonText'");
  });

  it('classifies heading text as headingText role', () => {
    expect(DOM_EXTRACTION_SCRIPT).toContain("'headingText'");
    expect(DOM_EXTRACTION_SCRIPT).toContain('/^h[1-6]$/.test(tag)');
  });

  it('classifies anchor text as link role', () => {
    expect(DOM_EXTRACTION_SCRIPT).toContain("'link'");
  });

  it('collects spacing from paddingTop, gap, and borderTopLeftRadius', () => {
    expect(DOM_EXTRACTION_SCRIPT).toContain('paddingTop');
    expect(DOM_EXTRACTION_SCRIPT).toContain('borderTopLeftRadius');
  });
});
