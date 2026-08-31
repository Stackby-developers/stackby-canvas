import { z } from 'zod';

// Column types accepted by the stack-generator prompt.
// "attachment" maps to "multipleAttachment" in the Stackby API; the generator
// uses the shorter form and the orchestrator translates before calling the API.
export const StackGenColumnTypeSchema = z.enum([
  'text', 'multilineText', 'number', 'select', 'multiSelect', 'date',
  'checkbox', 'url', 'email', 'phone', 'rating', 'progress', 'duration',
  'currency', 'percent', 'attachment', 'collaborator',
  'link', 'lookup', 'rollup', 'count', 'formula',
]);
export type StackGenColumnType = z.infer<typeof StackGenColumnTypeSchema>;

const DERIVED_TYPES = new Set<StackGenColumnType>(['lookup', 'rollup', 'count', 'formula']);
const LINK_REQUIRED_TYPES = new Set<StackGenColumnType>(['link', 'lookup', 'rollup', 'count']);

export const StackGenColumnSchema = z
  .object({
    name: z.string().min(1),
    columnType: StackGenColumnTypeSchema,
    options: z.array(z.string()).optional(),
    linkToTableKey: z.string().optional(),
    linkColumnName: z.string().optional(),
    linkedColumnName: z.string().optional(),
    formulaText: z.string().optional(),
  })
  .superRefine((col, ctx) => {
    if (col.columnType === 'formula' && !col.formulaText?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['formulaText'],
        message: `formula column "${col.name}" must have a non-empty formulaText`,
      });
    }
    if (LINK_REQUIRED_TYPES.has(col.columnType) && !col.linkToTableKey?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['linkToTableKey'],
        message: `${col.columnType} column "${col.name}" must have linkToTableKey`,
      });
    }
    if ((col.columnType === 'select' || col.columnType === 'multiSelect') &&
        (!col.options || col.options.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: `${col.columnType} column "${col.name}" must have at least one option`,
      });
    }
    if ((col.columnType === 'lookup' || col.columnType === 'rollup') &&
        (!col.linkedColumnName?.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['linkedColumnName'],
        message: `${col.columnType} column "${col.name}" must have linkedColumnName`,
      });
    }
  });
export type StackGenColumn = z.infer<typeof StackGenColumnSchema>;

// Row field values: primitives, null, arrays (multiSelect), or link references.
const RowFieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string()),
  z.object({ __linkRowKeys: z.array(z.string()) }),
]);

export const StackGenRowSchema = z.object({
  rowKey: z.string().min(1),
  fields: z.record(RowFieldValueSchema),
});
export type StackGenRow = z.infer<typeof StackGenRowSchema>;

const StableKeySchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, {
    message: 'key must be lowercase alphanumeric with hyphens, no leading/trailing hyphens',
  });

export const StackGenTableSchema = z
  .object({
    key: StableKeySchema,
    name: z.string().min(1),
    columns: z.array(StackGenColumnSchema).min(1),
    rows: z.array(StackGenRowSchema),
  })
  .superRefine((table, ctx) => {
    // Row keys must be unique within a table.
    const seen = new Set<string>();
    for (const [i, row] of table.rows.entries()) {
      if (seen.has(row.rowKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rows', i, 'rowKey'],
          message: `Duplicate rowKey "${row.rowKey}" in table "${table.key}"`,
        });
      }
      seen.add(row.rowKey);
    }

    // Derived columns (lookup, rollup, count, formula) must not appear before
    // all link columns. Check that no derived column has a lower index than any
    // link column.
    let firstDerivedIdx = Infinity;
    let lastLinkIdx = -1;
    for (const [i, col] of table.columns.entries()) {
      if (DERIVED_TYPES.has(col.columnType)) firstDerivedIdx = Math.min(firstDerivedIdx, i);
      if (col.columnType === 'link') lastLinkIdx = Math.max(lastLinkIdx, i);
    }
    if (firstDerivedIdx < lastLinkIdx) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['columns'],
        message: `In table "${table.key}", derived columns appear before link columns — reorder so link columns come first`,
      });
    }
  });
export type StackGenTable = z.infer<typeof StackGenTableSchema>;

export const StackGeneratorOutputSchema = z
  .object({
    name: z.string().min(1),
    icon: z.string().min(1),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, { message: 'color must be a 6-digit hex like #RRGGBB' }),
    tables: z.array(StackGenTableSchema).min(3).max(6),
  })
  .superRefine((val, ctx) => {
    const definedKeys = new Set<string>();

    for (const [ti, table] of val.tables.entries()) {
      // Verify all linkToTableKey references point to already-defined tables.
      for (const [ci, col] of table.columns.entries()) {
        if (col.linkToTableKey) {
          if (!definedKeys.has(col.linkToTableKey)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['tables', ti, 'columns', ci, 'linkToTableKey'],
              message: `Table "${table.key}" references linkToTableKey "${col.linkToTableKey}" which is not yet defined — move the target table earlier in the tables array`,
            });
          }
        }
      }

      // Table keys must be unique.
      if (definedKeys.has(table.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tables', ti, 'key'],
          message: `Duplicate table key "${table.key}"`,
        });
      }
      definedKeys.add(table.key);
    }
  });
export type StackGeneratorOutput = z.infer<typeof StackGeneratorOutputSchema>;
