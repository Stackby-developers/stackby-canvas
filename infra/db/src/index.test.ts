import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { withWorkspace, workspaces, projects } from './index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

let container: StartedTestContainer;
let pool: Pool;

beforeAll(async () => {
  container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_DB: 'studio_test',
      POSTGRES_USER: 'studio',
      POSTGRES_PASSWORD: 'studio',
    })
    .withExposedPorts(5432)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);
  const connectionString = `postgresql://studio:studio@${host}:${port}/studio_test`;

  pool = new Pool({ connectionString });

  const migration = readFileSync(
    join(__dirname, '..', 'migrations', '0001_initial.sql'),
    'utf-8',
  );
  await pool.query(migration);
}, 120_000);

afterAll(async () => {
  await pool.end();
  await container.stop();
});

describe('RLS isolation', () => {
  it('workspace A cannot read workspace B projects', async () => {
    const testDb = drizzle(pool);

    const [wsA] = await testDb
      .insert(workspaces)
      .values({ name: 'Workspace A', slug: `ws-a-${Date.now()}` })
      .returning();
    const [wsB] = await testDb
      .insert(workspaces)
      .values({ name: 'Workspace B', slug: `ws-b-${Date.now()}` })
      .returning();

    if (!wsA || !wsB) throw new Error('Failed to insert workspaces');

    await testDb.insert(projects).values({
      workspaceId: wsB.id,
      name: 'Secret Project',
      stackId: 'stk_secret',
      createdBy: '00000000-0000-0000-0000-000000000001',
    });

    await pool.query('SET row_security = on');

    const rowsAsA = await withWorkspace(wsA.id, async (tx) => tx.select().from(projects));
    expect(rowsAsA.filter((r) => r.workspaceId === wsB.id)).toHaveLength(0);

    const rowsAsB = await withWorkspace(wsB.id, async (tx) => tx.select().from(projects));
    const bProjects = rowsAsB.filter((r) => r.workspaceId === wsB.id);
    expect(bProjects).toHaveLength(1);
    expect(bProjects[0]?.name).toBe('Secret Project');
  });
});
