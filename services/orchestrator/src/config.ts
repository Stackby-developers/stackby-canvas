import { z } from 'zod';

export const ConfigSchema = z.object({
  PORT: z.coerce.number().int().default(3004),
  TEMPORAL_ADDRESS: z.string().default('localhost:7233'),
  TEMPORAL_NAMESPACE: z.string().default('default'),
  TEMPORAL_TASK_QUEUE: z.string().default('studio-builds'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  DATABASE_URL: z.string().default('postgresql://studio:studio@localhost:5432/studio'),
  CLICKHOUSE_URL: z.string().default('http://localhost:8123'),
  SCHEMA_SERVICE_URL: z.string().url().default('http://localhost:3002'),
  BUILD_SERVICE_URL: z.string().url().default('http://localhost:3005'),
  GATEWAY_URL: z.string().url().default('http://localhost:3003'),
  MODEL_T0: z.string().default('claude-haiku-4-5-20251001'),
  MODEL_T1: z.string().default('claude-sonnet-5'),
  MODEL_T2: z.string().default('claude-sonnet-5'),
  MODEL_T3: z.string().default('claude-opus-5'),
  ANTHROPIC_API_KEY: z.string().min(1).default('sk-placeholder'),
  RUN_EVENTS_TTL_SECONDS: z.coerce.number().int().default(86400 * 7),
  MAX_FIX_CYCLES: z.coerce.number().int().default(3),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse(process.env);
}
