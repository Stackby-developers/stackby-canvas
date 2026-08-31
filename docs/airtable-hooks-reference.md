# Airtable API Hooks Library — Reference

> **Purpose:** This file is the canonical reference implementation for the Airtable hooks library. The Stackby equivalent lives at [`lib/stackby-hooks.tsx`](../lib/stackby-hooks.tsx).

```tsx
/**
 * Airtable API Hooks Library
 *
 * React hooks for accessing Airtable data through the preview server proxy.
 * This library is copied into generated workspaces as lib/airtable-hooks.tsx
 *
 * IMPORTANT USAGE NOTES:
 *
 * Types to import: AirtableRecord, Table, Field, Base
 *
 * Update record format:
 * - Single select fields: pass the choice NAME as a string directly
 *   CORRECT:   { Status: 'Active' }
 *   WRONG:     { Status: { name: 'Active' } }
 *
 * - Text/number fields: pass values directly
 *   CORRECT:   { Name: 'New Name', Price: 99 }
 *
 * - Only include fields that have actually changed in the update
 *
 * - Linked record fields: pass an array of record IDs
 *   CORRECT:   { Milestone: ['recABC123'] }
 *   WRONG:     { Milestone: 'recABC123' }
 *   CLEAR:     { Milestone: [] }
 */

import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  DATA_INSPECT_ENABLED,
  airtableInspectId,
  dataInspectorRegistry,
  inspectIdAttrs,
  trackAirtableAggregate,
  trackDerivedValue,
  trackTransform,
  type AirtableDataSource,
  type AirtableAggregateDataSource,
  type AggregateFieldMetadata,
  type DataProvenance,
  type DataSource,
  type DataTransform,
  type DerivedDataSource,
  type JsonValue,
} from './data-inspector';

// Configuration injected at generation time
const BASE_ID = 'appFbsa9WYvsP58Yb';
const TABLE_IDS: Record<string, string> = {
  "employment_change_form": "tbl6oN3GZc4RW9jgI",
  "employee_list_copy": "tbl8aZOE4rrEUHN3p",
  "budget_form_2025": "tblbMMqBJ3219RwTP",
  "test": "tbl1bFHg4gIzoGTwT",
  "table_7": "tbl7ZUBZaU4IYaII1",
  "new_table": "tbldiGQUALUWDnx9G",
  "companies": "tbl9G5KbTLRDuRxV7",
  "open_positions": "tblM7mGkEsivPiTJE",
  "documents": "tblfrizebdyFYYAHf",
  "imported_table": "tblcE0GFYVDz8q3Tv",
  "table_11": "tblcbJNbC1EaGN1Iv",
  "table_12": "tblFi0I5W7WbRFL6F",
  "influencers": "tbludddhrA9gX7u6V",
  "youtube_no-code_influencer_list": "tblibhz6rzGZas1dC",
  "table_15": "tblCZ7vKt309Pnjam",
  "table_16": "tblgp8fQtYSQXAhcR",
  "campaign": "tbl3fkAe3jRoLwvsJ",
  "products": "tblLRk6qHWX6PfMwh",
  "specs_&_features": "tblumon5wBZmbif5E",
  "kpis": "tblWAJzaaYyug9BmA",
  "athletes": "tblBXeYuFzBP0f9oI",
  "events": "tblWFxCt8fb5bE0qn",
  "press_reviews": "tblwyFT1m2JW3VbLR",
  "campaign_concepts": "tblutjP8mwsb0mVTL"
};
const PROJECT_ID = 'a1ef94f4-fa34-4ff1-8004-9fcc2c709240';

// Generation ID injected at runtime for baseId validation
declare const __GENERATION_ID__: string | null;
const GENERATION_ID = typeof __GENERATION_ID__ !== 'undefined' ? __GENERATION_ID__ : null;

// Compile ID injected at runtime for mid-generation (screenshot tool) previews,
// which have no saved generation yet — the server validates X-Compile-Id
// against its compile preview registry instead of X-Generation-Id.
declare const __COMPILE_ID__: string | null;
const COMPILE_ID = typeof __COMPILE_ID__ !== 'undefined' ? __COMPILE_ID__ : null;

// Proxy API base URL
const API_BASE = '/canvas/api/proxy';
const PROJECT_ID_HEADER = 'X-Project-Id';
const GENERATION_ID_HEADER = 'X-Generation-Id';
const COMPILE_ID_HEADER = 'X-Compile-Id';

/** Wrapper around fetch that preserves proxy headers and adds generation validation context */
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
 * Build a user-facing Error from a non-OK proxy response. The proxy returns a
 * structured JSON error whose `error` field carries the upstream Airtable
 * message (e.g. an UNKNOWN_FIELD_NAME detail), which we surface so the failure
 * is actionable when pasted into chat. Falls back to a friendly "busy" message
 * on 429, then to a status-coded message (HTTP/2 carries no statusText, so we
 * include the numeric status to avoid an empty message).
 */
async function proxyResponseError(response: Response, action: string): Promise<Error> {
  // The proxy returns a structured JSON error whose `error` field carries the
  // upstream Airtable message (e.g. an UNKNOWN_FIELD_NAME detail) — surface it so
  // the error is actionable when pasted into chat. The response body is read at
  // most once here (only on the non-ok path; the ok path reads it separately).
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

export interface Field {
  id: string;
  name: string;
  type: string;
  description?: string;
  options?: {
    choices?: Array<{ id: string; name: string; color?: string }>;
    linkedTableId?: string;
    precision?: number;
    symbol?: string;
  };
}

export interface Table {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: Field[];
  getFieldById(fieldId: string): Field | null;
  getFieldByName(fieldName: string): Field | null;
  getFieldIfExists(fieldIdOrName: string): Field | null;
}

export interface Base {
  id: string;
  name: string;
  tables: Table[];
  getTableById(tableId: string): Table | null;
  getTableByName(tableName: string): Table | null;
  getTableIfExists(tableIdOrName: string): Table | null;
}

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: { [fieldNameOrId: string]: unknown };
  getCellValue(field: Field | string): unknown;
  getCellValueAsString(field: Field | string): string;
  getProvenance(field: Field | string): DataProvenance;
}

export interface UseBaseResult {
  base: Base | null;
  loading: boolean;
  error: Error | null;
}


export interface UseRecordsResult {
  records: AirtableRecord[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface MutationResult<T> {
  mutate: (data: T) => Promise<AirtableRecord | null>;
  loading: boolean;
  error: Error | null;
}

/** Single/multi select choice value */
export type SelectChoice = { id: string; name: string; color?: string };

/** Collaborator value */
export type CollaboratorValue = { id: string; email: string; name?: string };

/** Airtable attachment value */
export interface AttachmentValue {
  id: string;
  url?: string;
  filename?: string;
  type?: string;
  size?: number;
  thumbnails?: Record<string, unknown>;
}

export interface AttachmentProxyOptions {
  baseId?: string;
  tableIdOrName: Table | string;
  recordId: string;
  fieldIdOrName: Field | string;
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

interface AirtableSourceContext {
  baseId: string;
  tableId: string;
  tableName: string;
}

// ============================================================================
// Internal Helpers
// ============================================================================

function enhanceTable(tableData: any): Table {
  const table: Table = {
    ...tableData,
    fields: tableData.fields || [],
    getFieldById(fieldId: string): Field | null {
      return this.fields.find((f: Field) => f.id === fieldId) || null;
    },
    getFieldByName(fieldName: string): Field | null {
      return this.fields.find((f: Field) => f.name === fieldName) || null;
    },
    getFieldIfExists(fieldIdOrName: string): Field | null {
      return this.fields.find((f: Field) => f.id === fieldIdOrName || f.name === fieldIdOrName) || null;
    },
  };
  return table;
}

function enhanceBase(baseData: any): Base {
  const tables = (baseData.tables || []).map(enhanceTable);
  const base: Base = {
    id: baseData.id,
    name: baseData.name,
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
  return base;
}

function buildSourceContext(
  baseId: string,
  tableId: string | undefined,
  table: Table | null
): AirtableSourceContext {
  return {
    baseId,
    tableId: tableId || table?.id || '',
    tableName: table?.name || '',
  };
}

function resolveFieldMetadata(
  table: Table | undefined,
  field: Field | string
): { fieldId?: string; fieldName?: string; fieldType?: string } {
  if (typeof field === 'string') {
    const resolved = table?.getFieldIfExists(field);
    if (resolved) {
      return { fieldId: resolved.id, fieldName: resolved.name, fieldType: resolved.type };
    }
    return { fieldName: field };
  }
  return { fieldId: field.id, fieldName: field.name, fieldType: field.type };
}

/**
 * Extract the text value from an Airtable AI field value (aiText, etc.).
 * Returns undefined if the value is not an AI field, null if it is but has no text
 * (empty/loading/error state), or the generated string if available.
 */
export function getAiFieldValue(value: unknown): string | null | undefined {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const obj = value as Record<string, unknown>;
  const state = obj['state'] ?? obj['stage'];
  if (state === undefined) return undefined;
  if (state === 'generated' && obj['value'] != null) return String(obj['value']);
  return null;
}

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
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += char;
        i += 1;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
      i += 1;
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
    } else if (char === '\r') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += text[i + 1] === '\n' ? 2 : 1;
    } else {
      field += char;
      i += 1;
    }
  }

  if (inQuotes) {
    throw new Error('Unterminated quoted field in delimited attachment');
  }

  if (field.length > 0 || row.length > 0 || text.endsWith(delimiter)) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Parse delimited attachment text into rows without using eval/new Function.
 *
 * Some popular parsers generate JavaScript at runtime for speed. The preview
 * iframe CSP disallows unsafe-eval, so generated code should use this helper for
 * attachment-backed delimited data.
 */
export function parseDelimitedText(
  text: string,
  options: { delimiter?: string } = {}
): DelimitedTextRow[] {
  const delimiter = options.delimiter ?? ',';
  const records = parseDelimitedTextRecords(text.replace(/^﻿/, ''), delimiter);
  if (records.length === 0) return [];

  const headers = records[0].map((header, index) => header.trim() || `column_${index + 1}`);
  return records.slice(1)
    .filter((record) => record.some((value) => value.trim() !== ''))
    .map((record) => {
      const row: DelimitedTextRow = {};
      const columnCount = Math.max(headers.length, record.length);
      for (let index = 0; index < columnCount; index += 1) {
        const header = headers[index] || `column_${index + 1}`;
        row[header] = record[index] ?? '';
      }
      return row;
    });
}

export function parseCsvText(text: string): CsvRow[] {
  return parseDelimitedText(text, { delimiter: ',' });
}

export function parseTsvText(text: string): DelimitedTextRow[] {
  return parseDelimitedText(text, { delimiter: '\t' });
}

function enhanceRecord(
  recordData: any,
  table?: Table,
  sourceContext: AirtableSourceContext = buildSourceContext(BASE_ID, table?.id, table || null)
): AirtableRecord {
  const record: AirtableRecord = {
    id: recordData.id,
    createdTime: recordData.createdTime,
    fields: recordData.fields || {},
    getCellValue(field: Field | string): unknown {
      if (typeof field === 'string') {
        // Try field name first, then field ID
        return this.fields[field] ?? null;
      }
      // For Field object, try both name and ID
      return this.fields[field.name] ?? this.fields[field.id] ?? null;
    },
    getCellValueAsString(field: Field | string): string {
      const value = this.getCellValue(field);
      if (value == null) return '';
      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          return value.map((v: any) => v?.name || String(v)).join(', ');
        }
        const aiText = getAiFieldValue(value);
        if (aiText !== undefined) return aiText ?? '';
        if ('name' in (value as any)) {
          return (value as any).name;
        }
        return JSON.stringify(value);
      }
      return String(value);
    },
    getProvenance(field: Field | string): DataProvenance {
      const rawValue = this.getCellValue(field) as JsonValue;
      const { fieldId, fieldName, fieldType } = resolveFieldMetadata(table, field);
      const source: AirtableDataSource = {
        type: 'airtable',
        baseId: sourceContext.baseId || BASE_ID,
        tableId: sourceContext.tableId,
        tableName: sourceContext.tableName,
        recordId: this.id,
        ...(fieldId ? { fieldId } : {}),
        ...(fieldName ? { fieldName } : {}),
        ...(fieldType ? { fieldType } : {}),
      };

      return {
        id: airtableInspectId(source.baseId, source.tableId, this.id, fieldId, fieldName),
        source,
        rawValue,
        transforms: [],
      };
    },
  };
  return record;
}

// Registers provenance only for committed renders. The caller memoizes provenance,
// so re-running this effect when provenance changes keeps registry content fresh
// while still cleaning up the previously mounted ID correctly.
function useInspectRegistration(provenance: DataProvenance | null): void {
  useLayoutEffect(() => {
    if (!provenance) return;
    dataInspectorRegistry.mount(provenance);
    return () => dataInspectorRegistry.unmount(provenance.id);
  }, [provenance]);
}

export function useInspectAttrs(
  record: AirtableRecord,
  field: Field | string
): Record<'data-inspect-id', string> | Record<string, never> {
  const provenance = useMemo(
    () => (DATA_INSPECT_ENABLED ? record.getProvenance(field) : null),
    [record, field]
  );
  useInspectRegistration(provenance);
  return useMemo(() => (provenance ? inspectIdAttrs(provenance.id) : {}), [provenance]);
}

function resolveTableIdOrName(tableIdOrName: Table | string): string {
  return typeof tableIdOrName === 'string' ? tableIdOrName : tableIdOrName.id;
}

function resolveFieldIdOrName(fieldIdOrName: Field | string): string {
  return typeof fieldIdOrName === 'string' ? fieldIdOrName : fieldIdOrName.id;
}

function getAttachmentId(
  attachment: AttachmentValue | null | undefined,
  options: AttachmentProxyOptions
): string {
  return options.attachmentId || attachment?.id || '';
}

/**
 * Build the same-origin proxy URL for an Airtable attachment.
 *
 * Do not pass this URL directly to libraries that perform their own fetch
 * unless they can send the proxy headers from proxyFetch. In preview iframes,
 * the attachment proxy requires those headers for generation/project scoping.
 * For libraries that accept object URLs, use useAttachmentObjectUrl instead.
 * For text/CSV data libraries, fetch and parse the text first: Vega and
 * Vega-Lite's default loaders reject blob: URLs during URI sanitization.
 */
export function getAttachmentDownloadUrl(
  attachment: AttachmentValue | null | undefined,
  options: AttachmentProxyOptions
): string {
  const baseId = options.baseId || BASE_ID;
  const tableIdOrName = resolveTableIdOrName(options.tableIdOrName);
  const fieldIdOrName = resolveFieldIdOrName(options.fieldIdOrName);
  const attachmentId = getAttachmentId(attachment, options);
  const encodedBaseId = encodeURIComponent(baseId);
  const encodedTableIdOrName = encodeURIComponent(tableIdOrName);
  const encodedRecordId = encodeURIComponent(options.recordId);
  const encodedFieldIdOrName = encodeURIComponent(fieldIdOrName);
  const encodedAttachmentId = encodeURIComponent(attachmentId);

  return `${API_BASE}/bases/${encodedBaseId}/tables/${encodedTableIdOrName}/records/${encodedRecordId}/fields/${encodedFieldIdOrName}/attachments/${encodedAttachmentId}/download`;
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
  const baseId = options.baseId || BASE_ID;
  const tableIdOrName = resolveTableIdOrName(options.tableIdOrName);
  const fieldIdOrName = resolveFieldIdOrName(options.fieldIdOrName);
  const attachmentId = getAttachmentId(attachment, options);
  const attachmentTextKey = [baseId, tableIdOrName, options.recordId, fieldIdOrName, attachmentId].join('\n');

  const [textState, setTextState] = useState<{ key: string; text: string } | null>(null);
  const [loading, setLoading] = useState(Boolean(attachmentId));
  const [error, setError] = useState<Error | null>(null);

  const text = textState?.key === attachmentTextKey ? textState.text : null;

  useEffect(() => {
    if (!attachmentId) {
      setTextState(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadAttachmentTextAsync() {
      setLoading(true);
      setError(null);

      try {
        const loadedText = await fetchAttachmentTextAsync({ id: attachmentId }, {
          ...options,
          baseId,
          tableIdOrName,
          fieldIdOrName,
          attachmentId,
        });
        if (cancelled) return;
        setTextState({ key: attachmentTextKey, text: loadedText });
      } catch (err) {
        if (cancelled) return;
        setTextState(null);
        setError(err instanceof Error ? err : new Error('Failed to fetch attachment text'));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAttachmentTextAsync();

    return () => {
      cancelled = true;
    };
  }, [attachmentId, attachmentTextKey, baseId, fieldIdOrName, options.recordId, tableIdOrName]);

  return { text, loading, error };
}

export function useAttachmentObjectUrl(
  attachment: AttachmentValue | null | undefined,
  options: AttachmentProxyOptions
): UseAttachmentObjectUrlResult {
  const baseId = options.baseId || BASE_ID;
  const tableIdOrName = resolveTableIdOrName(options.tableIdOrName);
  const fieldIdOrName = resolveFieldIdOrName(options.fieldIdOrName);
  const attachmentId = getAttachmentId(attachment, options);
  const attachmentUrlKey = [baseId, tableIdOrName, options.recordId, fieldIdOrName, attachmentId].join('\n');

  const [urlState, setUrlState] = useState<{ key: string; url: string } | null>(null);
  const [loading, setLoading] = useState(Boolean(attachmentId));
  const [error, setError] = useState<Error | null>(null);

  const url = urlState?.key === attachmentUrlKey ? urlState.url : null;

  useEffect(() => {
    if (!attachmentId) {
      setUrlState(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadAttachmentAsync() {
      setLoading(true);
      setError(null);

      try {
        const createdUrl = await createAttachmentObjectUrlAsync({ id: attachmentId }, {
          baseId,
          tableIdOrName,
          recordId: options.recordId,
          fieldIdOrName,
          attachmentId,
        });
        if (cancelled) {
          URL.revokeObjectURL(createdUrl);
          return;
        }
        objectUrl = createdUrl;
        setUrlState({ key: attachmentUrlKey, url: createdUrl });
      } catch (err) {
        if (!cancelled) {
          setUrlState(null);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAttachmentAsync();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setUrlState((current) => (current?.url === objectUrl ? null : current));
      }
    };
  }, [attachmentId, attachmentUrlKey, baseId, fieldIdOrName, options.recordId, tableIdOrName]);

  return { url, loading, error };
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to load the base schema including all tables and fields
 */
export function useBase(baseId: string = BASE_ID): UseBaseResult {
  const [base, setBase] = useState<Base | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!baseId) {
      setLoading(false);
      setError(new Error('No base ID configured'));
      return;
    }

    let cancelled = false;

    async function fetchBase() {
      setLoading(true);
      setError(null);

      try {
        const response = await proxyFetch(`${API_BASE}/bases/${baseId}/schema`);
        if (!response.ok) {
          throw await proxyResponseError(response, 'Failed to fetch base schema');
        }
        const data = await response.json();
        if (!cancelled) {
          setBase(enhanceBase({ id: baseId, name: data.name || baseId, tables: data.tables }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchBase();

    return () => {
      cancelled = true;
    };
  }, [baseId]);

  return { base, loading, error };
}

/**
 * Hook to load records from a table
 */
export function useRecords(
  tableOrId: Table | string | null | undefined,
  options?: { baseId?: string; fields?: string[] }
): UseRecordsResult {
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const baseId = options?.baseId || BASE_ID;
  const tableId = typeof tableOrId === 'string' ? tableOrId : tableOrId?.id;
  const table = typeof tableOrId === 'object' ? tableOrId : null;

  const fetchRecords = useCallback(async () => {
    if (!baseId || !tableId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let url = `${API_BASE}/bases/${baseId}/tables/${tableId}/records`;
      if (options?.fields && options.fields.length > 0) {
        url += `?fields=${options.fields.map(encodeURIComponent).join(',')}`;
      }

      const response = await proxyFetch(url);
      if (!response.ok) {
        throw await proxyResponseError(response, 'Failed to fetch records');
      }
      const data = await response.json();
      const sourceContext = buildSourceContext(baseId, tableId, table);
      const enhancedRecords = (data.records || []).map((r: any) =>
        enhanceRecord(r, table || undefined, sourceContext)
      );
      setRecords(enhancedRecords);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [baseId, tableId, options?.fields?.join(','), table]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { records, loading, error, refetch: fetchRecords };
}

/**
 * Hook to create a new record
 */
export function useCreateRecord(
  tableOrId: Table | string | null | undefined,
  options?: { baseId?: string }
): MutationResult<{ [fieldIdOrName: string]: unknown }> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const baseId = options?.baseId || BASE_ID;
  const tableId = typeof tableOrId === 'string' ? tableOrId : tableOrId?.id;
  const table = typeof tableOrId === 'object' ? tableOrId : null;

  const mutate = useCallback(
    async (fields: { [fieldIdOrName: string]: unknown }): Promise<AirtableRecord | null> => {
      if (!baseId || !tableId) {
        setError(new Error('Table not configured'));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await proxyFetch(`${API_BASE}/bases/${baseId}/tables/${tableId}/records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create record: ${response.statusText}`);
        }

        const data = await response.json();
        return enhanceRecord(data, table || undefined, buildSourceContext(baseId, tableId, table));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseId, table, tableId]
  );

  return { mutate, loading, error };
}

/**
 * Hook to update an existing record
 */
export function useUpdateRecord(
  tableOrId: Table | string | null | undefined,
  options?: { baseId?: string }
): MutationResult<{ recordId: string; fields: { [fieldIdOrName: string]: unknown } }> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const baseId = options?.baseId || BASE_ID;
  const tableId = typeof tableOrId === 'string' ? tableOrId : tableOrId?.id;
  const table = typeof tableOrId === 'object' ? tableOrId : null;

  const mutate = useCallback(
    async (data: { recordId: string; fields: { [fieldIdOrName: string]: unknown } }): Promise<AirtableRecord | null> => {
      if (!baseId || !tableId) {
        setError(new Error('Table not configured'));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await proxyFetch(
          `${API_BASE}/bases/${baseId}/tables/${tableId}/records/${data.recordId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: data.fields }),
          }
        );

        if (!response.ok) {
          console.error(response);
          throw new Error(`Failed to update record: ${response.statusText}`);
        }

        const result = await response.json();
        return enhanceRecord(
          result,
          table || undefined,
          buildSourceContext(baseId, tableId, table)
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseId, table, tableId]
  );

  return { mutate, loading, error };
}

