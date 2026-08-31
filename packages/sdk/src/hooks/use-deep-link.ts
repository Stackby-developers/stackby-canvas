import { useMemo } from 'react';
import { useStackbyContext } from '../internal/context.js';

export interface UseDeepLinkOptions {
  table: string;
  recordId: string;
}

export interface UseDeepLinkResult {
  /** The shareable deep-link URL for this record */
  url: string;
  /** Copy the URL to the clipboard */
  copy: () => Promise<void>;
}

/** Generate a shareable URL that navigates directly to a specific record. */
export function useDeepLink({ table, recordId }: UseDeepLinkOptions): UseDeepLinkResult {
  const { config } = useStackbyContext();

  const url = useMemo(() => {
    const base =
      typeof window !== 'undefined'
        ? window.location.origin + window.location.pathname
        : '';
    const params = new URLSearchParams({ table, recordId, stackId: config.stackId });
    return `${base}?${params.toString()}`;
  }, [table, recordId, config.stackId]);

  const copy = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
    }
  };

  return { url, copy };
}
