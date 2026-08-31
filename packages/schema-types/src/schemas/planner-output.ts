import { z } from 'zod';
import { IntentArtifactTypeSchema } from './intent.js';

export const SectionKindSchema = z.enum([
  'hero', 'kpi_row', 'table', 'card_grid', 'chart', 'timeline',
  'detail_sheet', 'form', 'filter_bar', 'nav', 'footer', 'slide',
  'feature_strip', 'quote', 'cta',
]);
export type SectionKind = z.infer<typeof SectionKindSchema>;

export const PlannerSectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: SectionKindSchema,
  purpose: z.string().min(1),
  binding_ref: z.string().nullable(),
  fields_shown: z.array(z.string()),
  empty_state: z.string(),
  interactions: z.array(z.string()),
  notes: z.string().optional(),
});
export type PlannerSection = z.infer<typeof PlannerSectionSchema>;

export const PlannerPageSchema = z.object({
  id: z.string().min(1),
  route: z.string().startsWith('/'),
  name: z.string().min(1),
  purpose: z.string().min(1),
  sections: z.array(PlannerSectionSchema).min(1),
});
export type PlannerPage = z.infer<typeof PlannerPageSchema>;

export const PlannerBindingSchema = z.object({
  id: z.string().min(1),
  table_id: z.string().min(1),
  table_name: z.string().min(1),
  view_id: z.string().nullable(),
  columns: z.array(z.string()).min(1),
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
  writes: z.boolean(),
  cache_ttl_s: z.number().int().min(1).max(600),
});
export type PlannerBinding = z.infer<typeof PlannerBindingSchema>;

export const VisualDirectionSourceSchema = z.enum(['design_system', 'inferred', 'default']);
export type VisualDirectionSource = z.infer<typeof VisualDirectionSourceSchema>;

export const StyleCardSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  preview_tokens: z.record(z.string()),
});
export type StyleCard = z.infer<typeof StyleCardSchema>;

export const VisualDirectionSchema = z.object({
  source: VisualDirectionSourceSchema,
  design_system_id: z.string().nullable(),
  mood: z.string().min(1),
  layout_grammar: z.string().min(1),
  typography: z.string().min(1),
  density: z.enum(['comfortable', 'compact']),
  style_cards: z.array(StyleCardSchema),
});
export type VisualDirection = z.infer<typeof VisualDirectionSchema>;

export const PlannerOutputSchema = z
  .object({
    version: z.literal(0),
    title: z.string().min(1),
    summary: z.string().min(1),
    artifact_type: IntentArtifactTypeSchema,
    pages: z.array(PlannerPageSchema).min(1),
    bindings: z.array(PlannerBindingSchema),
    visual_direction: VisualDirectionSchema,
    assumptions: z.array(z.string()),
    data_notes: z.array(z.string()),
    out_of_scope: z.array(z.string()),
    estimated_files: z.number().int().nonnegative(),
    estimated_credits: z.number().int().nonnegative(),
  })
  .superRefine((val, ctx) => {
    const bindingIds = new Set(val.bindings.map((b) => b.id));

    // Every non-null binding_ref must resolve to a declared binding.
    for (const [pi, page] of val.pages.entries()) {
      for (const [si, section] of page.sections.entries()) {
        if (section.binding_ref !== null && !bindingIds.has(section.binding_ref)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['pages', pi, 'sections', si, 'binding_ref'],
            message: `binding_ref "${section.binding_ref}" does not match any binding id`,
          });
        }
      }
    }

    // design_system source requires a design_system_id; others must have null.
    const vd = val.visual_direction;
    if (vd.source === 'design_system' && vd.design_system_id === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['visual_direction', 'design_system_id'],
        message: 'design_system_id must not be null when source is "design_system"',
      });
    }
    if (vd.source !== 'design_system' && vd.design_system_id !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['visual_direction', 'design_system_id'],
        message: 'design_system_id must be null when source is not "design_system"',
      });
    }
  });
export type PlannerOutput = z.infer<typeof PlannerOutputSchema>;
