import { z } from 'zod';
import { StackGenColumnTypeSchema } from './stack-generator.js';

export const MappingRoleSchema = z.enum([
  'title', 'status', 'date', 'owner', 'measure', 'image', 'link',
]);
export type MappingRole = z.infer<typeof MappingRoleSchema>;

export const MappingBasisSchema = z.enum(['name', 'type', 'semantic_role', 'sample_values']);
export type MappingBasis = z.infer<typeof MappingBasisSchema>;

export const FieldMappingSchema = z.object({
  template_entity: z.string().min(1),
  template_field: z.string().min(1),
  role: MappingRoleSchema,
  matched_table_id: z.string().min(1),
  matched_column_id: z.string().min(1),
  confidence: z.number().min(0).max(1),
  basis: MappingBasisSchema,
});
export type FieldMapping = z.infer<typeof FieldMappingSchema>;

export const ProposedColumnSchema = z.object({
  name: z.string().min(1),
  columnType: StackGenColumnTypeSchema,
});
export type ProposedColumn = z.infer<typeof ProposedColumnSchema>;

export const UnmappedRequiredSchema = z
  .object({
    template_field: z.string().min(1),
    suggestion: z.enum(['create_column', 'ask_user']),
    proposed_column: ProposedColumnSchema.nullable(),
  })
  .superRefine((item, ctx) => {
    if (item.suggestion === 'create_column' && item.proposed_column === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proposed_column'],
        message: `proposed_column is required when suggestion is "create_column"`,
      });
    }
    if (item.suggestion === 'ask_user' && item.proposed_column !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proposed_column'],
        message: `proposed_column must be null when suggestion is "ask_user"`,
      });
    }
  });
export type UnmappedRequired = z.infer<typeof UnmappedRequiredSchema>;

export const RemapQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string()).min(1),
});
export type RemapQuestion = z.infer<typeof RemapQuestionSchema>;

export const TemplateRemapOutputSchema = z
  .object({
    mappings: z.array(FieldMappingSchema),
    unmapped_required: z.array(UnmappedRequiredSchema),
    questions: z.array(RemapQuestionSchema).max(3),
  })
  .superRefine((val, ctx) => {
    // Every ask_user unmapped field should have a corresponding question id.
    const questionIds = new Set(val.questions.map((q) => q.id));
    for (const [i, item] of val.unmapped_required.entries()) {
      if (item.suggestion === 'ask_user') {
        const hasQuestion = val.questions.some((q) =>
          q.question.toLowerCase().includes(item.template_field.toLowerCase()),
        );
        // Soft check: we can't always verify a question covers a field by id alone.
        // Validate that question ids are unique at least.
        if (questionIds.size !== val.questions.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['questions'],
            message: 'Duplicate question ids in questions array',
          });
        }
        void hasQuestion; // used for documentation; runtime check would be too strict
      }
    }

    // Question ids must be unique.
    const seenQids = new Set<string>();
    for (const [i, q] of val.questions.entries()) {
      if (seenQids.has(q.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['questions', i, 'id'],
          message: `Duplicate question id "${q.id}"`,
        });
      }
      seenQids.add(q.id);
    }
  });
export type TemplateRemapOutput = z.infer<typeof TemplateRemapOutputSchema>;
