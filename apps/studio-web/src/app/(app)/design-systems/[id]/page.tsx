import { TokenEditorPage } from '@/src/components/design-systems/token-editor-page';
import type { DesignSystemRecord } from '@/src/lib/design-system-types';

export const dynamic = 'force-dynamic';

export default async function DesignSystemPage({ params }: { params: { id: string } }) {
  let ds: DesignSystemRecord | null = null;
  try {
    const designUrl = process.env['NEXT_PUBLIC_DESIGN_URL'] ?? 'http://localhost:3007';
    const res = await fetch(`${designUrl}/design-systems/${params.id}`, { cache: 'no-store' });
    if (res.ok) ds = (await res.json()) as DesignSystemRecord;
  } catch {
    // backend offline
  }

  if (!ds) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-muted">
        Design system not found.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto px-6 py-8">
      <TokenEditorPage ds={ds} />
    </div>
  );
}
