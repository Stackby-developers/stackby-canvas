/**
 * Stackby Studio SDK Hooks Library
 *
 * React hooks for accessing Stackby data through the Studio Data Gateway proxy.
 * This library is copied into generated workspaces as lib/stackby-hooks.tsx
 *
 * IMPORTANT USAGE NOTES:
 *
 * Types to import: StackbyRow, Table, Column, Stack
 *
 * Update row format:
 * - Single select columns: pass the option NAME as a string directly
 *   CORRECT:   { Status: 'Active' }
 *   WRONG:     { Status: { name: 'Active' } }
 *
 * - Text/number columns: pass values directly
 *   CORRECT:   { Name: 'New Name', Price: 99 }
 *
 * - Only include columns that have actually changed in the update
 *
 * - Linked row columns: pass an array of row IDs
 *   CORRECT:   { Milestone: ['row_abc123'] }
 *   WRONG:     { Milestone: 'row_abc123' }
 *   CLEAR:     { Milestone: [] }
 */

import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  DATA_INSPECT_ENABLED,
  stackbyInspectId,
  dataInspectorRegistry,
  inspectIdAttrs,
  trackStackbyAggregate,
  trackDerivedValue,
  trackTransform,
  type StackbyDataSource,
  type StackbyAggregateDataSource,
  type AggregateColumnMetadata,
  type DataProvenance,
  type DataSource,
  type DataTransform,
  type DerivedDataSource,
  type JsonValue,
} from './data-inspector';

// Configuration injected at generation time
const STACK_ID = 'stk_placeholder';
const TABLE_IDS: Record<string, string> = {};
const PROJECT_ID = '';

// Generation ID injected at runtime for stackId validation
declare const __GENERATION_ID__: string | null;
const GENERATION_ID = typeof __GENERATION_ID__ !== 'undefined' ? __GENERATION_ID__ : null;

// Compile ID injected at runtime for mid-generation (screenshot tool) previews
declare const __COMPILE_ID__: string | null;
const COMPILE_ID = typeof __COMPILE_ID__ !== 'undefined' ? __COMPILE_ID__ : null;

// Proxy API base URL — all requests route through the Data Gateway
const API_BASE = '/studio/api/proxy';
const PROJECT_ID_HEADER = 'X-Project-Id';
const GENERATION_ID_HEADER = 'X-Generation-Id';
const COMPILE_ID_HEADER = 'X-Compile-Id';

/** Wrapper around fetch that adds Data Gateway routing headers */
function proxyFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (PROJECT_ID && !headers.has(PROJECT_ID_HEADER)) {
    headers.set(PROJECT_ID_HEADER, PROJECT_ID);
  }
  if (GENERATION_ID) {
    headers.set(GENERATION_ID_HEADER, GENERATION_ID);
  }
  if (COMPILE_ID) {
    headers.set(COMPILE_ID_HEADER, COMPILE_ID);
  }
  return fetch(url, { ...init, headers });
}

/**
 * Build a user-facing Error from a non-OK proxy response. The gateway returns a
 * structured JSON error whose `error` field carries the upstream Stackby message,
 * which we surface so the failure is actionable. Falls back to a friendly "busy"
 * message on 429, then to a status-coded message (HTTP/2 carries no statusText).
 */
async function proxyResponseError(response: Response, action: string): Promise<Error> {
  let message = '';
  try {
    const body = await response.json();
    if (body && typeof body.error === 'string') {
      message = body.error;
    }
  } catch {
    // Non-JSON body — fall back to a status-based message below.
  }
  if (!message && response.status === 429) {
    message = 'The data source is busy right now. Please try again in a moment.';
  }
  return new Error(message || `${action}: ${response.statusText || response.status}`);
}

// ============================================================================
// Types
// ============================================================================

/** A column (field) definition in a Stackby table */
export interface Column {
  id: string;
  name: string;
  type: string;
  description?: string;
  options?: {
    choices?: Array<{ id: string; name: string; color?: string }>;
    linkedTableId?: string;
    precision?: number;
    symbol?: string;
    /** Formula expression for computed columns */
    formula?: string;
  };
}

/** A table within a Stackby stack */
export interface Table {
  id: string;
  name: string;
  primaryColumnId: string;
  columns: Column[];
  getColumnById(columnId: string): Column | null;
  getColumnByName(columnName: string): Column | null;
  getColumnIfExists(columnIdOrName: string): Column | null;
}

/** A Stackby stack (equivalent to a base/workspace) */
export interface Stack {
  id: string;
  name: string;
  tables: Table[];
  getTableById(tableId: string): Table | null;
  getTableByName(tableName: string): Table | null;
  getTableIfExists(tableIdOrName: string): Table | null;
}

