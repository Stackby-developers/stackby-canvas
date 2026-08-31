import { z } from 'zod';

export const StudioErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  httpStatus: z.number().int().min(100).max(599),
  retryable: z.boolean(),
  userMessage: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type StudioError = z.infer<typeof StudioErrorSchema>;

export const ERROR_CODES = {
  RATE_LIMITED: 'RATE_LIMITED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  STACK_NOT_FOUND: 'STACK_NOT_FOUND',
  BUILD_TIMEOUT: 'BUILD_TIMEOUT',
  PLAN_REJECTED: 'PLAN_REJECTED',
  CREDITS_EXHAUSTED: 'CREDITS_EXHAUSTED',
  INVALID_PROMPT: 'INVALID_PROMPT',
  INTERNAL: 'INTERNAL',
} as const;
