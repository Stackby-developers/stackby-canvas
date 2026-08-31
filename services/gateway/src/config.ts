import { z } from 'zod';

export const ConfigSchema = z.object({
  PORT: z.coerce.number().int().default(3003),
  STACKBY_API_URL: z.string().url().default('https://api.stackby.com/API/v2'),
  STACKBY_PAT: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CACHE_TTL_SECONDS: z.coerce.number().int().default(60),
  STALE_TTL_SECONDS: z.coerce.number().int().default(300),
  ROW_CEILING: z.coerce.number().int().default(5000),
  RATE_LIMIT_RPS: z.coerce.number().default(4),
  RATE_LIMIT_BURST: z.coerce.number().int().default(4),
  COOLDOWN_MS: z.coerce.number().int().default(30_000),
  MAX_UPLOAD_BYTES: z.coerce.number().int().default(10 * 1024 * 1024),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse(process.env);
}
