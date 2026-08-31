import { describe, it, expect } from 'vitest';
import { computeSemanticProfile, isPiiColumn } from '../lib/semantics.js';
import { introspectStack } from '../lib/introspect.js';
import { vi } from 'vitest';
import type { GatewayClient } from '../gateway-client.js';
import fullStack from '../__fixtures__/full-stack.json' with { type: 'json' };
import type { SchemaTable, SchemaColumn } from '../lib/introspect.js';

async function getTasksTable(): Promise<SchemaTable> {
  const client: GatewayClient = {
    getStackSchema: vi.fn().mockResolvedValue(fullStack),
    getTableRows: vi.fn().mockResolvedValue({ rows: [] }),
  } as unknown as GatewayClient;
  const graph = await introspectStack(client, 'stk_acme_pm');
  return graph.tables.find((t) => t.id === 'tbl_tasks')!;
}

describe('computeSemanticProfile', () => {
  it('identifies displayColumn as the primary column (col_task_name)', async () => {
    const tasks = await getTasksTable();
    const profile = computeSemanticProfile('stk_acme_pm', [tasks]);
    const taskProfile = profile.tables.find((t) => t.tableId === 'tbl_tasks')!;
    expect(taskProfile.displayColumn?.columnId).toBe('col_task_name');
    expect(taskProfile.displayColumn?.confidence).toBeGreaterThan(0.9);
  });

  it('identifies statusColumn from the Todo/In Progress/Done select', async () => {
    const tasks = await getTasksTable();
    const profile = computeSemanticProfile('stk_acme_pm', [tasks]);
    const taskProfile = profile.tables.find((t) => t.tableId === 'tbl_tasks')!;
    expect(taskProfile.statusColumn).toBeDefined();
    expect(taskProfile.statusColumn?.columnId).toBe('col_task_status');
    expect(taskProfile.statusColumn?.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it('orders dateColumns with dueDate before createdTime', async () => {
    const tasks = await getTasksTable();
    const profile = computeSemanticProfile('stk_acme_pm', [tasks]);
    const taskProfile = profile.tables.find((t) => t.tableId === 'tbl_tasks')!;
    const dateIds = taskProfile.dateColumns.map((d) => d.columnId);
    expect(dateIds.indexOf('col_task_due')).toBeLessThan(dateIds.indexOf('col_task_created'));
  });

  it('identifies ownerColumn as the assignee collaborator', async () => {
    const tasks = await getTasksTable();
    const profile = computeSemanticProfile('stk_acme_pm', [tasks]);
    const taskProfile = profile.tables.find((t) => t.tableId === 'tbl_tasks')!;
    expect(taskProfile.ownerColumn?.columnId).toBe('col_task_assignee');
    expect(taskProfile.ownerColumn?.confidence).toBeGreaterThan(0.9);
  });

  it('includes all numeric/measure columns', async () => {
    const tasks = await getTasksTable();
    const profile = computeSemanticProfile('stk_acme_pm', [tasks]);
    const taskProfile = profile.tables.find((t) => t.tableId === 'tbl_tasks')!;
    const measureIds = taskProfile.measures.map((m) => m.columnId);
    expect(measureIds).toContain('col_task_hours_est');
    expect(measureIds).toContain('col_task_hours_act');
    expect(measureIds).toContain('col_task_cost');
    expect(measureIds).toContain('col_task_completion');
    expect(measureIds).toContain('col_task_time');
    expect(measureIds).toContain('col_task_progress');
    expect(measureIds).toContain('col_task_rating');
  });

  it('includes status/priority selects and project link in naturalGroupings', async () => {
    const tasks = await getTasksTable();
    const profile = computeSemanticProfile('stk_acme_pm', [tasks]);
    const taskProfile = profile.tables.find((t) => t.tableId === 'tbl_tasks')!;
    const groupIds = taskProfile.naturalGroupings.map((g) => g.columnId);
    expect(groupIds).toContain('col_task_status');
    expect(groupIds).toContain('col_task_priority');
    expect(groupIds).toContain('col_task_project');
  });

  it('identifies the imageColumn from multipleAttachment', async () => {
    const tasks = await getTasksTable();
    const profile = computeSemanticProfile('stk_acme_pm', [tasks]);
    const taskProfile = profile.tables.find((t) => t.tableId === 'tbl_tasks')!;
    expect(taskProfile.imageColumn?.columnId).toBe('col_task_attachments');
  });
});

describe('isPiiColumn', () => {
  const makeCol = (id: string, name: string, type: string): SchemaColumn => ({
    id, name, type, readOnly: false, isPrimary: false,
  });

  it('returns true for email-type column', () => {
    expect(isPiiColumn(makeCol('c1', 'Contact Email', 'email'))).toBe(true);
  });

  it('returns true for phone-type column', () => {
    expect(isPiiColumn(makeCol('c2', 'Contact Phone', 'phone'))).toBe(true);
  });

  it('returns true for column named "email"', () => {
    expect(isPiiColumn(makeCol('c3', 'email', 'text'))).toBe(true);
  });

  it('returns true for column named "phone"', () => {
    expect(isPiiColumn(makeCol('c4', 'Phone', 'text'))).toBe(true);
  });

  it('returns false for non-PII column', () => {
    expect(isPiiColumn(makeCol('c5', 'Name', 'text'))).toBe(false);
  });

  it('returns false for Status select', () => {
    expect(isPiiColumn(makeCol('c6', 'Status', 'select'))).toBe(false);
  });
});