/** A single row returned from a Stackby table */
export interface StackbyRow {
  id: string;
  createdTime: string;
  fields: { [columnNameOrId: string]: unknown };
  getCellValue(column: Column | string): unknown;
  getCellValueAsString(column: Column | string): string;
  getProvenance(column: Column | string): DataProvenance;
}

export interface UseStackResult {
  stack: Stack | null;
  loading: boolean;
  error: Error | null;
}

export interface UseRowsResult {
  rows: StackbyRow[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface MutationResult<T> {
  mutate: (data: T) => Promise<StackbyRow | null>;
  loading: boolean;
  error: Error | null;
}

/** Single/multi select option value */
export type SelectOption = { id: string; name: string; color?: string };

/** Collaborator / member value */
export type MemberValue = { id: string; email: string; name?: string };

/** Stackby attachment value */
export interface AttachmentValue {
  id: string;
  url?: string;
  filename?: string;
  type?: string;
  size?: number;
  thumbnails?: Record<string, unknown>;
}

export interface AttachmentProxyOptions {
  stackId?: string;
  tableIdOrName: Table | string;
  rowId: string;
  columnIdOrName: Column | string;
  attachmentId?: string;
}

export interface UseAttachmentObjectUrlResult {
  url: string | null;
  loading: boolean;
  error: Error | null;
}

export interface UseAttachmentTextResult {
  text: string | null;
  loading: boolean;
  error: Error | null;
}

export type DelimitedTextRow = Record<string, string>;
export type CsvRow = DelimitedTextRow;

interface StackbySourceContext {
  stackId: string;
  tableId: string;
  tableName: string;
}

// ============================================================================
// Internal Helpers
// ============================================================================

function enhanceTable(tableData: any): Table {
  const table: Table = {
    ...tableData,
    columns: tableData.columns || [],
    getColumnById(columnId: string): Column | null {
      return this.columns.find((c: Column) => c.id === columnId) || null;
    },
    getColumnByName(columnName: string): Column | null {
      return this.columns.find((c: Column) => c.name === columnName) || null;
    },
    getColumnIfExists(columnIdOrName: string): Column | null {
      return this.columns.find((c: Column) => c.id === columnIdOrName || c.name === columnIdOrName) || null;
    },
  };
  return table;
}

function enhanceStack(stackData: any): Stack {
  const tables = (stackData.tables || []).map(enhanceTable);
  const stack: Stack = {
    id: stackData.id,
    name: stackData.name,
    tables,
    getTableById(tableId: string): Table | null {
      return this.tables.find((t: Table) => t.id === tableId) || null;
    },
    getTableByName(tableName: string): Table | null {
      return this.tables.find((t: Table) => t.name === tableName) || null;
    },
    getTableIfExists(tableIdOrName: string): Table | null {
      return this.tables.find((t: Table) => t.id === tableIdOrName || t.name === tableIdOrName) || null;
    },
  };
  return stack;
}

function buildSourceContext(
  stackId: string,
  tableId: string | undefined,
  table: Table | null
): StackbySourceContext {
  return {
    stackId,
    tableId: tableId || table?.id || '',
    tableName: table?.name || '',
  };
}

function resolveColumnMetadata(
  table: Table | undefined,
  column: Column | string
): { columnId?: string; columnName?: string; columnType?: string } {
  if (typeof column === 'string') {
    const resolved = table?.getColumnIfExists(column);
    if (resolved) {
      return { columnId: resolved.id, columnName: resolved.name, columnType: resolved.type };
    }
    return { columnName: column };
  }
  return { columnId: column.id, columnName: column.name, columnType: column.type };
}

function resolveTableIdOrName(tableIdOrName: Table | string): string {
  return typeof tableIdOrName === 'string' ? tableIdOrName : tableIdOrName.id;
}

function resolveColumnIdOrName(columnIdOrName: Column | string): string {
  return typeof columnIdOrName === 'string' ? columnIdOrName : columnIdOrName.id;
}

function getAttachmentId(
  attachment: AttachmentValue | null | undefined,
  options: AttachmentProxyOptions
): string {
  return options.attachmentId || attachment?.id || '';
}

function enhanceRow(
  rowData: any,
  table?: Table,
  sourceContext: StackbySourceContext = buildSourceContext(STACK_ID, table?.id, table || null)
): StackbyRow {
  const row: StackbyRow = {
    id: rowData.id,
    createdTime: rowData.createdTime,
    fields: rowData.fields || {},
    getCellValue(column: Column | string): unknown {
      if (typeof column === 'string') {
        return this.fields[column] ?? null;
      }
      return this.fields[column.name] ?? this.fields[column.id] ?? null;
    },
    getCellValueAsString(column: Column | string): string {
      const value = this.getCellValue(column);
      if (value == null) return '';
      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          return value.map((v: any) => v?.name || String(v)).join(', ');
        }
        if ('name' in (value as any)) {
          return (value as any).name;
        }
        return JSON.stringify(value);
      }
      return String(value);
    },
    getProvenance(column: Column | string): DataProvenance {
      const rawValue = this.getCellValue(column) as JsonValue;
      const { columnId, columnName, columnType } = resolveColumnMetadata(table, column);
      const source: StackbyDataSource = {
        type: 'stackby',
        stackId: sourceContext.stackId || STACK_ID,
        tableId: sourceContext.tableId,
        tableName: sourceContext.tableName,
        rowId: this.id,
        ...(columnId ? { columnId } : {}),
        ...(columnName ? { columnName } : {}),
        ...(columnType ? { columnType } : {}),
      };

      return {
        id: stackbyInspectId(source.stackId, source.tableId, this.id, columnId, columnName),
        source,
        rawValue,
        transforms: [],
      };
    },
  };
  return row;
}

