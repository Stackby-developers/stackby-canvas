import pLimit from 'p-limit';
import type { GatewayClient } from '../gateway-client.js';
import type { SchemaTable } from './introspect.js';
import { isPiiColumn } from './semantics.js';

export interface ColumnSample {
  columnId: string;
  columnName: string;
  values: unknown[] | null;
  redacted?: { type: string; nullRate: number; cardinality: number };
}

export interface TableSample {
  tableId: string;
  tableName: string;
  rowCount: number;
  columns: ColumnSample[];
  error?: string;
}

function redactColumn(
  rows: Array<{ fields: Record<string, unknown> }>,
  colName: string,
  colType: string,
): NonNullable<ColumnSample['redacted']> {
  const vals = rows.map((r) => r.fields[colName]);
  const nullCount = vals.filter((v) => v == null || v === '').length;
  const unique = new Set(vals.filter((v) => v != null && v !== '')).size;
  return {
    type: colType,
    nullRate: vals.length === 0 ? 0 : nullCount / vals.length,
    cardinality: unique,
  };
}

export async function sampleTables(
  client: GatewayClient,
  stackId: string,
  tables: SchemaTable[],
  rowLimit: number,
): Promise<TableSample[]> {
  const limit = pLimit(5);

  return Promise.all(
    tables.map((table) =>
      limit(async (): Promise<TableSample> => {
        try {
          const response = await client.getTableRows(stackId, table.id, rowLimit);
          const rows = response.rows;

          const columns: ColumnSample[] = table.columns.map((col) => {
            if (isPiiColumn(col)) {
              return {
                columnId: col.id,
                columnName: col.name,
                values: null,
                redacted: redactColumn(rows, col.name, col.type),
              };
            }
            return {
              columnId: col.id,
              columnName: col.name,
              values: rows.map((r) => r.fields[col.name] ?? null),
            };
          });

          return { tableId: table.id, tableName: table.name, rowCount: rows.length, columns };
        } catch (err) {
          return {
            tableId: table.id,
            tableName: table.name,
            rowCount: 0,
            columns: [],
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    ),
  );
}
