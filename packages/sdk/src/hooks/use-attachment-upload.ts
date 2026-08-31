import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStackbyContext } from '../internal/context.js';
import { gatewayUpload } from '../internal/gateway-fetch.js';

export interface UploadResult {
  filename: string;
  mime: string;
  size: number;
}

export interface UseAttachmentUploadResult {
  upload: (file: File) => Promise<UploadResult>;
  isUploading: boolean;
  error: Error | null;
  reset: () => void;
}

/** Upload a file to an attachment column via the Data Gateway. */
export function useAttachmentUpload(
  tableId: string,
  columnId: string,
): UseAttachmentUploadResult {
  const { config } = useStackbyContext();
  const queryClient = useQueryClient();
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(
    async (file: File): Promise<UploadResult> => {
      setUploading(true);
      setError(null);
      try {
        const result = await gatewayUpload(config, tableId, columnId, file);
        void queryClient.invalidateQueries({
          queryKey: ['stackby', 'records', config.stackId, tableId],
        });
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setUploading(false);
      }
    },
    [config, tableId, columnId, queryClient],
  );

  return { upload, isUploading, error, reset: () => setError(null) };
}
