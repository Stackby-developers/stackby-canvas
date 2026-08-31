import { useQuery } from '@tanstack/react-query';
import { useStackbyContext } from '../internal/context.js';
import { gatewayMe } from '../internal/gateway-fetch.js';

export interface CurrentUser {
  viewerId: string;
  email: string | null;
  name?: string;
  role?: string;
  workspaceId?: string;
  artifactId?: string;
}

export interface UseCurrentUserResult {
  currentUser: CurrentUser | null;
  isLoading: boolean;
  error: Error | null;
}

/** Returns the identity of the authenticated viewer of this artifact. */
export function useCurrentUser(): UseCurrentUserResult {
  const { config } = useStackbyContext();

  const query = useQuery({
    queryKey: ['stackby', 'me', config.stackId, config.artifactId],
    queryFn: async () => gatewayMe(config) as Promise<CurrentUser>,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    currentUser: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  };
}
