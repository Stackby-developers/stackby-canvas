import { z } from 'zod';

export const ConfigSchema = z.object({
  PORT: z.coerce.number().int().default(3007),
  DATABASE_URL: z.string().default('postgresql://studio:studio@localhost:5432/studio'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  MAX_CRAWL_PAGES: z.coerce.number().int().default(5),
  PAGE_TIMEOUT_MS: z.coerce.number().int().default(15_000),
  EXTRACTION_TIMEOUT_MS: z.coerce.number().int().default(120_000),
  MAX_UPLOAD_BYTES: z.coerce.number().int().default(20 * 1024 * 1024),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});
export type Config = z.infer<typeof ConfigSchema>;
export const loadConfig = () => ConfigSchema.parse(process.env);
