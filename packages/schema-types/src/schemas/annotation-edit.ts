import { z } from 'zod';
import { CodeGenOperationSchema } from './codegen-output.js';
import { VerifierBreakpointSchema } from './visual-verifier.js';

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export const AnnotationAnchorSchema = z.object({
  componentPath: z.string().min(1),
  elementPath: z.string().min(1),
  breakpoint: VerifierBreakpointSchema,
  coordinates: z.object({
    x: z.number().nonnegative(),
    y: z.number().nonnegative(),
  }),
});
export type AnnotationAnchor = z.infer<typeof AnnotationAnchorSchema>;

export const AuthorRoleSchema = z.enum(['owner', 'editor', 'viewer']);
export type AuthorRole = z.infer<typeof AuthorRoleSchema>;

export const AnnotationSchema = z.object({
  annotationId: z.string().min(1),
  anchor: AnnotationAnchorSchema,
  body: z.string().min(1),
  authorRole: AuthorRoleSchema,
});
export type Annotation = z.infer<typeof AnnotationSchema>;

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export const AnnotationStatusSchema = z.enum(['applied', 'needs_input', 'conflicts_with_plan']);
export type AnnotationStatus = z.infer<typeof AnnotationStatusSchema>;

export const PerAnnotationResultSchema = z.object({
  id: z.string().min(1),
  status: AnnotationStatusSchema,
  note: z.string().min(1),
});
export type PerAnnotationResult = z.infer<typeof PerAnnotationResultSchema>;

export const AnnotationEditOutputSchema = z
  .object({
    operations: z.array(CodeGenOperationSchema),
    per_annotation: z.array(PerAnnotationResultSchema),
  })
  .superRefine((val, ctx) => {
    // Every annotation result id must be unique.
    const seen = new Set<string>();
    for (const [i, item] of val.per_annotation.entries()) {
      if (seen.has(item.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['per_annotation', i, 'id'],
          message: `Annotation id "${item.id}" appears more than once in per_annotation`,
        });
      }
      seen.add(item.id);
    }
  });
export type AnnotationEditOutput = z.infer<typeof AnnotationEditOutputSchema>;

/**
 * Validates that every annotation id in the input appears exactly once in the output.
 * Call this after parsing both input and output.
 */
export function validateAnnotationCoverage(
  inputIds: string[],
  output: AnnotationEditOutput,
): { missing: string[]; extra: string[] } {
  const inputSet = new Set(inputIds);
  const outputSet = new Set(output.per_annotation.map((r) => r.id));
  return {
    missing: inputIds.filter((id) => !outputSet.has(id)),
    extra: output.per_annotation.map((r) => r.id).filter((id) => !inputSet.has(id)),
  };
}
