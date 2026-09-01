import { DesignSystemsList } from '@/src/components/design-systems/design-systems-list';
import type { DesignSystemRecord } from '@/src/lib/design-system-types';

export const dynamic = 'force-dynamic';

export default async function DesignSystemsPage() {
  let designSystems: DesignSystemRecord[] = [];
  try {
    const designUrl = process.env['NEXT_PUBLIC_DESIGN_URL'] ?? 'http://localhost:3007';
    const res = await fetch(`${designUrl}/design-systems?workspaceId=dev-workspace`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as { designSystems: DesignSystemRecord[] };
      designSystems = data.designSystems;
    }
  } catch {
    // backend offline — show empty state
  }

  return (
    <div className="h-full overflow-auto px-6 py-8">
      <DesignSystemsList designSystems={designSystems} />
    </div>
  );
}
