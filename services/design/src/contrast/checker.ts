import { parseRgb, rgbToHex } from '../extractor/color-cluster.js';

function relativeLuminance(r: number, g: number, b: number): number {
  const ch = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

function hexToRgbString(hex: string): string {
  const h = hex.replace('#', '');
  return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
}

function parseColor(color: string): { r: number; g: number; b: number } | null {
  const rgb = parseRgb(color) ?? parseRgb(hexToRgbString(color));
  return rgb ? { r: rgb.r, g: rgb.g, b: rgb.b } : null;
}

export function contrastRatio(fg: string, bg: string): number {
  const fgRgb = parseColor(fg);
  const bgRgb = parseColor(bg);
  if (!fgRgb || !bgRgb) return 1;
  const l1 = relativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const l2 = relativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAALarge: boolean;
  passesAAA: boolean;
}

export function checkContrast(fg: string, bg: string): ContrastResult {
  const ratio = contrastRatio(fg, bg);
  return { ratio, passesAA: ratio >= 4.5, passesAALarge: ratio >= 3, passesAAA: ratio >= 7 };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rn ? ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
    : max === gn ? ((bn - rn) / d + 2) * 60
    : ((rn - gn) / d + 4) * 60;
  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/**
 * Find the darkest/lightest variant of `color` that achieves AA contrast against `background`.
 * Preserves hue by adjusting only lightness in HSL space.
 */
export function findAccessibleSubstitute(color: string, background: string, targetRatio = 4.5): string {
  const rgb = parseColor(color);
  if (!rgb) return color;
  if (checkContrast(color, background).ratio >= targetRatio) return color;

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  for (const direction of [-1, 1] as const) {
    let lCurrent = l;
    for (let step = 2; step <= 100; step += 2) {
      lCurrent = Math.max(0, Math.min(100, l + direction * step));
      const [nr, ng, nb] = hslToRgb(h, s, lCurrent);
      const candHex = rgbToHex(nr, ng, nb);
      if (checkContrast(candHex, background).ratio >= targetRatio) {
        return candHex;
      }
    }
  }
  return color;
}
