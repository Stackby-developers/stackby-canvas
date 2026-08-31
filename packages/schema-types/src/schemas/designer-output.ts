import { z } from 'zod';

const ColorTokensSchema = z.object({
  bg: z.string().min(1),
  surface: z.string().min(1),
  'surface-alt': z.string().min(1),
  text: z.string().min(1),
  'text-muted': z.string().min(1),
  accent: z.string().min(1),
  'accent-fg': z.string().min(1),
  border: z.string().min(1),
  success: z.string().min(1),
  warning: z.string().min(1),
  danger: z.string().min(1),
  // Exactly 8 chart colours assigned round-robin to data series (index is stable).
  chart: z.array(z.string().min(1)).length(8),
});
export type ColorTokens = z.infer<typeof ColorTokensSchema>;

const FontTokensSchema = z.object({
  display: z.string().min(1),
  body: z.string().min(1),
  mono: z.string().min(1),
  weights: z.record(z.union([z.string(), z.number()])),
  tracking: z.record(z.string()),
});
export type FontTokens = z.infer<typeof FontTokensSchema>;

const MotionTokensSchema = z.object({
  fast: z.string().min(1),
  base: z.string().min(1),
  slow: z.string().min(1),
  easing: z.string().min(1),
});
export type MotionTokens = z.infer<typeof MotionTokensSchema>;

const RadiusTokensSchema = z.object({
  none: z.literal('0'),
  sm: z.string().min(1),
  md: z.string().min(1),
  lg: z.string().min(1),
  full: z.literal('9999px'),
});
export type RadiusTokens = z.infer<typeof RadiusTokensSchema>;

const ShadowTokensSchema = z.object({
  sm: z.string().min(1),
  md: z.string().min(1),
  lg: z.string().min(1),
});
export type ShadowTokens = z.infer<typeof ShadowTokensSchema>;

export const TokenSetSchema = z.object({
  color: ColorTokensSchema,
  font: FontTokensSchema,
  size: z.record(z.string().min(1)),
  space: z.record(z.string()),
  radius: RadiusTokensSchema,
  shadow: ShadowTokensSchema,
  motion: MotionTokensSchema,
});
export type TokenSet = z.infer<typeof TokenSetSchema>;

const LayoutGrammarSchema = z.object({
  container_max: z.string().min(1),
  grid_columns: z.number().int().positive(),
  gutter: z.string().min(1),
  section_rhythm: z.string().min(1),
  breakpoints: z.object({
    sm: z.number().int().positive(),
    md: z.number().int().positive(),
    lg: z.number().int().positive(),
    xl: z.number().int().positive(),
  }),
});
export type LayoutGrammar = z.infer<typeof LayoutGrammarSchema>;

const ComponentStyleNotesSchema = z.object({
  card: z.string().min(1),
  table: z.string().min(1),
  kpi_tile: z.string().min(1),
  button: z.string().min(1),
  input: z.string().min(1),
});
export type ComponentStyleNotes = z.infer<typeof ComponentStyleNotesSchema>;

export const ContrastReportEntrySchema = z.object({
  pair: z.string().min(1),
  ratio: z.number().nonnegative(),
  passes_aa: z.boolean(),
});
export type ContrastReportEntry = z.infer<typeof ContrastReportEntrySchema>;

export const DesignerOutputSchema = z.object({
  tokens: TokenSetSchema,
  dark_mode: TokenSetSchema,
  layout_grammar: LayoutGrammarSchema,
  component_style_notes: ComponentStyleNotesSchema,
  contrast_report: z.array(ContrastReportEntrySchema).min(1),
});
export type DesignerOutput = z.infer<typeof DesignerOutputSchema>;
