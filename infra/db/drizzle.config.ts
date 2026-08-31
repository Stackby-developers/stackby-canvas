import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString:
      process.env['DATABASE_URL'] ?? 'postgresql://studio:studio@localhost:5432/studio',
  },
  verbose: true,
  strict: true,
} satisfies Config;
