import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';
import { StackbyContext, type StackbyConfig } from './internal/context.js';

export type { StackbyConfig };

/**
 * Wraps your artifact in the Stackby Studio context.
 * Must be the outermost component — place it at the root of your generated app.
 *
 * @example
 * ```tsx
 * <StackbyProvider config={{ gatewayUrl, authToken, stackId, artifactId }}>
 *   <App />
 * </StackbyProvider>
 * ```
 */
export function StackbyProvider({
  config,
  children,
  queryClient: externalClient,
}: {
  config: StackbyConfig;
  children: ReactNode;
  queryClient?: QueryClient;
}): React.JSX.Element {
  const client = useMemo(
    () =>
      externalClient ??
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 2 },
          mutations: { retry: 0 },
        },
      }),
    [externalClient],
  );

  return (
    <StackbyContext.Provider value={{ config }}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </StackbyContext.Provider>
  );
}
