'use client';

import { useEffect, useState } from 'react';
import { ShieldOff } from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Spinner,
} from '@stackby/ui';

interface Artifact {
  id: string;
  type: string;
  state: string;
  visibility: string;
  credits30d: number;
}

function statusVariant(state: string): 'success' | 'destructive' | 'warning' | 'outline' {
  if (state === 'ready' || state === 'published') return 'success';
  if (state === 'failed') return 'destructive';
  if (state === 'building') return 'warning';
  return 'outline';
}

export function ArtifactsTab() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [unpublishing, setUnpublishing] = useState(false);

  useEffect(() => {
    fetch('/api/admin/artifacts?workspaceId=dev-workspace&limit=50&offset=0')
      .then((r) => r.json() as Promise<{ artifacts: Artifact[] }>)
      .then(({ artifacts: a }) => setArtifacts(a))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleForceUnpublish() {
    if (!confirmId) return;
    setUnpublishing(true);
    try {
      await fetch(`/api/admin/artifacts/${confirmId}/force-unpublish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: 'dev-workspace', adminId: 'dev-admin' }),
      });
      setArtifacts((prev) =>
        prev.map((a) =>
          a.id === confirmId ? { ...a, visibility: 'stack_collaborators' } : a,
        ),
      );
    } finally {
      setUnpublishing(false);
      setConfirmId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (artifacts.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-text-faint">No artifacts found.</p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-muted">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted">Type</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted">Visibility</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-muted">Credits (30d)</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {artifacts.map((a) => (
              <tr key={a.id} className="hover:bg-bg-muted/50">
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className="capitalize">{a.type}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant={statusVariant(a.state)} className="capitalize">{a.state}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  {a.visibility === 'public' ? (
                    <Badge variant="warning">public</Badge>
                  ) : (
                    <span className="text-xs text-text-muted capitalize">
                      {a.visibility.replace('_', ' ')}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-xs text-text-muted">
                  {a.credits30d.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {a.visibility === 'public' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmId(a.id)}
                      className="h-7 gap-1.5 text-destructive hover:text-destructive"
                    >
                      <ShieldOff className="h-3.5 w-3.5" />
                      Force Unpublish
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={confirmId !== null} onOpenChange={(o) => { if (!o) setConfirmId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force unpublish artifact?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted">
            This will immediately remove public access to this artifact. The action is logged in the
            audit trail and cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)} disabled={unpublishing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleForceUnpublish()} disabled={unpublishing}>
              {unpublishing ? 'Unpublishing…' : 'Force Unpublish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
