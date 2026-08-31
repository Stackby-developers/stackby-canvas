import { describe, it, expect } from 'vitest';
import { detectDrift } from '../lib/drift.js';
import { introspectStack } from '../lib/introspect.js';
import { vi } from 'vitest';
import type { GatewayClient } from '../gateway-client.js';
import fullStack from '../__fixtures__/full-stack.json' with { type: 'json' };
import fullStackRenamed from '../__fixtures__/full-stack-renamed.json' with { type: 'json' };
import type { SchemaTable } from '../lib/introspect.js';
import type { DataBinding } from '@stackby/schema-types';

async function getTables(fixture: typeof fullStack): Promise<SchemaTable[]> {
  const client: GatewayClient = {
    getStackSchema: vi.fn().mockResolvedValue(fixture),
    getTableRows: vi.fn().mockResolvedValue({ rows: [] }),
  } as unknown as GatewayClient;
  const graph = await introspectStack(client, 'stk_acme_pm');
  return graph.tables;
}

describe('detectDrift', () => {
  it('detects renamed column (Name → Title on col_task_name)', async () => {
    const oldTables = await getTables(fullStack);
    const newTables = await getTables(fullStackRenamed);

    const { changes } = detectDrift(oldTables, newTables, []);

    const renames = changes.filter((c) => c.kind === 'renamed_column');
    expect(renames).toHaveLength(1);
    expect(renames[0]).toMatchObject({
      kind: 'renamed_column',
      columnId: 'col_task_name',
      oldColumnName: 'Name',
      newColumnName: 'Title',
      tableId: 'tbl_tasks',
    });
  });

  it('surfaces affected binding when renamed column is referenced', async () => {
    const oldTables = await getTables(fullStack);
    const newTables = await getTables(fullStackRenamed);

    const binding: DataBinding = {
      componentId: 'cmp_task_title',
      tableId: 'tbl_tasks',
      tableName: 'Tasks',
      columnIds: ['col_task_name', 'col_task_status'],
    };

    const { affectedBindings } = detectDrift(oldTables, newTables, [binding]);
    expect(affectedBindings).toHaveLength(1);
    expect(affectedBindings[0]).toMatchObject({
      bindingId: 'cmp_task_title',
      columnId: 'col_task_name',
      changeKind: 'renamed_column',
    });
  });

  it('does not flag binding when unrelated column is renamed', async () => {
    const oldTables = await getTables(fullStack);
    const newTables = await getTables(fullStackRenamed);

    const binding: DataBinding = {
      componentId: 'cmp_task_status',
      tableId: 'tbl_tasks',
      tableName: 'Tasks',
      columnIds: ['col_task_status', 'col_task_due'], // doesn't reference col_task_name
    };

    const { affectedBindings } = detectDrift(oldTables, newTables, [binding]);
    expect(affectedBindings).toHaveLength(0);
  });

  it('detects added column as added_column (non-breaking)', async () => {
    const oldTables = await getTables(fullStack);
    const extraCol = { id: 'col_new', name: 'New Column', type: 'text', views: [] };
    const newFixture = {
      ...fullStack,
      tables: fullStack.tables.map((t) =>
        t.id === 'tbl_tasks'
          ? { ...t, columns: [...t.columns, extraCol] }
          : t,
      ),
    };
    const newTables = await getTables(newFixture as typeof fullStack);

    const { changes, affectedBindings } = detectDrift(oldTables, newTables, []);
    const added = changes.filter((c) => c.kind === 'added_column');
    expect(added).toHaveLength(1);
    expect(added[0]?.newColumnName).toBe('New Column');
    expect(affectedBindings).toHaveLength(0); // adding is non-breaking
  });

  it('detects removed column and flags binding that references it', async () => {
    const oldTables = await getTables(fullStack);
    const newFixture = {
      ...fullStack,
      tables: fullStack.tables.map((t) =>
        t.id === 'tbl_tasks'
          ? { ...t, columns: t.columns.filter((c) => c.id !== 'col_task_rating') }
          : t,
      ),
    };
    const newTables = await getTables(newFixture as typeof fullStack);

    const binding: DataBinding = {
      componentId: 'cmp_rating',
      tableId: 'tbl_tasks',
      tableName: 'Tasks',
      columnIds: ['col_task_rating'],
    };

    const { changes, affectedBindings } = detectDrift(oldTables, newTables, [binding]);
    expect(changes.some((c) => c.kind === 'removed_column' && c.columnId === 'col_task_rating')).toBe(true);
    expect(affectedBindings).toHaveLength(1);
    expect(affectedBindings[0]?.changeKind).toBe('removed_column');
  });

  it('detects removed table and flags all bindings for that table', async () => {
    const oldTables = await getTables(fullStack);
    const newFixture = {
      ...fullStack,
      tables: fullStack.tables.filter((t) => t.id !== 'tbl_clients'),
    };
    const newTables = await getTables(newFixture as typeof fullStack);

    const binding: DataBinding = {
      componentId: 'cmp_clients',
      tableId: 'tbl_clients',
      tableName: 'Clients',
      columnIds: ['col_client_name'],
    };

    const { changes, affectedBindings } = detectDrift(oldTables, newTables, [binding]);
    expect(changes.some((c) => c.kind === 'removed_table' && c.tableId === 'tbl_clients')).toBe(true);
    expect(affectedBindings).toHaveLength(1);
    expect(affectedBindings[0]?.changeKind).toBe('removed_table');
  });

  it('returns empty results when schemas are identical', async () => {
    const tables = await getTables(fullStack);
    const { changes, affectedBindings } = detectDrift(tables, tables, []);
    expect(changes).toHaveLength(0);
    expect(affectedBindings).toHaveLength(0);
  });
});
