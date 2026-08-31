import { z } from 'zod';

export const TableRoleSchema = z.enum(['primary', 'supporting', 'reference', 'unused']);
export type TableRole = z.infer<typeof TableRoleSchema>;

export const TableRoleEntrySchema = z.object({
  table_id: z.string(),
  table_name: z.string(),
  role: TableRoleSchema,
  row_count_estimate: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});
export type TableRoleEntry = z.infer<typeof TableRoleEntrySchema>;

export const LinkPathSchema = z.object({
  to_table_id: z.string(),
  via_column_id: z.string(),
  cardinality: z.enum(['one', 'many']),
});
export type LinkPath = z.infer<typeof LinkPathSchema>;

export const AnalysisTableProfileSchema = z.object({
  display_column: z.string(),
  status_column: z.string().nullable(),
  date_columns: z.array(z.string()),
  owner_column: z.string().nullable(),
  image_column: z.string().nullable(),
  measures: z.array(z.string()),
  natural_groupings: z.array(z.string()),
  link_paths: z.array(LinkPathSchema),
});
export type AnalysisTableProfile = z.infer<typeof AnalysisTableProfileSchema>;

export const WarningSeveritySchema = z.enum(['info', 'warn']);

export const DataQualityWarningSchema = z.object({
  severity: WarningSeveritySchema,
  message: z.string(),
});
export type DataQualityWarning = z.infer<typeof DataQualityWarningSchema>;

export const CandidateBindingSchema = z.object({
  purpose: z.string(),
  table_id: z.string(),
  view_id: z.string().nullable(),
  columns: z.array(z.string()),
  filter: z.record(z.unknown()).nullable(),
  sort: z
    .array(z.object({ column_id: z.string(), direction: z.enum(['asc', 'desc']) }))
    .nullable(),
  aggregation: z
    .object({
      group_by: z.array(z.string()),
      measures: z.array(
        z.object({
          column_id: z.string(),
          fn: z.enum(['sum', 'avg', 'min', 'max', 'count', 'countDistinct']),
          alias: z.string(),
        }),
      ),
    })
    .nullable(),
  estimated_rows: z.number().int().nonnegative().max(5000),
  cache_ttl_s: z.number().int().min(1).max(600),
});
export type CandidateBinding = z.infer<typeof CandidateBindingSchema>;

export const SchemaAnalysisSchema = z.object({
  table_roles: z.array(TableRoleEntrySchema),
  semantic_profile: z.record(AnalysisTableProfileSchema),
  candidate_bindings: z.array(CandidateBindingSchema),
  data_quality_warnings: z.array(DataQualityWarningSchema),
  unanswerable: z.array(z.string()),
});
export type SchemaAnalysis = z.infer<typeof SchemaAnalysisSchema>;
