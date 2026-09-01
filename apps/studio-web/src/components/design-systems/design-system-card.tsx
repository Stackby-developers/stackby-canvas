'use client';

import Link from 'next/link';
import { Palette } from 'lucide-react';
import { Card, Badge } from '@stackby/ui';
import { formatRelativeTime } from '@/src/lib/format';
import type { DesignSystemRecord } from '@/src/lib/design-system-types';

interface DesignSystemCardProps {
  ds: DesignSystemRecord;
}

export function DesignSystemCard({ ds }: DesignSystemCardProps) {
  const colorCount = Object.keys(ds.tokens?.colors ?? {}).length;
  const spacingCount = Object.keys(ds.tokens?.spacing ?? {}).length;
  const radiiCount = Object.keys(ds.tokens?.radii ?? {}).length;
  const shadowCount = Object.keys(ds.tokens?.shadows ?? {}).length;

  const summary = [
    colorCount > 0 && `${colorCount} colors`,
    spacingCount > 0 && `${spacingCount} spacing`,
    radiiCount > 0 && `${radiiCount} radii`,
    shadowCount > 0 && `${shadowCount} shadows`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link href={`/design-systems/${ds.id}`} className="block">
      <Card className="flex flex-col gap-3 p-4 transition-shadow hover:shadow-md cursor-pointer">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10">
              <Palette className="h-4 w-4 text-accent" />
            </div>
            <span className="text-sm font-semibold text-text">{ds.name}</span>
          </div>
          <Badge variant="outline">v{ds.version}</Badge>
        </div>

        {summary ? (
          <p className="text-xs text-text-muted">{summary}</p>
        ) : (
          <p className="text-xs text-text-faint">No tokens yet</p>
        )}

        <p className="text-xs text-text-faint">Updated {formatRelativeTime(ds.updatedAt)}</p>
      </Card>
    </Link>
  );
}
