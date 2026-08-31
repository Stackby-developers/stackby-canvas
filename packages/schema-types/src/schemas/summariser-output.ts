import { z } from 'zod';

export const RunStepSchema = z.object({
  label: z.string().min(1),
  detail: z.string().nullable(),
  artifact_uri: z.string().url().nullable(),
});
export type RunStep = z.infer<typeof RunStepSchema>;

export const SummariserOutputSchema = z
  .object({
    headline: z.string().min(1),
    steps: z.array(RunStepSchema).min(1),
    verdict_line: z.string().min(1),
    what_changed: z.array(z.string().min(1)),
    suggested_next: z.array(z.string().min(1)).max(2),
  })
  .superRefine((val, ctx) => {
    // headline must be at most 8 words.
    const wordCount = val.headline.trim().split(/\s+/).length;
    if (wordCount > 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['headline'],
        message: `headline must be 8 words or fewer (got ${wordCount})`,
      });
    }
  });
export type SummariserOutput = z.infer<typeof SummariserOutputSchema>;
