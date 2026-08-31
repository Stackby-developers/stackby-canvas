import type { StackbyConfig } from './internal/context.js';
import {
  gatewayRead,
  gatewayMutate,
  gatewayMe,
  gatewayAggregate,
  type GatewayRow,
  type GatewayAggregateParams,
} from './internal/gateway-fetch.js';
import type { FilterCondition } from './filter/types.js';

export interface GetRecordsOptions {
  view?: string;
  filter?: FilterCondition;
  sort?: Array<{ columnId: string; direction: 'asc' | 'desc' }>;
  columns?: string[];
  page?: number;
  bindingId?: string;
}

/**
 * Standalone (non-hook) Stackby Studio client for use in server components and route handlers.
 * Does not depend on React or TanStack Query.
 *
 * @example
 * ```ts
 * const client = new StackbyStudioClient({ gatewayUrl, authToken, stackId, artifactId });
 * const tasks = await client.getRecords('tbl_tasks');
 * ```
 */
export class StackbyStudioClient {
  constructor(private readonly config: StackbyConfig) {}

  async getRecords(tableId: string, opts: GetRecordsOptions = {}): Promise<GatewayRow[]> {
    const result = await gatewayRead({
      config: this.config,
      tableId,
      bindingId: opts.bindingId ?? tableId,
      viewId: opts.view,
      columns: opts.columns,
      filter: opts.filter,
      sort: opts.sort,
      page: opts.page,
    });
    return result.data;
  }

  async getRecord(tableId: string, recordId: string): Promise<GatewayRow | null> {
    const rows = await this.getRecords(tableId, {
      filter: { column: 'id', op: 'is', value: recordId },
    });
    return rows[0] ?? null;
  }

  async createRecord(
    tableId: string,
    fields: Record<string, unknown>,
  ): Promise<{ id?: string }> {
    const result = await gatewayMutate({
      config: this.config,
      tableId,
      bindingId: tableId,
      op: 'create',
      records: [{ fields }],
      idempotencyKey: crypto.randomUUID(),
    });
    return result.results[0] ?? {};
  }

  async updateRecord(
    tableId: string,
    recordId: string,
    fields: Record<string, unknown>,
  ): Promise<{ id?: string }> {
    const result = await gatewayMutate({
      config: this.config,
      tableId,
      bindingId: tableId,
      op: 'update',
      records: [{ id: recordId, fields }],
      idempotencyKey: crypto.randomUUID(),
    });
    return result.results[0] ?? {};
  }

  async deleteRecord(tableId: string, recordId: string): Promise<void> {
    await gatewayMutate({
      config: this.config,
      tableId,
      bindingId: tableId,
      op: 'delete',
      records: [{ id: recordId }],
      idempotencyKey: crypto.randomUUID(),
    });
  }

  async aggregate(
    tableId: string,
    opts: Omit<GatewayAggregateParams, 'config' | 'tableId'>,
  ): Promise<unknown> {
    return gatewayAggregate({ config: this.config, tableId, ...opts });
  }

  async me(): Promise<unknown> {
    return gatewayMe(this.config);
  }
}
