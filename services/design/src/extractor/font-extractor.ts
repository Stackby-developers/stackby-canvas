export interface FontSummary {
  family: string;
  role: 'heading' | 'body' | 'mono' | 'ui';
  sizes: number[];
  weights: string[];
  defaultSize: number;
  defaultWeight: string;
}

export function extractFontSummaries(
  rawFonts: Array<{
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    letterSpacing: string;
    pixelArea: number;
    role: string;
  }>,
): FontSummary[] {
  const groups = new Map<string, { samples: typeof rawFonts; totalArea: number }>();

  for (const f of rawFonts) {
    const family = f.fontFamily.split(',')[0]?.replace(/['"]/g, '').trim() ?? f.fontFamily;
    const key = `${family}:${f.role}`;
    const g = groups.get(key) ?? { samples: [], totalArea: 0 };
    g.samples.push(f);
    g.totalArea += f.pixelArea;
    groups.set(key, g);
  }

  const summaries: FontSummary[] = [];
  for (const [key, { samples }] of groups) {
    const [family, role] = key.split(':') as [string, string];
    const sizeMap = new Map<number, number>();
    const weightMap = new Map<string, number>();

    for (const s of samples) {
      const sz = parseFloat(s.fontSize);
      if (!isNaN(sz)) sizeMap.set(sz, (sizeMap.get(sz) ?? 0) + s.pixelArea);
      weightMap.set(s.fontWeight, (weightMap.get(s.fontWeight) ?? 0) + s.pixelArea);
    }

    const sortedSizes = [...sizeMap.entries()].sort((a, b) => b[1] - a[1]);
    const sortedWeights = [...weightMap.entries()].sort((a, b) => b[1] - a[1]);

    summaries.push({
      family,
      role: role as FontSummary['role'],
      sizes: [...sizeMap.keys()].sort((a, b) => a - b),
      weights: [...weightMap.keys()].sort(),
      defaultSize: sortedSizes[0]?.[0] ?? 16,
      defaultWeight: sortedWeights[0]?.[0] ?? '400',
    });
  }

  return summaries.sort((a, b) => {
    const aArea = rawFonts
      .filter((f) => f.fontFamily.includes(a.family))
      .reduce((s, f) => s + f.pixelArea, 0);
    const bArea = rawFonts
      .filter((f) => f.fontFamily.includes(b.family))
      .reduce((s, f) => s + f.pixelArea, 0);
    return bArea - aArea;
  });
}
