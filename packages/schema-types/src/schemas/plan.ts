import { z } from 'zod';
import { ArtifactTypeSchema } from './artifact.js';

export const PlanStepTypeSchema = z.enum([
  'component', 'page', 'hook', 'util', 'api-route', 'layout',
]);
export type PlanStepType = z.infer<typeof PlanStepTypeSchema>;

export const PlanStepSchema = z.object({
  id: z.string(),
  type: PlanStepTypeSchema,
  title: z.string(),
  description: z.string(),
  tables: z.array(z.string()),
  columns: z.array(z.string()),
  dependencies: z.array(z.string()),
  estimatedLines: z.number().int().positive().optional(),
});
export type PlanStep = z.infer<typeof PlanStepSchema>;

export const PlanSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  intent: z.string(),
  artifactType: ArtifactTypeSchema,
  stackId: z.string(),
  steps: z.array(PlanStepSchema),
  designSystemId: z.string().uuid().optional(),
  estimatedDurationMs: z.number().int().positive().optional(),
  createdAt: z.string().datetime(),
});
export type Plan = z.infer<typeof PlanSchema>;
