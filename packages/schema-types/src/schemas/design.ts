import { z } from 'zod';

export const ColorScaleSchema = z.record(
  z.string().regex(/^#[0-9a-fA-F]{3,8}$|^(rgb|hsl)/),
);

export const TypographyTokenSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.record(z.string()).optional(),
  fontWeight: z.record(z.union([z.string(), z.number()])).optional(),
  lineHeight: z.record(z.string()).optional(),
  letterSpacing: z.record(z.string()).optional(),
});

export const DesignTokensSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  colors: ColorScaleSchema.optional(),
  typography: TypographyTokenSchema.optional(),
  spacing: z.record(z.string()).optional(),
  radii: z.record(z.string()).optional(),
  shadows: z.record(z.string()).optional(),
  version: z.number().int().nonnegative().default(1),
  updatedAt: z.string().datetime(),
});
export type DesignTokens = z.infer<typeof DesignTokensSchema>;
