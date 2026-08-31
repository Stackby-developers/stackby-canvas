import { request } from 'undici';
import type { Config } from './config.js';

export interface StackbyRow {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

export interface StackbyRowsResponse {
  records: StackbyRow[];
  offset?: string;
}

export interface StackbyMutateResult {
  id: string;
  createdTime?: string;
  fields?: Record<string, unknown>;
  error?: string;
}

export class StackbyClient {
  constructor(private readonly config: Pick<Config, 'STACKBY_API_URL' | 'STACKBY_PAT'>) {}

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.STACKBY_PAT, // PAT never leaves this getter — never log headers
    };
  }

  async getRows(
    stackId: string,
    tableId: string,
    opts: { offset?: string; limit?: number; fields?: string[]; viewId?: string },
  ): Promise<StackbyRowsResponse> {
    const params = new URLSearchParams();
    if (opts.offset) params.set('offset', opts.offset);
    if (opts.limit) params.set('maxRecords', String(opts.limit));
    if (opts.viewId) params.set('view', opts.viewId);
    if (opts.fields?.length) opts.fields.forEach((f) => params.append('fields[]', f));

    const url = `${this.config.STACKBY_API_URL}/${encodeURIComponent(stackId)}/${encodeURIComponent(tableId)}?${params}`;
    const { statusCode, body } = await request(url, { method: 'GET', headers: this.headers });

    if (statusCode === 429) {
      const err = new Error('RATE_LIMITED');
      (err as Error & { statusCode: number }).statusCode = 429;
      throw err;
    }
    if (statusCode !== 200) {
      const text = await body.text();
      throw new Error(`Stackby GET rows failed (${statusCode}): ${text}`);
    }
    return body.json() as Promise<StackbyRowsResponse>;
  }

  async createRows(
    stackId: string,
    tableId: string,
    records: Array<Record<string, unknown>>,
  ): Promise<StackbyMutateResult[]> {
    const url = `${this.config.STACKBY_API_URL}/${encodeURIComponent(stackId)}/${encodeURIComponent(tableId)}`;
    const { statusCode, body } = await request(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ records: records.map((fields) => ({ fields })) }),
    });
    if (statusCode !== 200 && statusCode !== 201) {
      const text = await body.text();
      throw new Error(`Stackby POST rows failed (${statusCode}): ${text}`);
    }
    const data = (await body.json()) as { records: StackbyRow[] };
    return data.records.map((r) => ({ id: r.id, createdTime: r.createdTime, fields: r.fields }));
  }

  async updateRows(
    stackId: string,
    tableId: string,
    records: Array<{ id: string; fields: Record<string, unknown> }>,
  ): Promise<StackbyMutateResult[]> {
    const url = `${this.config.STACKBY_API_URL}/${encodeURIComponent(stackId)}/${encodeURIComponent(tableId)}`;
    const { statusCode, body } = await request(url, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({ records }),
    });
    if (statusCode !== 200) {
      const text = await body.text();
      throw new Error(`Stackby PATCH rows failed (${statusCode}): ${text}`);
    }
    const data = (await body.json()) as { records: StackbyRow[] };
    return data.records.map((r) => ({ id: r.id, createdTime: r.createdTime, fields: r.fields }));
  }

  async deleteRows(
    stackId: string,
    tableId: string,
    ids: string[],
  ): Promise<StackbyMutateResult[]> {
    const url = `${this.config.STACKBY_API_URL}/${encodeURIComponent(stackId)}/${encodeURIComponent(tableId)}`;
    const params = new URLSearchParams(ids.map((id) => ['records[]', id] as [string, string]));
    const { statusCode, body } = await request(`${url}?${params}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (statusCode !== 200) {
      const text = await body.text();
      throw new Error(`Stackby DELETE rows failed (${statusCode}): ${text}`);
    }
    const data = (await body.json()) as { records: Array<{ id: string; deleted: boolean }> };
    return data.records.map((r) => ({ id: r.id }));
  }
}
