import { z } from 'zod';
import { CodeGenOperationSchema } from './codegen-output.js';

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export const SourceRangeSchema = z.object({
  start: z.number().int().positive(),
  end: z.number().int().positive(),
}).refine((r) => r.end >= r.start, {
  message: 'sourceRange.end must be >= sourceRange.start',
});
export type SourceRange = z.infer<typeof SourceRangeSchema>;

export const VisualEditInputSchema = z.object({
  elementPath: z.string().min(1),
  componentFile: z.string().min(1),
  sourceRange: SourceRangeSchema,
  property: z.string().min(1),
  oldValue: z.string().min(1),
  newValue: z.string().min(1),
  availableTokens: z.record(z.string()),
  hasDesignSystem: z.boolean(),
});
export type VisualEditInput = z.infer<typeof VisualEditInputSchema>;

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export const ProposedTokenSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  css_var: z.string().min(1),
});
export type ProposedToken = z.infer<typeof ProposedTokenSchema>;

export const VisualEditOutputSchema = z
  .object({
    operations: z.array(CodeGenOperationSchema),
    token_used: z.string().nullable(),
    token_proposed: ProposedTokenSchema.nullable(),
    responsive_adjustments: z.array(z.string()),
    explanation: z.string().min(1),
  })
  .superRefine((val, ctx) => {
    // token_used and token_proposed are mutually exclusive.
    if (val.token_used !== null && val.token_proposed !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['token_used'],
        message: 'token_used and token_proposed cannot both be non-null',
      });
    }
  });
export type VisualEditOutput = z.infer<typeof VisualEditOutputSchema>;