/**
 * Hook to delete a record
 */
export function useDeleteRecord(
  tableOrId: Table | string | null | undefined,
  options?: { baseId?: string }
): MutationResult<string> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const baseId = options?.baseId || BASE_ID;
  const tableId = typeof tableOrId === 'string' ? tableOrId : tableOrId?.id;

  const mutate = useCallback(
    async (recordId: string): Promise<AirtableRecord | null> => {
      if (!baseId || !tableId) {
        setError(new Error('Table not configured'));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await proxyFetch(
          `${API_BASE}/bases/${baseId}/tables/${tableId}/records/${recordId}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          throw new Error(`Failed to delete record: ${response.statusText}`);
        }

        const data = await response.json();
        return data.deleted ? { id: recordId, deleted: true } as any : null;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseId, tableId]
  );

  return { mutate, loading, error };
}

/**
 * Hook to upload an attachment to a record's attachment field
 */
export function useUploadAttachment(
  tableOrId: Table | string | null | undefined,
  options?: { baseId?: string }
): MutationResult<{ recordId: string; fieldIdOrName: string; file: File }> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const baseId = options?.baseId || BASE_ID;
  const tableId = typeof tableOrId === 'string' ? tableOrId : tableOrId?.id;
  const table = typeof tableOrId === 'object' ? tableOrId : null;

  const mutate = useCallback(
    async (data: { recordId: string; fieldIdOrName: string; file: File }): Promise<AirtableRecord | null> => {
      if (!baseId || !tableId) {
        setError(new Error('Table not configured'));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const arrayBuffer = await data.file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        const response = await proxyFetch(
          `${API_BASE}/bases/${baseId}/tables/${tableId}/records/${data.recordId}/fields/${encodeURIComponent(data.fieldIdOrName)}/uploadAttachment`,
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

        if (!response.ok) {
          throw new Error(`Failed to upload attachment: ${response.statusText}`);
        }

        const result = await response.json();
        return enhanceRecord(
          result,
          table || undefined,
          buildSourceContext(baseId, tableId, table)
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseId, table, tableId]
  );

  return { mutate, loading, error };
}

// ============================================================================
// Select Field Colors
// ============================================================================

const AIRTABLE_COLOR_MAP: Record<string, {text: string; bg: string}> = {
  blue: {text: '#fff', bg: '#166EE1'},
  blueLight: {text: '#111827', bg: '#A0C6FF'},
  blueLight1: {text: '#111827', bg: '#A0C6FF'},
  blueLight2: {text: '#111827', bg: '#D1E2FF'},
  blueLight3: {text: '#111827', bg: '#F1F5FF'},
  blueDark: {text: '#fff', bg: '#0D52AC'},
  blueDark1: {text: '#fff', bg: '#0D52AC'},
  blueDusty: {text: '#fff', bg: '#0D52AC'},
  cyan: {text: '#111827', bg: '#39CAFF'},
  cyanLight: {text: '#111827', bg: '#88DBFF'},
  cyanLight1: {text: '#111827', bg: '#88DBFF'},
  cyanLight2: {text: '#111827', bg: '#C4ECFF'},
  cyanLight3: {text: '#111827', bg: '#E3FAFD'},
  cyanDark: {text: '#fff', bg: '#0F68A2'},
  cyanDark1: {text: '#fff', bg: '#0F68A2'},
  cyanDusty: {text: '#fff', bg: '#0F68A2'},
  teal: {text: '#111827', bg: '#01DDD5'},
  tealLight: {text: '#111827', bg: '#74EBE1'},
  tealLight1: {text: '#111827', bg: '#74EBE1'},
  tealLight2: {text: '#111827', bg: '#C1F5F0'},
  tealLight3: {text: '#111827', bg: '#E4FBFB'},
  tealDark: {text: '#fff', bg: '#17726E'},
  tealDark1: {text: '#fff', bg: '#17726E'},
  tealDusty: {text: '#fff', bg: '#17726E'},
  green: {text: '#fff', bg: '#048A0E'},
  greenLight: {text: '#111827', bg: '#9AE095'},
  greenLight1: {text: '#111827', bg: '#9AE095'},
  greenLight2: {text: '#111827', bg: '#CFF5D1'},
  greenLight3: {text: '#111827', bg: '#E6FCE8'},
  greenDark: {text: '#fff', bg: '#006400'},
  greenDark1: {text: '#fff', bg: '#006400'},
  greenDusty: {text: '#fff', bg: '#006400'},
  yellow: {text: '#111827', bg: '#FFBA05'},
  yellowLight: {text: '#111827', bg: '#FFD66B'},
  yellowLight1: {text: '#111827', bg: '#FFD66B'},
  yellowLight2: {text: '#111827', bg: '#FFEAB6'},
  yellowLight3: {text: '#111827', bg: '#FFF6DD'},
  yellowDark: {text: '#fff', bg: '#AF6002'},
  yellowDark1: {text: '#fff', bg: '#AF6002'},
  yellowDusty: {text: '#fff', bg: '#AF6002'},
  orange: {text: '#fff', bg: '#D54401'},
  orangeLight: {text: '#111827', bg: '#FFB68E'},
  orangeLight1: {text: '#111827', bg: '#FFB68E'},
  orangeLight2: {text: '#111827', bg: '#FFE0CC'},
  orangeLight3: {text: '#111827', bg: '#FFECE3'},
  orangeDark: {text: '#fff', bg: '#AA2D00'},
  orangeDark1: {text: '#fff', bg: '#AA2D00'},
  orangeDusty: {text: '#fff', bg: '#AA2D00'},
  red: {text: '#fff', bg: '#DC043B'},
  redLight: {text: '#111827', bg: '#FFA6C1'},
  redLight1: {text: '#111827', bg: '#FFA6C1'},
  redLight2: {text: '#111827', bg: '#FFD4E0'},
  redLight3: {text: '#111827', bg: '#FFF2FA'},
  redDark: {text: '#fff', bg: '#B10F41'},
  redDark1: {text: '#fff', bg: '#B10F41'},
  redDusty: {text: '#fff', bg: '#B10F41'},
  pink: {text: '#fff', bg: '#DD04A8'},
  pinkLight: {text: '#111827', bg: '#F797EF'},
  pinkLight1: {text: '#111827', bg: '#F797EF'},
  pinkLight2: {text: '#111827', bg: '#FAD2FC'},
  pinkLight3: {text: '#111827', bg: '#FFF1FF'},
  pinkDark: {text: '#fff', bg: '#AB0A83'},
  pinkDark1: {text: '#fff', bg: '#AB0A83'},
  pinkDusty: {text: '#fff', bg: '#AB0A83'},
  purple: {text: '#fff', bg: '#7C37EF'},
  purpleLight: {text: '#111827', bg: '#BFAEFC'},
  purpleLight1: {text: '#111827', bg: '#BFAEFC'},
  purpleLight2: {text: '#111827', bg: '#E0DAFD'},
  purpleLight3: {text: '#111827', bg: '#FCF3FF'},
  purpleDark: {text: '#fff', bg: '#6231AE'},
  purpleDark1: {text: '#fff', bg: '#6231AE'},
  purpleDusty: {text: '#fff', bg: '#6231AE'},
  gray: {text: '#fff', bg: '#616670'},
  grayLight: {text: '#111827', bg: '#C4C7CD'},
  grayLight1: {text: '#111827', bg: '#C4C7CD'},
  grayLight2: {text: '#111827', bg: '#E5E9F0'},
  grayLight3: {text: '#111827', bg: '#F2F4F8'},
  grayDark: {text: '#fff', bg: '#41454D'},
  grayDark1: {text: '#fff', bg: '#41454D'},
  grayDusty: {text: '#fff', bg: '#41454D'},
};

/**
 * Maps an Airtable named color string to inline style values for a chip/pill.
 * Use this when rendering single-select or multi-select options.
 */
export function airtableSelectStyle(color: string | undefined): {color: string; backgroundColor: string} {
  const entry = color ? (AIRTABLE_COLOR_MAP[color] ?? null) : null;
  return entry
    ? {color: entry.text, backgroundColor: entry.bg}
    : {color: '#111827', backgroundColor: '#e5e7eb'};
}

// ============================================================================
// Utility Components
// ============================================================================

/**
 * Simple cell renderer for common field types
 */
export function CellRenderer({ record, field }: { record: AirtableRecord; field: Field | string }): React.JSX.Element {
  const value = record.getCellValue(field);
  const fieldObj = typeof field === 'object' ? field : null;
  const fieldType = fieldObj?.type || 'unknown';
  const provenance = useMemo(
    () => (DATA_INSPECT_ENABLED ? record.getProvenance(field) : null),
    [record, field]
  );
  useInspectRegistration(provenance);
  const attrs = provenance ? inspectIdAttrs(provenance.id) : {};

  if (value == null) {
    return <span {...attrs} className="text-gray-400">-</span> as React.JSX.Element;
  }

  // Rich text fields — value is a markdown string
  if (fieldType === 'richText' && typeof value === 'string') {
    return <div {...attrs} className="prose prose-sm max-w-none"><ReactMarkdown>{value}</ReactMarkdown></div> as React.JSX.Element;
  }

  // AI text fields — value is { state, value, isStale? }; content may be markdown
  if (fieldType === 'aiText') {
    const aiText = getAiFieldValue(value);
    if (typeof aiText === 'string') {
      return <div {...attrs} className="prose prose-sm max-w-none"><ReactMarkdown>{aiText}</ReactMarkdown></div> as React.JSX.Element;
    }
    return <span {...attrs} className="text-gray-400">-</span> as React.JSX.Element;
  }

  // Linked records - render resolved names as pills
  if (fieldType === 'multipleRecordLinks' && Array.isArray(value)) {
    return (
      <div {...attrs} className="flex flex-wrap gap-1">
        {(value as any[]).map((item, i) => {
          const displayName = typeof item === 'string' ? item : (item?.name || item?.id || String(item));
          return (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
            >
              {displayName}
            </span>
          );
        })}
      </div>
    ) as React.JSX.Element;
  }

  // Single select - value is a string (choice name); look up color from field schema
  if (fieldType === 'singleSelect' && typeof value === 'string') {
    const choice = fieldObj?.options?.choices?.find(c => c.name === value);
    return (
      <span
        {...attrs}
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={airtableSelectStyle(choice?.color)}
      >
        {value}
      </span>
    ) as React.JSX.Element;
  }

  // Multiple selects - value is string[] (choice names); look up colors from field schema
  if (fieldType === 'multipleSelects' && Array.isArray(value)) {
    return (
      <div {...attrs} className="flex flex-wrap gap-1">
        {(value as string[]).map((name, i) => {
          const choice = fieldObj?.options?.choices?.find(c => c.name === name);
          return (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={airtableSelectStyle(choice?.color)}
            >
              {name}
            </span>
          );
        })}
      </div>
    ) as React.JSX.Element;
  }

  // Collaborator
  if ((fieldType === 'singleCollaborator' || fieldType === 'multipleCollaborators') && value) {
    const collaborators = Array.isArray(value) ? value : [value];
    return (
      <div {...attrs} className="flex flex-wrap gap-1">
        {collaborators.map((c: any, i) => (
          <span
            key={i}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {c.name || c.email || 'User'}
          </span>
        ))}
      </div>
    ) as React.JSX.Element;
  }

  // Checkbox
  if (fieldType === 'checkbox') {
    return <span {...attrs}>{value ? '✓' : ''}</span> as React.JSX.Element;
  }

  // URL
  if (fieldType === 'url' && typeof value === 'string') {
    return (
      <a {...attrs} href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
        {value}
      </a>
    ) as React.JSX.Element;
  }

  // Email
  if (fieldType === 'email' && typeof value === 'string') {
    return (
      <a {...attrs} href={`mailto:${value}`} className="text-blue-600 hover:underline">
        {value}
      </a>
    ) as React.JSX.Element;
  }

  // Default: render as string
  return <span {...attrs}>{record.getCellValueAsString(field)}</span> as React.JSX.Element;
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
    {...(DATA_INSPECT_ENABLED ? inspectIdAttrs(provenance.id) : {}), className},
    children
  );
}

// ============================================================================
// Safe Field Access Helpers
// ============================================================================

/**
 * Safely get choices from a select field
 */
export function getFieldChoices(field: Field | null | undefined): SelectChoice[] {
  return (field?.options?.choices as SelectChoice[]) || [];
}

/**
 * Get a linked record's IDs from a cell value
 */
export function getLinkedRecordIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v: any) => (typeof v === 'string' ? v : v?.id))
    .filter((id): id is string => typeof id === 'string');
}

/**
 * Get select field value as string (handles both string and object formats)
 */
export function getSelectValue(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'name' in value) {
    return (value as SelectChoice).name;
  }
  return null;
}

// ============================================================================
// Current User
// ============================================================================

export interface CurrentUser {
  id: string | null;
  email: string;
  name: string | null;
}

export interface UseCurrentUserResult {
  currentUser: CurrentUser | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useCurrentUser(): UseCurrentUserResult {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = new Headers();
      if (GENERATION_ID) headers.set(GENERATION_ID_HEADER, GENERATION_ID);
      const res = await fetch('/canvas/api/preview/whoami', { headers });
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        setCurrentUser(null);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch current user');
      setCurrentUser((await res.json()) as CurrentUser);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return { currentUser, loading, error, refetch: fetchCurrentUser };
}

const IDENTITY_FIELD_TYPES = new Set([
  'singleCollaborator', 'multipleCollaborators',
]);

export function findCurrentUserRecord(
  records: AirtableRecord[],
  table: Table,
  currentUser: CurrentUser | null,
): AirtableRecord | null {
  if (!currentUser) return null;
  const emailLower = currentUser.email.toLowerCase();

  const collaboratorFields = table.fields.filter((f) => IDENTITY_FIELD_TYPES.has(f.type));
  const emailFields = table.fields.filter((f) => f.type === 'email');

  for (const record of records) {
    for (const field of collaboratorFields) {
      const value = record.getCellValue(field);
      if (value == null) continue;
      const collabs = Array.isArray(value) ? value : [value];
      for (const c of collabs) {
        if (c && typeof c === 'object') {
          const cv = c as CollaboratorValue;
          if (
            (currentUser.id && cv.id === currentUser.id) ||
            (cv.email && cv.email.toLowerCase() === emailLower)
          ) {
            return record;
          }
        }
      }
    }
  }

  for (const record of records) {
    for (const field of emailFields) {
      const str = record.getCellValueAsString(field);
      if (str && str.toLowerCase() === emailLower) return record;
    }
  }

  return null;
}

// ============================================================================
// Exports for backward compatibility
// ============================================================================

export {
  BASE_ID,
  TABLE_IDS,
  PROJECT_ID,
  airtableInspectId,
  dataInspectorRegistry,
  inspectIdAttrs,
  trackAirtableAggregate,
  trackDerivedValue,
  trackTransform,
  type AirtableAggregateDataSource,
  type AirtableDataSource,
  type AggregateFieldMetadata,
  type DataProvenance,
  type DataSource,
  type DataTransform,
  type DerivedDataSource,
};
```
