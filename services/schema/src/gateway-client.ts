import { request } from 'undici';

export interface GatewayStackSchema {
  stackId: string;
  stackName: string;
  tables: GatewayTable[];
}

export interface GatewayTable {
  id: string;
  name: string;
  primaryColumnId: string;
  columns: GatewayColumn[];
  views: GatewayView[];
}

export interface GatewayColumn {
  id: string;
  name: string;
  type: string;
  options?: {
    choices?: Array<{ id: string; name: string; color?: string }>;
    linkedTableId?: string;
    linkedColumnId?: string;
    formula?: string;
    precision?: number;
    symbol?: string;
  };
}

export interface GatewayView {
  id: string;
  name: string;
  type: string;
}

export interface GatewayRowsResponse {
  rows: Array<{ id: string; createdTime: string; fields: Record<string, unknown> }>;
  offset?: string;
}

export class GatewayClient {
  constructor(private readonly baseUrl: string) {}

  async getStackSchema(stackId: string): Promise<GatewayStackSchema> {
    const url = `${this.baseUrl}/stacks/${encodeURIComponent(stackId)}/schema`;
    const { statusCode, body } = await request(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (statusCode !== 200) {
      const text = await body.text();
      throw new Error(`Gateway schema fetch failed (${statusCode}): ${text}`);
    }
    return body.json() as Promise<GatewayStackSchema>;
  }

  async getTableRows(
    stackId: string,
    tableId: string,
    limit: number,
  ): Promise<GatewayRowsResponse> {
    const url = `${this.baseUrl}/stacks/${encodeURIComponent(stackId)}/tables/${encodeURIComponent(tableId)}/rows?limit=${limit}`;
    const { statusCode, body } = await request(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (statusCode !== 200) {
      const text = await body.text();
      throw new Error(`Gateway rows fetch failed (${statusCode}): ${text}`);
    }
    return body.json() as Promise<GatewayRowsResponse>;
  }
}
