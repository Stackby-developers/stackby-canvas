import type { ColorSample, ColorRole } from './types.js';

export interface PaletteColor {
  hex: string;
  role: ColorRole;
  frequency: number;
  totalArea: number;
}

/** Parse "rgb(r, g, b)" or "rgba(r, g, b, a)" → {r,g,b,a} */
export function parseRgb(value: string): { r: number; g: number; b: number; a: number } | null {
  const m = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (!m) return null;
  return { r: +m[1]!, g: +m[2]!, b: +m[3]!, a: m[4] !== undefined ? +m[4] : 1 };
}

function toLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  return [
    lr * 0.4124 + lg * 0.3576 + lb * 0.1805,
    lr * 0.2126 + lg * 0.7152 + lb * 0.0722,
    lr * 0.0193 + lg * 0.1192 + lb * 0.9505,
  ];
}

function f(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

export function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const fx = f(x / 0.95047), fy = f(y / 1.00000), fz = f(z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  return xyzToLab(...rgbToXyz(r, g, b));
}

export function deltaLab(lab1: [number, number, number], lab2: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(lab1[0] - lab2[0], 2) +
    Math.pow(lab1[1] - lab2[1], 2) +
    Math.pow(lab1[2] - lab2[2], 2),
  );
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

export function clusterByRole(samples: ColorSample[]): PaletteColor[] {
  const DLAB_THRESHOLD = 12;

  const byRole = new Map<ColorRole, ColorSample[]>();
  for (const s of samples) {
    const list = byRole.get(s.role) ?? [];
    list.push(s);
    byRole.set(s.role, list);
  }

  const palette: PaletteColor[] = [];

  for (const [role, roleSamples] of byRole) {
    const clusters: Array<{
      lab: [number, number, number];
      totalArea: number;
      count: number;
      rgb: [number, number, number];
    }> = [];

    for (const sample of roleSamples) {
      const lab = rgbToLab(sample.r, sample.g, sample.b);
      let nearest: typeof clusters[number] | null = null;
      let nearestDist = Infinity;

      for (const cluster of clusters) {
        const d = deltaLab(lab, cluster.lab);
        if (d < nearestDist) { nearestDist = d; nearest = cluster; }
      }

      if (nearest && nearestDist < DLAB_THRESHOLD) {
        const total = nearest.totalArea + sample.pixelArea;
        nearest.lab = [
          (nearest.lab[0] * nearest.totalArea + lab[0] * sample.pixelArea) / total,
          (nearest.lab[1] * nearest.totalArea + lab[1] * sample.pixelArea) / total,
          (nearest.lab[2] * nearest.totalArea + lab[2] * sample.pixelArea) / total,
        ];
        nearest.rgb = [
          (nearest.rgb[0] * nearest.totalArea + sample.r * sample.pixelArea) / total,
          (nearest.rgb[1] * nearest.totalArea + sample.g * sample.pixelArea) / total,
          (nearest.rgb[2] * nearest.totalArea + sample.b * sample.pixelArea) / total,
        ];
        nearest.totalArea = total;
        nearest.count++;
      } else {
        clusters.push({
          lab,
          totalArea: sample.pixelArea,
          count: 1,
          rgb: [sample.r, sample.g, sample.b],
        });
      }
    }

    const best = clusters.sort((a, b) => b.totalArea - a.totalArea)[0];
    if (best) {
      palette.push({
        hex: rgbToHex(best.rgb[0], best.rgb[1], best.rgb[2]),
        role,
        frequency: best.count,
        totalArea: best.totalArea,
      });
    }
  }

  return palette;
}

export function parseSamples(
  rawColors: Array<{ value: string; role: string; pixelArea: number }>,
): ColorSample[] {
  const samples: ColorSample[] = [];
  for (const raw of rawColors) {
    const parsed = parseRgb(raw.value);
    if (!parsed || parsed.a < 0.1) continue;
    samples.push({ ...parsed, role: raw.role as ColorRole, pixelArea: raw.pixelArea, frequency: 1 });
  }
  return samples;
}
