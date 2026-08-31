import type { GatewayRow } from '../internal/gateway-fetch.js';

/** Generate N deterministic fixture rows for testing. */
export function makeRows(
  count: number,
  fields: (i: number) => Record<string, unknown> = (i) => ({ Name: `Row ${i + 1}` }),
): GatewayRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `row_${String(i + 1).padStart(4, '0')}`,
    createdTime: new Date(2026, 0, i + 1).toISOString(),
    fields: fields(i),
  }));
}
