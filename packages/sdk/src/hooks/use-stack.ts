import { useStackbyContext } from '../internal/context.js';

/** Returns the configured stack ID and gateway URL from the nearest StackbyProvider. */
export function useStack(): { stackId: string; gatewayUrl: string } {
  const { config } = useStackbyContext();
  return { stackId: config.stackId, gatewayUrl: config.gatewayUrl };
}