function useInspectRegistration(provenance: DataProvenance | null): void {
  useLayoutEffect(() => {
    if (!provenance) return;
    dataInspectorRegistry.mount(provenance);
    return () => dataInspectorRegistry.unmount(provenance.id);
  }, [provenance]);
}

export function useInspectAttrs(
  row: StackbyRow,
  column: Column | string
): Record<'data-inspect-id', string> | Record<string, never> {
  const provenance = useMemo(
    () => (DATA_INSPECT_ENABLED ? row.getProvenance(column) : null),
    [row, column]
  );
  useInspectRegistration(provenance);
  return useMemo(() => (provenance ? inspectIdAttrs(provenance.id) : {}), [provenance]);
}

// ============================================================================
// Attachment Utilities
// ============================================================================

/**
 * Build the same-origin proxy URL for a Stackby attachment.
 *
 * Do not pass this URL directly to libraries that perform their own fetch unless
 * they can forward the Data Gateway headers. For libraries that accept object
 * URLs, use useAttachmentObjectUrl instead.
 */
export function getAttachmentDownloadUrl(
  attachment: AttachmentValue | null | undefined,
  options: AttachmentProxyOptions
): string {
  const stackId = options.stackId || STACK_ID;
  const tableIdOrName = resolveTableIdOrName(options.tableIdOrName);
  const columnIdOrName = resolveColumnIdOrName(options.columnIdOrName);
  const attachmentId = getAttachmentId(attachment, options);

  return [
    API_BASE,
    'stacks', encodeURIComponent(stackId),
    'tables', encodeURIComponent(tableIdOrName),
    'rows', encodeURIComponent(options.rowId),
    'columns', encodeURIComponent(columnIdOrName),
    'attachments', encodeURIComponent(attachmentId),
    'download',
  ].join('/');
}

export async function fetchAttachmentBlobAsync(
  attachment: AttachmentValue,
  options: AttachmentProxyOptions
): Promise<Blob> {
  const response = await proxyFetch(getAttachmentDownloadUrl(attachment, options));
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const status = `${response.status} ${response.statusText}`.trim();
    throw new Error(`Failed to fetch attachment: ${status}${detail ? ` - ${detail}` : ''}`);
  }
  return response.blob();
}

export async function fetchAttachmentTextAsync(
  attachment: AttachmentValue,
  options: AttachmentProxyOptions
): Promise<string> {
  const blob = await fetchAttachmentBlobAsync(attachment, options);
  return blob.text();
}

export async function createAttachmentObjectUrlAsync(
  attachment: AttachmentValue,
  options: AttachmentProxyOptions
): Promise<string> {
  const blob = await fetchAttachmentBlobAsync(attachment, options);
  return URL.createObjectURL(blob);
}

