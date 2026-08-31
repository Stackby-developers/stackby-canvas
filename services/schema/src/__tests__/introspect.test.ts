import { describe, it, expect, vi } from 'vitest';
import { introspectStack } from '../lib/introspect.js';
import type { GatewayClient } from '../gateway-client.js';
import fullStack from '../__fixtures__/full-stack.json' with { type: 'json' };

function makeClient(): GatewayClient {
  return {
    getStackSchema: vi.fn().mockResolvedValue(fullStack),
    getTableRows: vi.fn().mockResolvedValue({ rows: [] }),
  } as unknown as GatewayClient;
}

describe('introspectStack', () => {
  it('returns all 3 tables', async () => {
    const graph = await introspectStack(makeClient(), 'stk_acme_pm');
    expect(graph.tables).toHaveLength(3);
    expect(graph.stackId).toBe('stk_acme_pm');
    expect(graph.stackName).toBe('ACME Project Management');
  });

  it('hash is a 16-char hex string', async () => {
    const graph = await introspectStack(makeClient(), 'stk_acme_pm');
    expect(graph.hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('hash is deterministic across calls', async () => {
    const g1 = await introspectStack(makeClient(), 'stk_acme_pm');
    const g2 = await introspectStack(makeClient(), 'stk_acme_pm');
    expect(g1.hash).toBe(g2.hash);
  });

  it('covers every column type present in the fixture', async () => {
    const graph = await introspectStack(makeClient(), 'stk_acme_pm');
    const allTypes = new Set(graph.tables.flatMap((t) => t.columns.map((c) => c.type)));
    const expectedTypes = [
      'text', 'email', 'phone', 'select', 'currency', 'link', 'lookup', 'count',
      'collaborator', 'date', 'multipleAttachment', 'multilineText', 'dateTime',
      'multiCollaborator', 'number', 'percent', 'duration', 'progress', 'rating',
      'multiSelect', 'url', 'barcode', 'checkbox', 'formula', 'rollup',
      'autoNumber', 'createdTime', 'lastModifiedTime', 'button',
    ];
    for (const t of expectedTypes) {
      expect(allTypes, `expected type ${t} to be present`).toContain(t);
    }
  });

  it('marks formula/lookup/rollup/count/autoNumber/createdTime/lastModifiedTime as readOnly', async () => {
    const graph = await introspectStack(makeClient(), 'stk_acme_pm');
    const tasks = graph.tables.find((t) => t.id === 'tbl_tasks')!;
    const readOnlyTypes = new Set(['formula', 'lookup', 'rollup', 'count', 'autoNumber', 'createdTime', 'lastModifiedTime']);
    for (const col of tasks.columns) {
      if (readOnlyTypes.has(col.type)) {
        expect(col.readOnly, `${col.name} (${col.type}) should be readOnly`).toBe(true);
      } else {
        expect(col.readOnly, `${col.name} (${col.type}) should not be readOnly`).toBe(false);
      }
    }
  });

  it('infers link/lookup/rollup/count relationships', async () => {
    const graph = await introspectStack(makeClient(), 'stk_acme_pm');
    const tasks = graph.tables.find((t) => t.id === 'tbl_tasks')!;
    const relKinds = new Set(tasks.relationships.map((r) => r.kind));
    expect(relKinds).toContain('link');
    expect(relKinds).toContain('lookup');
    expect(relKinds).toContain('rollup');
    expect(relKinds).toContain('count');
  });

  it('captures 2-hop lookup chain (clientName via projectClientName)', async () => {
    const graph = await introspectStack(makeClient(), 'stk_acme_pm');
    const tasks = graph.tables.find((t) => t.id === 'tbl_tasks')!;
    const clientNameRel = tasks.relationships.find(
      (r) => r.fromColumnId === 'col_task_client_name',
    );
    expect(clientNameRel).toBeDefined();
    expect(clientNameRel?.kind).toBe('lookup');
    // linkedColumnId is col_project_client_name — the lookup in projects, making this 2-hop
    expect(clientNameRel?.viaColumnId).toBe('col_project_client_name');
  });

  it('surfaces per-table error without aborting other tables', async () => {
    const client: GatewayClient = {
      getStackSchema: vi.fn().mockResolvedValue({
        ...fullStack,
        tables: [
          ...fullStack.tables.slice(0, 2),
          {
            id: 'tbl_broken',
            name: 'Broken',
            primaryColumnId: 'col_x',
            columns: null, // will throw in normaliseTable
            views: [],
          },
        ],
      }),
      getTableRows: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as GatewayClient;

    const graph = await introspectStack(client, 'stk_test');
    expect(graph.tables).toHaveLength(3);
    const broken = graph.tables.find((t) => t.id === 'tbl_broken');
    expect(broken?.error).toBeDefined();
    // Other tables should still be present
    expect(graph.tables.find((t) => t.id === 'tbl_clients')).toBeDefined();
  });

  it('identifies the primary column', async () => {
    const graph = await introspectStack(makeClient(), 'stk_acme_pm');
    const tasks = graph.tables.find((t) => t.id === 'tbl_tasks')!;
    const primary = tasks.columns.find((c) => c.isPrimary);
    expect(primary?.id).toBe('col_task_name');
  });

  it('populates views for each table', async () => {
    const graph = await introspectStack(makeClient(), 'stk_acme_pm');
    const tasks = graph.tables.find((t) => t.id === 'tbl_tasks')!;
    expect(tasks.views.length).toBeGreaterThan(0);
    expect(tasks.views[0]).toMatchObject({ id: expect.any(String), name: expect.any(String), type: expect.any(String) });
  });
});
