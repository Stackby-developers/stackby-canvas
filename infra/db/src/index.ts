import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from './schema/index.js';

const pool = new Pool({
  connectionString:
    process.env['DATABASE_URL'] ?? 'postgresql://studio:studio@localhost:5432/studio',
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;

/** Set the RLS workspace context for the duration of a transaction */
export async function withWorkspace<T>(
  workspaceId: string,
  fn: (tx: typeof db) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_workspace_id', ${workspaceId}, true)`);
    return fn(tx as unknown as typeof db);
  });
}

export * from './schema/index.js';
