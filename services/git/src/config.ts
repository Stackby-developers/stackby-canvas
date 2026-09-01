import { z } from 'zod';

export const ConfigSchema = z.object({
  PORT: z.coerce.number().int().default(3008),
  DATABASE_URL: z.string().default('postgresql://studio:studio@localhost:5432/studio'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  TOKEN_ENCRYPTION_KEY: z.string().length(64).default('a'.repeat(64)),
  GITHUB_APP_ID: z.string().default(''),
  GITHUB_APP_PRIVATE_KEY: z.string().default(''),
  GITHUB_APP_WEBHOOK_SECRET: z.string().default(''),
  GITLAB_CLIENT_ID: z.string().default(''),
  GITLAB_CLIENT_SECRET: z.string().default(''),
  GITLAB_BASE_URL: z.string().url().default('https://gitlab.com'),
  SDK_VERSION: z.string().default('0.1.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Config = z.infer<typeof ConfigSchema>;
export const loadConfig = () => ConfigSchema.parse(process.env);
