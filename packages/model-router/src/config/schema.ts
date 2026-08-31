import { z } from 'zod';

export const ProviderSchema = z.enum(['anthropic', 'openai', 'google', 'bedrock', 'azure']);
export type Provider = z.infer<typeof ProviderSchema>;

export const CandidateSchema = z.object({
  provider: ProviderSchema,
  model: z.string(),
  maxTokens: z.number().int().positive(),
  temperature: z.number().min(0).max(2),
  timeoutMs: z.number().int().positive(),
  costPerMTokenIn: z.number().nonnegative(),
  costPerMTokenOut: z.number().nonnegative(),
  cacheReadCostPerMToken: z.number().nonnegative().default(0),
  supportsVision: z.boolean().default(false),
  supportsTools: z.boolean().default(false),
  zeroRetention: z.boolean().default(false),
});
export type Candidate = z.infer<typeof CandidateSchema>;

export const TierConfigSchema = z.object({
  label: z.string(),
  useCases: z.array(z.string()),
  candidates: z.array(CandidateSchema).min(1),
});

export const RouterConfigSchema = z.object({
  version: z.string(),
  tiers: z.record(z.enum(['T0', 'T1', 'T2', 'T3']), TierConfigSchema),
});
export type RouterConfig = z.infer<typeof RouterConfigSchema>;
export type ModelTier = 'T0' | 'T1' | 'T2' | 'T3';
