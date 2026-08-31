import { z } from 'zod';

export const ClarifierOptionSchema = z.object({
  label: z.string().min(1),
  detail: z.string().min(1),
  recommended: z.boolean(),
});
export type ClarifierOption = z.infer<typeof ClarifierOptionSchema>;

export const ClarifierQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  why_it_matters: z.string().min(1),
  options: z.array(ClarifierOptionSchema).min(2).max(4),
  allow_free_text: z.literal(true),
});
export type ClarifierQuestion = z.infer<typeof ClarifierQuestionSchema>;

export const ClarifierAssumptionSchema = z.object({
  statement: z.string().min(1),
  confidence: z.number().min(0).max(1),
});
export type ClarifierAssumption = z.infer<typeof ClarifierAssumptionSchema>;

export const ClarifierOutputSchema = z
  .object({
    questions: z.array(ClarifierQuestionSchema).max(3),
    assumptions: z.array(ClarifierAssumptionSchema),
  })
  .superRefine((val, ctx) => {
    for (const [qi, q] of val.questions.entries()) {
      const recommendedCount = q.options.filter((o) => o.recommended).length;
      if (recommendedCount !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['questions', qi, 'options'],
          message: `Question "${q.id}" must have exactly one recommended option (found ${recommendedCount})`,
        });
      }
    }
  });
export type ClarifierOutput = z.infer<typeof ClarifierOutputSchema>;
