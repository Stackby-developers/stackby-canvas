import { z } from 'zod';

export const ColumnTypeSchema = z.enum([
  'text', 'multilineText', 'number', 'currency', 'percent', 'checkbox',
  'select', 'multiSelect', 'date', 'dateTime', 'duration', 'progress',
  'rating', 'url', 'email', 'phone', 'barcode', 'formula', 'link',
  'lookup', 'rollup', 'count', 'collaborator', 'multiCollaborator',
  'multipleAttachment', 'createdTime', 'lastModifiedTime', 'autoNumber', 'button',
]);
export type ColumnType = z.infer<typeof ColumnTypeSchema>;

export const READ_ONLY_COLUMN_TYPES = new Set<ColumnType>([
  'formula', 'lookup', 'rollup', 'count', 'autoNumber', 'createdTime', 'lastModifiedTime',
]);

export const SelectOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
});
export type SelectOption = z.infer<typeof SelectOptionSchema>;

export const ColumnOptionsSchema = z.object({
  choices: z.array(SelectOptionSchema).optional(),
  linkedTableId: z.string().optional(),
  precision: z.number().optional(),
  symbol: z.string().optional(),
  formula: z.string().optional(),
});

export const ColumnSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ColumnTypeSchema,
  isPrimaryColumn: z.boolean().default(false),
  isReadOnly: z.boolean().default(false),
  description: z.string().optional(),
  options: ColumnOptionsSchema.optional(),
});
export type Column = z.infer<typeof ColumnSchema>;

export const TableSchema = z.object({
  id: z.string(),
  name: z.string(),
  primaryColumnId: z.string(),
  columns: z.array(ColumnSchema),
  rowCount: z.number().int().nonnegative().optional(),
});
export type Table = z.infer<typeof TableSchema>;

export const StackbySchemaGraphSchema = z.object({
  stackId: z.string(),
  stackName: z.string(),
  tables: z.array(TableSchema),
  fetchedAt: z.string().datetime(),
});
export type StackbySchemaGraph = z.infer<typeof StackbySchemaGraphSchema>;

export const SemanticColumnTypeSchema = z.enum([
  'title', 'status', 'date', 'assignee', 'priority', 'amount',
  'url', 'description', 'identifier', 'tag', 'rating', 'attachment', 'other',
]);
export type SemanticColumnType = z.infer<typeof SemanticColumnTypeSchema>;

export const SemanticColumnProfileSchema = z.object({
  columnId: z.string(),
  columnName: z.string(),
  semanticType: SemanticColumnTypeSchema,
  confidence: z.number().min(0).max(1),
  hint: z.string().optional(),
});
export type SemanticColumnProfile = z.infer<typeof SemanticColumnProfileSchema>;

export const PrimaryUseCaseSchema = z.enum([
  'task', 'contact', 'event', 'product', 'document', 'transaction', 'other',
]);
export type PrimaryUseCase = z.infer<typeof PrimaryUseCaseSchema>;

export const SemanticTableProfileSchema = z.object({
  tableId: z.string(),
  tableName: z.string(),
  primaryUseCase: PrimaryUseCaseSchema,
  columns: z.array(SemanticColumnProfileSchema),
});
export type SemanticTableProfile = z.infer<typeof SemanticTableProfileSchema>;

export const SemanticProfileSchema = z.object({
  stackId: z.string(),
  schemaVersion: z.string(),
  tables: z.array(SemanticTableProfileSchema),
  profiledAt: z.string().datetime(),
});
export type SemanticProfile = z.infer<typeof SemanticProfileSchema>;
