import { useRecords } from './use-records.js';
import type { HookResult } from '../internal/result.js';
import type { GatewayRow } from '../internal/gateway-fetch.js';

/**
 * Fetch records filtered to a specific saved view.
 *
 * @param tableId - The Stackby table ID
 * @param viewId - The saved view ID
 */
export function useView(tableId: string, viewId: string): HookResult<GatewayRow[]> {
  return useRecords(tableId, { view: viewId, bindingId: tableId });
}
