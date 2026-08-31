import { z } from 'zod';
import type { FilterCondition } from './types.js';

const FilterOpSchema = z.enum([
  'is',
  'isNot',
  'contains',
  'doesNotContain',
  'isEmpty',
  'isNotEmpty',
  'gt',
  'gte',
  'lt',
  'lte',
  'before',
  'after',
  'onOrBefore',
  'onOrAfter',
  'within',
  'linkedTo',
  'anyOf',
  'allOf',
]);

const RelativeDateSchema = z.enum([
  'today',
  'yesterday',
  'thisWeek',
  'lastWeek',
  'thisMonth',
  'thisQuarter',
  'thisYear',
]);

const FilterValueSchema: z.ZodType<unknown> = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string()),
  RelativeDateSchema,
  z.object({ lastNDays: z.number().int().positive() }),
]);

const LeafSchema = z.object({
  column: z.string(),
  op: FilterOpSchema,
  value: FilterValueSchema.optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FilterConditionSchema: z.ZodType<FilterCondition> = z.lazy((): any =>
  z.union([
    LeafSchema,
    z.object({ and: z.array(FilterConditionSchema) }),
    z.object({ or: z.array(FilterConditionSchema) }),
  ]),
);

export function validateFilter(filter: unknown): FilterCondition {
  return FilterConditionSchema.parse(filter);
}
