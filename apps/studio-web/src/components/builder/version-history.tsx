'use client';

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button, Badge, Spinner } from '@stackby/ui';
import { formatRelativeTime } from '@/src/lib/format';

interface Version {
  id: string;
  versionNumber: number;
  buildHash: string;
  createdAt: string;
}

interface VersionHistoryProps {
  deploymentId: string;
  activeVersionId: string;
  onRollback: (versionNumber: number) => Promise<void>;
}

export function VersionHistory({ deploymentId, activeVersionId, onRollback }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollingBack, setRollingBack] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/publish/${deploymentId}/versions`)
      .then((r) => r.json() as Promise<{ versions: Version[] }>)
      .then(({ versions: v }) => setVersions(v))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deploymentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner size="sm" />
      </div>
    );
  }

  if (versions.length === 0) {
    return <p className="text-xs text-text-faint py-2">No versions yet.</p>;
  }

  return (
    <div className="space-y-1">
      {versions.map((v) => {
        const isCurrent = v.id === activeVersionId;
        return (
          <div key={v.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-bg-muted">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-mono text-text shrink-0">v{v.versionNumber}</span>
              {isCurrent && <Badge variant="success" className="text-[10px] py-0 px-1.5">Current</Badge>}
              <span className="text-[10px] font-mono text-text-faint truncate">{v.buildHash.slice(0, 8)}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-text-faint">{formatRelativeTime(v.createdAt)}</span>
              {!isCurrent && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={rollingBack !== null}
                  onClick={async () => {
                    setRollingBack(v.versionNumber);
                    try {
                      await onRollback(v.versionNumber);
                    } finally {
                      setRollingBack(null);
                    }
                  }}
                  aria-label={`Restore version ${v.versionNumber}`}
                >
                  {rollingBack === v.versionNumber
                    ? <Spinner size="sm" />
                    : <RotateCcw className="h-3.5 w-3.5" />}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
