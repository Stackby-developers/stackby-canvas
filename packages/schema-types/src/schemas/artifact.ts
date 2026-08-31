import { z } from 'zod';

export const ArtifactTypeSchema = z.enum([
  'dashboard', 'portal', 'report', 'form', 'gallery', 'website', 'document', 'presentation',
]);
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

export const ArtifactStatusSchema = z.enum(['draft', 'building', 'ready', 'published', 'failed']);
export type ArtifactStatus = z.infer<typeof ArtifactStatusSchema>;

export const SortDirectionSchema = z.enum(['asc', 'desc']);

export const DataBindingSchema = z.object({
  componentId: z.string(),
  tableId: z.string(),
  tableName: z.string(),
  columnIds: z.array(z.string()),
  filter: z.record(z.unknown()).optional(),
  sort: z
    .array(
      z.object({
        columnId: z.string(),
        direction: SortDirectionSchema,
      }),
    )
    .optional(),
  viewId: z.string().optional(),
});
export type DataBinding = z.infer<typeof DataBindingSchema>;

export const PermissionScopeHashInputSchema = z.object({
  stackId: z.string(),
  userId: z.string(),
  tableIds: z.array(z.string()),
  accessedAt: z.string().datetime(),
});
export type PermissionScopeHashInput = z.infer<typeof PermissionScopeHashInputSchema>;
