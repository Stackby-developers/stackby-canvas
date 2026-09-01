import { describe, it, expect } from 'vitest';
import { parseRgb, rgbToLab, deltaLab, rgbToHex, clusterByRole, parseSamples } from '../extractor/color-cluster.js';
import type { ColorSample } from '../extractor/types.js';

describe('parseRgb', () => {
  it('parses rgb() format', () => {
    expect(parseRgb('rgb(33, 37, 41)')).toEqual({ r: 33, g: 37, b: 41, a: 1 });
  });
  it('parses rgba() format', () => {
    expect(parseRgb('rgba(0,0,0,0.5)')?.a).toBe(0.5);
  });
  it('returns null for invalid input', () => {
    expect(parseRgb('not-a-color')).toBeNull();
    expect(parseRgb('#ffffff')).toBeNull(); // hex not supported; computed styles use rgb
  });
});

describe('CIELAB color space', () => {
  it('black and white have high ΔLAB distance', () => {
    expect(deltaLab(rgbToLab(0, 0, 0), rgbToLab(255, 255, 255))).toBeGreaterThan(50);
  });
  it('similar greys have low ΔLAB distance', () => {
    expect(deltaLab(rgbToLab(200, 200, 200), rgbToLab(205, 205, 205))).toBeLessThan(5);
  });
  it('blue and red have high ΔLAB distance', () => {
    expect(deltaLab(rgbToLab(37, 99, 235), rgbToLab(220, 38, 38))).toBeGreaterThan(40);
  });
});

describe('clusterByRole — computed-styles-only invariant', () => {
  it('all palette output is concrete hex — no var(--*) values', () => {
    const samples: ColorSample[] = [
      { r: 255, g: 255, b: 255, a: 1, role: 'background', pixelArea: 50000, frequency: 1 },
      { r: 33, g: 37, b: 41, a: 1, role: 'bodyText', pixelArea: 10000, frequency: 1 },
    ];
    const palette = clusterByRole(samples);
    for (const p of palette) {
      expect(p.hex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.hex).not.toContain('var(');
      expect(p.hex).not.toContain('--');
    }
  });

  it('clusters visually similar colours by role into one entry', () => {
    const samples: ColorSample[] = [
      { r: 255, g: 255, b: 255, a: 1, role: 'background', pixelArea: 40000, frequency: 1 },
      { r: 253, g: 253, b: 253, a: 1, role: 'background', pixelArea: 10000, frequency: 1 },
    ];
    expect(clusterByRole(samples).filter((p) => p.role === 'background')).toHaveLength(1);
  });

  it('preserves distinct roles', () => {
    const samples: ColorSample[] = [
      { r: 255, g: 255, b: 255, a: 1, role: 'background', pixelArea: 50000, frequency: 1 },
      { r: 33, g: 37, b: 41, a: 1, role: 'bodyText', pixelArea: 10000, frequency: 1 },
      { r: 37, g: 99, b: 235, a: 1, role: 'link', pixelArea: 2000, frequency: 1 },
    ];
    const palette = clusterByRole(samples);
    expect(palette).toHaveLength(3);
    expect(palette.map((p) => p.role)).toContain('link');
  });

  it('parseSamples filters out near-transparent colours (alpha < 0.1)', () => {
    const raw = [
      { value: 'rgba(0, 0, 0, 0.05)', role: 'background', pixelArea: 1000 },
      { value: 'rgb(255, 255, 255)', role: 'background', pixelArea: 5000 },
    ];
    const samples = parseSamples(raw);
    expect(samples).toHaveLength(1);
    expect(samples[0]!.r).toBe(255);
  });

  it('rgbToHex produces correct 6-digit hex', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
    expect(rgbToHex(0, 128, 255)).toBe('#0080ff');
  });
});
