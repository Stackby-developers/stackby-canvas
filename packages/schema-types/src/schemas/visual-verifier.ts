import { z } from 'zod';

export const VerifierVerdictSchema = z.enum(['pass', 'fix', 'fail']);
export type VerifierVerdict = z.infer<typeof VerifierVerdictSchema>;

export const DefectSeveritySchema = z.enum(['blocker', 'major', 'minor']);
export type DefectSeverity = z.infer<typeof DefectSeveritySchema>;

export const DefectClassSchema = z.enum([
  'overflow', 'overlap', 'clipped_text', 'contrast', 'density',
  'broken_grid', 'empty_region', 'unstyled_fallback', 'off_brand',
  'misaligned', 'illegible_at_size', 'missing_section', 'console_error',
]);
export type DefectClass = z.infer<typeof DefectClassSchema>;

export const VerifierBreakpointSchema = z.union([
  z.literal(375), z.literal(768), z.literal(1440),
]);
export type VerifierBreakpoint = z.infer<typeof VerifierBreakpointSchema>;

export const VisualDefectSchema = z.object({
  severity: DefectSeveritySchema,
  class: DefectClassSchema,
  breakpoint: VerifierBreakpointSchema,
  where: z.string().min(1),
  evidence: z.string().min(1),
  fix_hint: z.string().min(1),
});
export type VisualDefect = z.infer<typeof VisualDefectSchema>;

export const PlanCoverageItemSchema = z.object({
  section_id: z.string().min(1),
  present: z.boolean(),
  note: z.string(),
});
export type PlanCoverageItem = z.infer<typeof PlanCoverageItemSchema>;

export const VisualVerifierOutputSchema = z
  .object({
    verdict: VerifierVerdictSchema,
    one_line: z.string().min(1),
    defects: z.array(VisualDefectSchema),
    plan_coverage: z.array(PlanCoverageItemSchema),
  })
  .superRefine((val, ctx) => {
    if (val.verdict === 'pass') {
      // pass is invalid if any defect is a blocker.
      const hasBlocker = val.defects.some((d) => d.severity === 'blocker');
      if (hasBlocker) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['verdict'],
          message: 'verdict cannot be "pass" when a blocker defect is present',
        });
      }
      // pass is invalid if any plan section is missing.
      const hasMissingSection = val.plan_coverage.some((c) => !c.present);
      if (hasMissingSection) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['verdict'],
          message: 'verdict cannot be "pass" when a plan section is absent',
        });
      }
    }
  });
export type VisualVerifierOutput = z.infer<typeof VisualVerifierOutputSchema>;

// ---------------------------------------------------------------------------
// Multimodal message parts — protocol-neutral; orchestrator converts to SDK types
// ---------------------------------------------------------------------------

export const VerifierTextPartSchema = z.object({
  kind: z.literal('text'),
  text: z.string(),
});
export type VerifierTextPart = z.infer<typeof VerifierTextPartSchema>;

export const VerifierScreenshotPartSchema = z.object({
  kind: z.literal('screenshot'),
  breakpoint: VerifierBreakpointSchema,
  /** Absolute or workspace-relative path to the PNG file. */
  path: z.string().min(1),
});
export type VerifierScreenshotPart = z.infer<typeof VerifierScreenshotPartSchema>;

export const VerifierMessagePartSchema = z.discriminatedUnion('kind', [
  VerifierTextPartSchema,
  VerifierScreenshotPartSchema,
]);
export type VerifierMessagePart = z.infer<typeof VerifierMessagePartSchema>;
