import { describe, it, expect } from 'vitest';
import { generateTypes } from '../lib/type-gen.js';
import { introspectStack } from '../lib/introspect.js';
import { vi } from 'vitest';
import type { GatewayClient } from '../gateway-client.js';
import fullStack from '../__fixtures__/full-stack.json' with { type: 'json' };
import ts from 'typescript';

async function buildTables() {
  const client: GatewayClient = {
    getStackSchema: vi.fn().mockResolvedValue(fullStack),
    getTableRows: vi.fn().mockResolvedValue({ rows: [] }),
  } as unknown as GatewayClient;
  const graph = await introspectStack(client, 'stk_acme_pm');
  return graph.tables;
}

describe('generateTypes', () => {
  it('generates TasksRowStatus union type', async () => {
    const tables = await buildTables();
    const output = generateTypes(tables);
    expect(output).toContain('export type TasksStatus =');
    expect(output).toContain('"Todo"');
    expect(output).toContain('"In Progress"');
    expect(output).toContain('"Done"');
  });

  it('generates TasksRow interface', async () => {
    const tables = await buildTables();
    const output = generateTypes(tables);
    expect(output).toContain('export interface TasksRow {');
  });

  it('marks readonly columns as readonly', async () => {
    const tables = await buildTables();
    const output = generateTypes(tables);
    // Find the TasksRow interface body
    const interfaceStart = output.indexOf('export interface TasksRow {');
    const interfaceEnd = output.indexOf('\n}', interfaceStart);
    const body = output.slice(interfaceStart, interfaceEnd);
    expect(body).toContain('readonly Total_Cost:');
    expect(body).toContain('readonly Task__:');   // autoNumber "Task #" → sanitized
    expect(body).toContain('readonly Created_Time:');
  });

  it('generates CollaboratorValue and AttachmentValue helpers', async () => {
    const tables = await buildTables();
    const output = generateTypes(tables);
    expect(output).toContain('export interface CollaboratorValue {');
    expect(output).toContain('export interface AttachmentValue {');
  });

  it('output compiles without syntax errors via TypeScript transpileModule', async () => {
    const tables = await buildTables();
    const output = generateTypes(tables);

    const result = ts.transpileModule(output, {
      reportDiagnostics: true,
      compilerOptions: {
        strict: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    });

    const syntaxErrors = (result.diagnostics ?? []).filter(
      (d) => d.category === ts.DiagnosticCategory.Error,
    );
    expect(syntaxErrors).toHaveLength(0);
  });

  it('generates multiSelect as Array<...>', async () => {
    const tables = await buildTables();
    const output = generateTypes(tables);
    expect(output).toContain('Array<TasksTags>');
  });

  it('generates link as string[]', async () => {
    const tables = await buildTables();
    const output = generateTypes(tables);
    expect(output).toContain('Project: string[]');
  });

  it('generates checkbox as boolean', async () => {
    const tables = await buildTables();
    const output = generateTypes(tables);
    expect(output).toContain('Billable: boolean');
  });
});
