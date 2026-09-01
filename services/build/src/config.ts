import { z } from 'zod';

export const ConfigSchema = z.object({
  PORT: z.coerce.number().int().default(3005),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SANDBOX_TYPE: z.enum(['process', 'docker', 'firecracker']).default('process'),
  POOL_SIZE: z.coerce.number().int().default(4),
  BUILD_TIMEOUT_MS: z.coerce.number().int().default(90_000),
  SCREENSHOT_TIMEOUT_MS: z.coerce.number().int().default(30_000),
  SANDBOX_MEMORY_MB: z.coerce.number().int().default(512),
  SANDBOX_CPU_MILLICORES: z.coerce.number().int().default(1000),
  ALLOWED_EGRESS_HOSTS: z.string().default('registry.npmjs.org,localhost'),
  BUILD_ARTIFACTS_DIR: z.string().default('/tmp/studio-builds'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse(process.env);
}