export function useAttachmentText(
  attachment: AttachmentValue | null | undefined,
  options: AttachmentProxyOptions
): UseAttachmentTextResult {
  const stackId = options.stackId || STACK_ID;
  const tableIdOrName = resolveTableIdOrName(options.tableIdOrName);
  const columnIdOrName = resolveColumnIdOrName(options.columnIdOrName);
  const attachmentId = getAttachmentId(attachment, options);
  const cacheKey = [stackId, tableIdOrName, options.rowId, columnIdOrName, attachmentId].join('\n');

  const [textState, setTextState] = useState<{ key: string; text: string } | null>(null);
  const [loading, setLoading] = useState(Boolean(attachmentId));
  const [error, setError] = useState<Error | null>(null);

  const text = textState?.key === cacheKey ? textState.text : null;

  useEffect(() => {
    if (!attachmentId) {
      setTextState(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const loadedText = await fetchAttachmentTextAsync({ id: attachmentId }, {
          ...options,
          stackId,
          tableIdOrName,
          columnIdOrName,
          attachmentId,
        });
        if (cancelled) return;
        setTextState({ key: cacheKey, text: loadedText });
      } catch (err) {
        if (cancelled) return;
        setTextState(null);
        setError(err instanceof Error ? err : new Error('Failed to fetch attachment text'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [attachmentId, cacheKey, stackId, columnIdOrName, options.rowId, tableIdOrName]);

  return { text, loading, error };
}

export function useAttachmentObjectUrl(
  attachment: AttachmentValue | null | undefined,
  options: AttachmentProxyOptions
): UseAttachmentObjectUrlResult {
  const stackId = options.stackId || STACK_ID;
  const tableIdOrName = resolveTableIdOrName(options.tableIdOrName);
  const columnIdOrName = resolveColumnIdOrName(options.columnIdOrName);
  const attachmentId = getAttachmentId(attachment, options);
  const cacheKey = [stackId, tableIdOrName, options.rowId, columnIdOrName, attachmentId].join('\n');

  const [urlState, setUrlState] = useState<{ key: string; url: string } | null>(null);
  const [loading, setLoading] = useState(Boolean(attachmentId));
  const [error, setError] = useState<Error | null>(null);

  const url = urlState?.key === cacheKey ? urlState.url : null;

  useEffect(() => {
    if (!attachmentId) {
      setUrlState(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const createdUrl = await createAttachmentObjectUrlAsync({ id: attachmentId }, {
          stackId,
          tableIdOrName,
          rowId: options.rowId,
          columnIdOrName,
          attachmentId,
        });
        if (cancelled) {
          URL.revokeObjectURL(createdUrl);
          return;
        }
        objectUrl = createdUrl;
        setUrlState({ key: cacheKey, url: createdUrl });
      } catch (err) {
        if (!cancelled) {
          setUrlState(null);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setUrlState((current) => (current?.url === objectUrl ? null : current));
      }
    };
  }, [attachmentId, cacheKey, stackId, columnIdOrName, options.rowId, tableIdOrName]);

  return { url, loading, error };
}

// ============================================================================
// Delimited Text Helpers
// ============================================================================

function parseDelimitedTextRecords(text: string, delimiter: string): string[][] {
  if (delimiter.length !== 1) {
    throw new Error('Delimited text parser requires a single-character delimiter');
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; }
        else { inQuotes = false; i += 1; }
      } else { field += char; i += 1; }
      continue;
    }
    if (char === '"') { inQuotes = true; i += 1; }
    else if (char === delimiter) { row.push(field); field = ''; i += 1; }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 1; }
    else if (char === '\r') {
      row.push(field); rows.push(row); row = []; field = '';
      i += text[i + 1] === '\n' ? 2 : 1;
    } else { field += char; i += 1; }
  }

  if (inQuotes) throw new Error('Unterminated quoted field in delimited attachment');
  if (field.length > 0 || row.length > 0 || text.endsWith(delimiter)) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Parse delimited attachment text into rows.
 * Uses a hand-rolled parser — the preview iframe CSP disallows unsafe-eval,
 * so libraries that generate JS at runtime cannot be used here.
 */
export function parseDelimitedText(
  text: string,
  options: { delimiter?: string } = {}
): DelimitedTextRow[] {
  const delimiter = options.delimiter ?? ',';
  const records = parseDelimitedTextRecords(text.replace(/^﻿/, ''), delimiter);
  if (records.length === 0) return [];
  const headers = records[0].map((h, i) => h.trim() || `column_${i + 1}`);
  return records.slice(1)
    .filter((r) => r.some((v) => v.trim() !== ''))
    .map((r) => {
      const out: DelimitedTextRow = {};
      const count = Math.max(headers.length, r.length);
      for (let i = 0; i < count; i++) {
        out[headers[i] || `column_${i + 1}`] = r[i] ?? '';
      }
      return out;
    });
}

export function parseCsvText(text: string): CsvRow[] {
  return parseDelimitedText(text, { delimiter: ',' });
}

export function parseTsvText(text: string): DelimitedTextRow[] {
  return parseDelimitedText(text, { delimiter: '\t' });
}

// ============================================================================
// Core Hooks
// ============================================================================

/**
 * Load the full schema of a Stackby stack (all tables and columns).
 */
export function useStack(stackId: string = STACK_ID): UseStackResult {
  const [stack, setStack] = useState<Stack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!stackId) {
      setLoading(false);
      setError(new Error('No stack ID configured'));
      return;
    }

    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const response = await proxyFetch(`${API_BASE}/stacks/${stackId}/schema`);
        if (!response.ok) throw await proxyResponseError(response, 'Failed to fetch stack schema');
        const data = await response.json();
        if (!cancelled) {
          setStack(enhanceStack({ id: stackId, name: data.name || stackId, tables: data.tables }));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [stackId]);

  return { stack, loading, error };
}

/**
 * Load rows from a table. Automatically pages through all results.
 *
 * @param tableOrId - A Table object or table ID string
 * @param options.stackId - Stack ID (defaults to STACK_ID injected at generation time)
 * @param options.columns - Optional list of column names/IDs to fetch (reduces payload)
 * @param options.viewId - Optional view ID to filter and sort by a saved view
 */
export function useRows(
  tableOrId: Table | string | null | undefined,
  options?: { stackId?: string; columns?: string[]; viewId?: string }
): UseRowsResult {
  const [rows, setRows] = useState<StackbyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const stackId = options?.stackId || STACK_ID;
  const tableId = typeof tableOrId === 'string' ? tableOrId : tableOrId?.id;
  const table = typeof tableOrId === 'object' && tableOrId !== null ? tableOrId : null;

  const fetchRows = useCallback(async () => {
    if (!stackId || !tableId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options?.columns?.length) {
        options.columns.forEach((c) => params.append('columns', c));
      }
      if (options?.viewId) {
        params.set('viewId', options.viewId);
      }
      const query = params.toString();
      const url = `${API_BASE}/stacks/${stackId}/tables/${tableId}/rows${query ? `?${query}` : ''}`;

      const response = await proxyFetch(url);
      if (!response.ok) throw await proxyResponseError(response, 'Failed to fetch rows');
      const data = await response.json();
      const sourceContext = buildSourceContext(stackId, tableId, table);
      setRows((data.rows || []).map((r: any) => enhanceRow(r, table || undefined, sourceContext)));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [stackId, tableId, options?.columns?.join(','), options?.viewId, table]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  return { rows, loading, error, refetch: fetchRows };
}

/**
 * Create a new row in a table.
 */
export function useCreateRow(
  tableOrId: Table | string | null | undefined,
  options?: { stackId?: string }
): MutationResult<{ [columnIdOrName: string]: unknown }> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const stackId = options?.stackId || STACK_ID;
  const tableId = typeof tableOrId === 'string' ? tableOrId : tableOrId?.id;
  const table = typeof tableOrId === 'object' && tableOrId !== null ? tableOrId : null;

  const mutate = useCallback(
    async (fields: { [columnIdOrName: string]: unknown }): Promise<StackbyRow | null> => {
      if (!stackId || !tableId) {
        setError(new Error('Table not configured'));
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await proxyFetch(`${API_BASE}/stacks/${stackId}/tables/${tableId}/rows`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
        });
        if (!response.ok) throw new Error(`Failed to create row: ${response.statusText}`);
        const data = await response.json();
        return enhanceRow(data, table || undefined, buildSourceContext(stackId, tableId, table));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [stackId, table, tableId]
  );

  return { mutate, loading, error };
}

/**
 * Update specific columns on an existing row (PATCH — only changed columns).
 *
 * Update format rules:
 * - Single select: pass the option name as a string — { Status: 'Active' }
 * - Multi select: pass an array of option names — { Tags: ['Urgent', 'Review'] }
 * - Linked rows: pass an array of row IDs — { Owner: ['row_abc'] }
 * - Text/number: pass directly — { Name: 'New', Amount: 42 }
 */
export function useUpdateRow(
  tableOrId: Table | string | null | undefined,
  options?: { stackId?: string }
): MutationResult<{ rowId: string; fields: { [columnIdOrName: string]: unknown } }> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const stackId = options?.stackId || STACK_ID;
  const tableId = typeof tableOrId === 'string' ? tableOrId : tableOrId?.id;
  const table = typeof tableOrId === 'object' && tableOrId !== null ? tableOrId : null;

  const mutate = useCallback(
    async (data: { rowId: string; fields: { [columnIdOrName: string]: unknown } }): Promise<StackbyRow | null> => {
      if (!stackId || !tableId) {
        setError(new Error('Table not configured'));
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await proxyFetch(
          `${API_BASE}/stacks/${stackId}/tables/${tableId}/rows/${data.rowId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: data.fields }),
          }
        );
        if (!response.ok) throw new Error(`Failed to update row: ${response.statusText}`);
        const result = await response.json();
        return enhanceRow(result, table || undefined, buildSourceContext(stackId, tableId, table));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [stackId, table, tableId]
  );

  return { mutate, loading, error };
}

/**
 * Delete a row by ID.
 */
export function useDeleteRow(
  tableOrId: Table | string | null | undefined,
  options?: { stackId?: string }
): MutationResult<string> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const stackId = options?.stackId || STACK_ID;
  const tableId = typeof tableOrId === 'string' ? tableOrId : tableOrId?.id;

  const mutate = useCallback(
    async (rowId: string): Promise<StackbyRow | null> => {
      if (!stackId || !tableId) {
        setError(new Error('Table not configured'));
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await proxyFetch(
          `${API_BASE}/stacks/${stackId}/tables/${tableId}/rows/${rowId}`,
          { method: 'DELETE' }
        );
        if (!response.ok) throw new Error(`Failed to delete row: ${response.statusText}`);
        const data = await response.json();
        return data.deleted ? { id: rowId, deleted: true } as any : null;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [stackId, tableId]
  );

  return { mutate, loading, error };
}

/**
 * Upload a file attachment to a row's attachment column.
 */
export function useUploadAttachment(
  tableOrId: Table | string | null | undefined,
  options?: { stackId?: string }
): MutationResult<{ rowId: string; columnIdOrName: string; file: File }> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const stackId = options?.stackId || STACK_ID;
  const tableId = typeof tableOrId === 'string' ? tableOrId : tableOrId?.id;
  const table = typeof tableOrId === 'object' && tableOrId !== null ? tableOrId : null;

  const mutate = useCallback(
    async (data: { rowId: string; columnIdOrName: string; file: File }): Promise<StackbyRow | null> => {
      if (!stackId || !tableId) {
        setError(new Error('Table not configured'));
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const arrayBuffer = await data.file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);

        const response = await proxyFetch(
          `${API_BASE}/stacks/${stackId}/tables/${tableId}/rows/${data.rowId}/columns/${encodeURIComponent(data.columnIdOrName)}/uploadAttachment`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentType: data.file.type || 'application/octet-stream',
              filename: data.file.name,
              file: base64,
            }),
          }
        );
        if (!response.ok) throw new Error(`Failed to upload attachment: ${response.statusText}`);
        const result = await response.json();
        return enhanceRow(result, table || undefined, buildSourceContext(stackId, tableId, table));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [stackId, table, tableId]
  );

  return { mutate, loading, error };
}

// ============================================================================
// Select Column Colors
// ============================================================================

const STACKBY_COLOR_MAP: Record<string, { text: string; bg: string }> = {
  // Blues
  blue: { text: '#fff', bg: '#2563EB' },
  blueLight: { text: '#1e3a5f', bg: '#BFDBFE' },
  blueDark: { text: '#fff', bg: '#1D4ED8' },
  // Cyans
  cyan: { text: '#fff', bg: '#0891B2' },
  cyanLight: { text: '#164e63', bg: '#A5F3FC' },
  cyanDark: { text: '#fff', bg: '#0E7490' },
  // Teals
  teal: { text: '#fff', bg: '#0D9488' },
  tealLight: { text: '#134e4a', bg: '#99F6E4' },
  tealDark: { text: '#fff', bg: '#0F766E' },
  // Greens
  green: { text: '#fff', bg: '#16A34A' },
  greenLight: { text: '#14532d', bg: '#BBF7D0' },
  greenDark: { text: '#fff', bg: '#15803D' },
  // Yellows
  yellow: { text: '#713f12', bg: '#FDE047' },
  yellowLight: { text: '#713f12', bg: '#FEF9C3' },
  yellowDark: { text: '#fff', bg: '#CA8A04' },
  // Oranges
  orange: { text: '#fff', bg: '#EA580C' },
  orangeLight: { text: '#7c2d12', bg: '#FED7AA' },
  orangeDark: { text: '#fff', bg: '#C2410C' },
  // Reds
  red: { text: '#fff', bg: '#DC2626' },
  redLight: { text: '#7f1d1d', bg: '#FECACA' },
  redDark: { text: '#fff', bg: '#B91C1C' },
  // Pinks
  pink: { text: '#fff', bg: '#DB2777' },
  pinkLight: { text: '#831843', bg: '#FBCFE8' },
  pinkDark: { text: '#fff', bg: '#BE185D' },
  // Purples
  purple: { text: '#fff', bg: '#9333EA' },
  purpleLight: { text: '#3b0764', bg: '#E9D5FF' },
  purpleDark: { text: '#fff', bg: '#7E22CE' },
  // Indigos
  indigo: { text: '#fff', bg: '#4F46E5' },
  indigoLight: { text: '#1e1b4b', bg: '#C7D2FE' },
  indigoDark: { text: '#fff', bg: '#4338CA' },
  // Grays
  gray: { text: '#fff', bg: '#6B7280' },
  grayLight: { text: '#111827', bg: '#E5E7EB' },
  grayDark: { text: '#fff', bg: '#374151' },
};

/**
 * Maps a Stackby named color string to inline style values for a chip/pill.
 * Use when rendering single-select or multi-select column values.
 */
export function stackbySelectStyle(color: string | undefined): { color: string; backgroundColor: string } {
  const entry = color ? (STACKBY_COLOR_MAP[color] ?? null) : null;
  return entry
    ? { color: entry.text, backgroundColor: entry.bg }
    : { color: '#111827', backgroundColor: '#e5e7eb' };
}

// ============================================================================
// Utility Components
// ============================================================================

/**
 * Renders a single cell value with appropriate formatting for the column type.
 */
export function CellRenderer({ row, column }: { row: StackbyRow; column: Column | string }): React.JSX.Element {
  const value = row.getCellValue(column);
  const columnObj = typeof column === 'object' ? column : null;
  const columnType = columnObj?.type || 'unknown';
  const provenance = useMemo(
    () => (DATA_INSPECT_ENABLED ? row.getProvenance(column) : null),
    [row, column]
  );
  useInspectRegistration(provenance);
  const attrs = provenance ? inspectIdAttrs(provenance.id) : {};

  if (value == null) {
    return <span {...attrs} className="text-gray-400">—</span> as React.JSX.Element;
  }

  // Rich text / long text
  if ((columnType === 'richText' || columnType === 'longText') && typeof value === 'string') {
    return (
      <div {...attrs} className="prose prose-sm max-w-none">
        <ReactMarkdown>{value}</ReactMarkdown>
      </div>
    ) as React.JSX.Element;
  }

  // Linked rows — render as name pills
  if (columnType === 'link' && Array.isArray(value)) {
    return (
      <div {...attrs} className="flex flex-wrap gap-1">
        {(value as any[]).map((item, i) => {
          const label = typeof item === 'string' ? item : (item?.name || item?.id || String(item));
          return (
            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              {label}
            </span>
          );
        })}
      </div>
    ) as React.JSX.Element;
  }

  // Single select
  if (columnType === 'singleSelect' && typeof value === 'string') {
    const option = columnObj?.options?.choices?.find((c) => c.name === value);
    return (
      <span
        {...attrs}
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={stackbySelectStyle(option?.color)}
      >
        {value}
      </span>
    ) as React.JSX.Element;
  }

  // Multi select
  if (columnType === 'multiSelect' && Array.isArray(value)) {
    return (
      <div {...attrs} className="flex flex-wrap gap-1">
        {(value as string[]).map((name, i) => {
          const option = columnObj?.options?.choices?.find((c) => c.name === name);
          return (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={stackbySelectStyle(option?.color)}
            >
              {name}
            </span>
          );
        })}
      </div>
    ) as React.JSX.Element;
  }

  // Member / collaborator
  if ((columnType === 'member' || columnType === 'multiMember') && value) {
    const members = Array.isArray(value) ? value : [value];
    return (
      <div {...attrs} className="flex flex-wrap gap-1">
        {members.map((m: any, i) => (
          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {m.name || m.email || 'Member'}
          </span>
        ))}
      </div>
    ) as React.JSX.Element;
  }

  // Checkbox / boolean
  if (columnType === 'checkbox') {
    return <span {...attrs}>{value ? '✓' : ''}</span> as React.JSX.Element;
  }

  // URL
  if (columnType === 'url' && typeof value === 'string') {
    return (
      <a {...attrs} href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
        {value}
      </a>
    ) as React.JSX.Element;
  }

  // Email
  if (columnType === 'email' && typeof value === 'string') {
    return (
      <a {...attrs} href={`mailto:${value}`} className="text-blue-600 hover:underline">
        {value}
      </a>
    ) as React.JSX.Element;
  }

  // Rating (1–5 or 1–10)
  if (columnType === 'rating' && typeof value === 'number') {
    return (
      <span {...attrs} className="text-yellow-500">
        {'★'.repeat(value)}{'☆'.repeat(Math.max(0, 5 - value))}
      </span>
    ) as React.JSX.Element;
  }

  // Default: string representation
  return <span {...attrs}>{row.getCellValueAsString(column)}</span> as React.JSX.Element;
}

export function DataValue({
  provenance,
  children,
  className,
  as: Component = 'span',
}: {
  provenance: DataProvenance;
  children: React.ReactNode;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}): React.JSX.Element {
  useInspectRegistration(DATA_INSPECT_ENABLED ? provenance : null);
  return React.createElement(
    Component,
    { ...(DATA_INSPECT_ENABLED ? inspectIdAttrs(provenance.id) : {}), className },
    children
  );
}

// ============================================================================
// Safe Column Access Helpers
// ============================================================================

/** Safely get options from a select column */
export function getColumnOptions(column: Column | null | undefined): SelectOption[] {
  return (column?.options?.choices as SelectOption[]) || [];
}

/** Get linked row IDs from a cell value */
export function getLinkedRowIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v: any) => (typeof v === 'string' ? v : v?.id))
    .filter((id): id is string => typeof id === 'string');
}

/** Get select column value as string — handles both string and object formats */
export function getSelectValue(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'name' in value) {
    return (value as SelectOption).name;
  }
  return null;
}

// ============================================================================
// Current Viewer
// ============================================================================

/** Identity of the person viewing this published artifact */
export interface CurrentViewer {
  id: string | null;
  email: string;
  name: string | null;
}

export interface UseCurrentViewerResult {
  currentViewer: CurrentViewer | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Returns the identity of the person viewing the artifact (email, name, Stackby member ID).
 * Use this to filter rows by viewer, personalise content, or control UI visibility.
 *
 * Returns `{ currentViewer: null }` for unauthenticated viewers and public reports.
 */
export function useCurrentViewer(): UseCurrentViewerResult {
  const [currentViewer, setCurrentViewer] = useState<CurrentViewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCurrentViewer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = new Headers();
      if (GENERATION_ID) headers.set(GENERATION_ID_HEADER, GENERATION_ID);
      const res = await fetch('/studio/api/preview/whoami', { headers });
      // Not an error — no identity available in this context
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        setCurrentViewer(null);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch current viewer');
      setCurrentViewer((await res.json()) as CurrentViewer);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentViewer();
  }, [fetchCurrentViewer]);

  return { currentViewer, loading, error, refetch: fetchCurrentViewer };
}

const IDENTITY_COLUMN_TYPES = new Set(['member', 'multiMember']);

/**
 * Find the row in a table that represents the current viewer.
 *
 * Checks member columns first (matched by Stackby member ID, then email),
 * then falls back to email-type columns. Returns the first match, or null.
 *
 * Member columns are the reliable identity signal — all rows are checked for
 * a member match before any email-column match is considered, so an incidental
 * email column doesn't win over a real member column on a later row.
 */
export function findCurrentViewerRow(
  rows: StackbyRow[],
  table: Table,
  currentViewer: CurrentViewer | null
): StackbyRow | null {
  if (!currentViewer) return null;
  const emailLower = currentViewer.email.toLowerCase();

  const memberColumns = table.columns.filter((c) => IDENTITY_COLUMN_TYPES.has(c.type));
  const emailColumns = table.columns.filter((c) => c.type === 'email');

  for (const row of rows) {
    for (const col of memberColumns) {
      const value = row.getCellValue(col);
      if (value == null) continue;
      const members = Array.isArray(value) ? value : [value];
      for (const m of members) {
        if (m && typeof m === 'object') {
          const mv = m as MemberValue;
          if (
            (currentViewer.id && mv.id === currentViewer.id) ||
            (mv.email && mv.email.toLowerCase() === emailLower)
          ) {
            return row;
          }
        }
      }
    }
  }

  for (const row of rows) {
    for (const col of emailColumns) {
      const str = row.getCellValueAsString(col);
      if (str && str.toLowerCase() === emailLower) return row;
    }
  }

  return null;
}

// ============================================================================
// Exports
// ============================================================================

export {
  STACK_ID,
  TABLE_IDS,
  PROJECT_ID,
  stackbyInspectId,
  dataInspectorRegistry,
  inspectIdAttrs,
  trackStackbyAggregate,
  trackDerivedValue,
  trackTransform,
  type StackbyAggregateDataSource,
  type StackbyDataSource,
  type AggregateColumnMetadata,
  type DataProvenance,
  type DataSource,
  type DataTransform,
  type DerivedDataSource,
};
