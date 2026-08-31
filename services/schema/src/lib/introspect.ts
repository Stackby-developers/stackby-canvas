import { createHash } from 'node:crypto';
import pLimit from 'p-limit';
import { READ_ONLY_COLUMN_TYPES } from '@stackby/schema-types';
import type { GatewayClient, GatewayTable, GatewayColumn } from '../gateway-client.js';

export interface SchemaColumn {
  id: string;
  name: string;
  type: string;
  options?: Record<string, unknown>;
  readOnly: boolean;
  isPrimary: boolean;
}

export interface SchemaView {
  id: string;
  name: string;
  type: string;
}

export interface SchemaRelationship {
  fromColumnId: string;
  toTableId: string;
  kind: 'link' | 'lookup' | 'rollup' | 'count';
  viaColumnId?: string;
}

export interface SchemaTable {
  id: string;
  name: string;
  columns: SchemaColumn[];
  views: SchemaView[];
  relationships: SchemaRelationship[];
  error?: string;
}

export interface SchemaGraph {
  stackId: string;
  stackName: string;
  tables: SchemaTable[];
  fetchedAt: string;
  hash: string;
}

const RELATIONSHIP_TYPES = new Set(['link', 'lookup', 'rollup', 'count']);
const readOnlySet: Set<string> = READ_ONLY_COLUMN_TYPES as unknown as Set<string>;

function buildRelationships(columns: GatewayColumn[]): SchemaRelationship[] {
  const relationships: SchemaRelationship[] = [];
  for (const col of columns) {
    if (!RELATIONSHIP_TYPES.has(col.type)) continue;
    const linkedTableId = col.options?.linkedTableId;
    if (!linkedTableId) continue;
    const kind = col.type as 'link' | 'lookup' | 'rollup' | 'count';
    const viaColumnId = col.options?.linkedColumnId;
    relationships.push({
      fromColumnId: col.id,
      toTableId: linkedTableId,
      kind,
      ...(viaColumnId ? { viaColumnId } : {}),
    });
  }
  return relationships;
}

function normaliseTable(raw: GatewayTable): SchemaTable {
  const columns: SchemaColumn[] = raw.columns.map((col) => {
    const base = {
      id: col.id,
      name: col.name,
      type: col.type,
      readOnly: readOnlySet.has(col.type),
      isPrimary: col.id === raw.primaryColumnId,
    };
    return col.options
      ? { ...base, options: col.options as Record<string, unknown> }
      : base;
  });

  return {
    id: raw.id,
    name: raw.name,
    columns,
    views: raw.views.map((v) => ({ id: v.id, name: v.name, type: v.type })),
    relationships: buildRelationships(raw.columns),
  };
}

function hashGraph(tables: SchemaTable[]): string {
  const sorted = [...tables]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((t) => ({
      id: t.id,
      cols: [...t.columns]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((c) => ({ id: c.id, name: c.name, type: c.type })),
    }));
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex').slice(0, 16);
}

export async function introspectStack(
  client: GatewayClient,
  stackId: string,
): Promise<SchemaGraph> {
  const raw = await client.getStackSchema(stackId);
  const limit = pLimit(5);

  const tables = await Promise.all(
    raw.tables.map((rawTable) =>
      limit(async (): Promise<SchemaTable> => {
        try {
          return normaliseTable(rawTable);
        } catch (err) {
          // Never fail the whole introspection because one table errors
          return {
            id: rawTable.id,
            name: rawTable.name,
            columns: [],
            views: [],
            relationships: [],
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    ),
  );

  return {
    stackId,
    stackName: raw.stackName,
    tables,
    fetchedAt: new Date().toISOString(),
    hash: hashGraph(tables),
  };
}
