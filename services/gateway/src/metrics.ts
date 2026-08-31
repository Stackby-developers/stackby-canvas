export interface RequestMetrics {
  requestId: string;
  stackId: string;
  cacheHit: boolean;
  upstreamCalls: number;
  rows: number;
  latencyMs: number;
  throttled: boolean;
  viewerId: string;
  operation: 'read' | 'mutate' | 'aggregate' | 'upload' | 'me';
}

export function emitMetrics(
  logger: { info: (obj: unknown) => void },
  m: RequestMetrics,
): void {
  logger.info({ metric: 'gateway.request', ...m });
}
