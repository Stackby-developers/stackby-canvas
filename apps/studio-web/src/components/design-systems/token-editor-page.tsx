'use client';

import { useRouter } from 'next/navigation';
import { TokenEditor } from './token-editor';
import type { DesignSystemRecord, DesignTokens } from '@/src/lib/design-system-types';

interface TokenEditorPageProps {
  ds: DesignSystemRecord;
}

export function TokenEditorPage({ ds }: TokenEditorPageProps) {
  const router = useRouter();

  async function handleSave(tokens: DesignTokens) {
    await fetch(`/api/design-systems/${ds.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens }),
    });
    router.refresh();
  }

  return <TokenEditor ds={ds} onSave={handleSave} />;
}
