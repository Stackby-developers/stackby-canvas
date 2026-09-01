import type { ExtractedData } from '../extractor/types.js';
import type { DesignTokens } from '@stackby/schema-types';
import { clusterByRole, parseSamples } from '../extractor/color-cluster.js';
import { extractFontSummaries } from '../extractor/font-extractor.js';
import { buildSpacingScale, buildRadiusScale } from '../extractor/spacing-extractor.js';
import { checkContrast, findAccessibleSubstitute } from '../contrast/checker.js';
import { randomUUID } from 'node:crypto';

export interface ContrastWarning {
  pair: string;
  ratio: number;
  suggestion: string;
}

export interface TokensWithMeta extends DesignTokens {
  contrastWarnings: ContrastWarning[];
}

export function buildTokens(
  data: ExtractedData,
  workspaceId: string,
  name = 'Extracted Design System',
  projectId?: string,
  overrides?: Partial<DesignTokens>,
): TokensWithMeta {
  const palette = clusterByRole(data.colors);
  const byRole = Object.fromEntries(palette.map((p) => [p.role, p.hex]));
  const fonts = extractFontSummaries(data.fonts.map((f) => ({
    fontFamily: f.fontFamily,
    fontSize: String(f.fontSize),
    fontWeight: f.fontWeight,
    lineHeight: f.lineHeight,
    letterSpacing: f.letterSpacing,
    pixelArea: f.weightedArea,
    role: f.role,
  })));

  const bodyFont = fonts.find((f) => f.role === 'body') ?? fonts[0];
  const headingFont = fonts.find((f) => f.role === 'heading') ?? bodyFont;

  const colors: Record<string, string> = {
    background: byRole['background'] ?? '#ffffff',
    surface: byRole['surface'] ?? '#f8fafc',
    'body-text': byRole['bodyText'] ?? '#1a1a1a',
    'heading-text': byRole['headingText'] ?? '#111111',
    link: byRole['link'] ?? '#2563eb',
    'button-bg': byRole['buttonBg'] ?? '#2563eb',
    'button-text': byRole['buttonText'] ?? '#ffffff',
    border: byRole['border'] ?? '#e2e8f0',
    ...(overrides?.colors ?? {}),
  };

  // Contrast validation
  const contrastWarnings: ContrastWarning[] = [];
  const textBgPairs: Array<[string, string, string]> = [
    ['body-text', colors['body-text']!, colors['background']!],
    ['heading-text', colors['heading-text']!, colors['background']!],
    ['button-text', colors['button-text']!, colors['button-bg']!],
    ['link', colors['link']!, colors['background']!],
  ];
  for (const [label, fg, bg] of textBgPairs) {
    if (!fg || !bg) continue;
    const result = checkContrast(fg, bg);
    if (!result.passesAA) {
      contrastWarnings.push({
        pair: `${label} on background`,
        ratio: Math.round(result.ratio * 100) / 100,
        suggestion: findAccessibleSubstitute(fg, bg),
      });
    }
  }

  const spacing = buildSpacingScale(data.spacingValues);
  const radii = buildRadiusScale(data.radiusValues);

  const result: TokensWithMeta = {
    id: randomUUID(),
    workspaceId,
    name,
    colors,
    typography: {
      fontFamily: bodyFont
        ? `'${bodyFont.family}', ${bodyFont.role === 'mono' ? 'monospace' : 'sans-serif'}`
        : 'system-ui, sans-serif',
      fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem' },
      fontWeight: {
        normal: bodyFont?.defaultWeight ?? '400',
        medium: '500',
        bold: headingFont?.defaultWeight ?? '700',
      },
    },
    version: 1,
    updatedAt: new Date().toISOString(),
    contrastWarnings,
  };
  if (projectId !== undefined) result.projectId = projectId;
  if (Object.keys(spacing).length > 0) result.spacing = spacing;
  if (Object.keys(radii).length > 0) result.radii = radii;
  return result;
}
