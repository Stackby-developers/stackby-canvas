function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const expanded = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(expanded, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type WcagLevel = 'AAA' | 'AA' | 'AA Large' | 'Fail';

export function getWcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA Large';
  return 'Fail';
}

export function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(value);
}
