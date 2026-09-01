import { z } from 'zod';

export const ConfigSchema = z.object({
  PORT: z.coerce.number().int().default(3006),
  DATABASE_URL: z.string().default('postgresql://studio:studio@localhost:5432/studio'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32).default('dev-secret-minimum-32-chars-long!!'),
  STUDIO_DOMAIN: z.string().default('studio.stackby.com'),
  GATEWAY_ORIGIN: z.string().url().default('http://localhost:3003'),
  STACKBY_OAUTH_URL: z.string().url().default('https://stackby.com/oauth'),
  STACKBY_CLIENT_ID: z.string().default('dev-client-id'),
  STACKBY_CLIENT_SECRET: z.string().default('dev-client-secret'),
  SESSION_TTL_SECONDS: z.coerce.number().int().default(3600),
  RUNTIME_TOKEN_TTL_SECONDS: z.coerce.number().int().default(3600),
  SLUG_CACHE_TTL_SECONDS: z.coerce.number().int().default(60),
  UNPUBLISH_PROPAGATION_MS: z.coerce.number().int().default(60_000),
  OBJECT_STORAGE_URL: z.string().url().default('http://localhost:9000'),
  OBJECT_STORAGE_BUCKET: z.string().default('studio-artifacts'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse(process.env);
}
