import { z } from 'zod';

const ConfigSchema = z.object({
  PORT: z.coerce.number().int().default(3002),
  GATEWAY_URL: z.string().url().default('http://localhost:3003'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SCHEMA_CACHE_TTL_SECONDS: z.coerce.number().int().default(900),
  SAMPLE_ROW_LIMIT: z.coerce.number().int().default(50),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse(process.env);
}
