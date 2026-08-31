import { z } from 'zod';

// User-facing artifact vocabulary from B.1. The planner resolves 'app' into the
// more specific dashboard | portal | gallery types used by PlanSchema.
export const IntentArtifactTypeSchema = z.enum([
  'app', 'report', 'presentation', 'website', 'document', 'form',
]);
export type IntentArtifactType = z.infer<typeof IntentArtifactTypeSchema>;

export const CapabilitySchema = z.enum([
  'read', 'write', 'search', 'filter', 'aggregate', 'upload',
  'present', 'seo', 'auth', 'deep_link', 'camera', 'clipboard',
]);
export type Capability = z.infer<typeof CapabilitySchema>;

export const AmbiguitySchema = z.object({
  id: z.string(),
  question_seed: z.string(),
  blocking: z.boolean(),
  why_blocking: z.string(),
});
export type Ambiguity = z.infer<typeof AmbiguitySchema>;

export const IntentSchema = z.object({
  goal: z.string().min(1),
  audience: z.string().min(1),
  artifact_type: IntentArtifactTypeSchema,
  artifact_type_confidence: z.number().min(0).max(1),
  required_capabilities: z.array(CapabilitySchema),
  explicit_constraints: z.array(z.string()),
  implied_entities: z.array(z.string()),
  tone_signals: z.array(z.string()),
  ambiguities: z.array(AmbiguitySchema),
});
export type Intent = z.infer<typeof IntentSchema>;
