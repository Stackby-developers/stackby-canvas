import { z } from 'zod';

export const ConfigSchema = z.object({
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().default('postgresql://studio:studio@localhost:5432/studio'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32).default('dev-secret-minimum-32-chars-long!!'),
  PUBLISH_SERVICE_URL: z.string().url().default('http://localhost:3006'),
  ORCHESTRATOR_URL: z.string().url().default('http://localhost:3004'),
  CREDIT_MULTIPLIER: z.coerce.number().default(1.5),
  DEFAULT_MONTHLY_CAP: z.coerce.number().int().default(500),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});
export type Config = z.infer<typeof ConfigSchema>;
export const loadConfig = () => ConfigSchema.parse(process.env);
