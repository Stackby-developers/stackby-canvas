import { z } from 'zod';
import { PlanSchema } from './plan.js';
import { StudioErrorSchema } from './error.js';

export const FileOperationSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('write'), path: z.string(), content: z.string() }),
  z.object({ op: z.literal('delete'), path: z.string() }),
  z.object({ op: z.literal('rename'), from: z.string(), to: z.string() }),
]);
export type FileOperation = z.infer<typeof FileOperationSchema>;

export const RunStatusSchema = z.enum([
  'pending', 'intent', 'schema', 'clarification', 'plan_review',
  'building', 'verifying', 'fixing', 'ready', 'failed',
]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const RunEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('intent'),
    runId: z.string().uuid(),
    ts: z.number(),
    data: z.object({ intent: z.string() }),
  }),
  z.object({
    type: z.literal('schema_analyzed'),
    runId: z.string().uuid(),
    ts: z.number(),
    data: z.object({ tableCount: z.number().int(), columnCount: z.number().int() }),
  }),
  z.object({
    type: z.literal('clarification'),
    runId: z.string().uuid(),
    ts: z.number(),
    data: z.object({ questions: z.array(z.string()).max(3) }),
  }),
  z.object({
    type: z.literal('plan'),
    runId: z.string().uuid(),
    ts: z.number(),
    data: PlanSchema,
  }),
  z.object({
    type: z.literal('plan_approved'),
    runId: z.string().uuid(),
    ts: z.number(),
    data: z.object({}),
  }),
  z.object({
    type: z.literal('codegen'),
    runId: z.string().uuid(),
    ts: z.number(),
    data: z.object({
      step: z.string(),
      fileOp: FileOperationSchema.optional(),
    }),
  }),
  z.object({
    type: z.literal('build_progress'),
    runId: z.string().uuid(),
    ts: z.number(),
    data: z.object({ progress: z.number().min(0).max(100) }),
  }),
  z.object({
    type: z.literal('verify'),
    runId: z.string().uuid(),
    ts: z.number(),
    data: z.object({ pass: z.boolean(), issues: z.array(z.string()).optional() }),
  }),
  z.object({
    type: z.literal('fix'),
    runId: z.string().uuid(),
    ts: z.number(),
    data: z.object({ issue: z.string(), attempt: z.number().int() }),
  }),
  z.object({
    type: z.literal('ready'),
    runId: z.string().uuid(),
    ts: z.number(),
    data: z.object({ previewUrl: z.string().url() }),
  }),
  z.object({
    type: z.literal('error'),
    runId: z.string().uuid(),
    ts: z.number(),
    data: StudioErrorSchema,
  }),
]);
export type RunEvent = z.infer<typeof RunEventSchema>;
