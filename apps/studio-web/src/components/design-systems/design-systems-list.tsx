'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Palette } from 'lucide-react';
import {
  Button, Input,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Spinner,
} from '@stackby/ui';
import { DesignSystemCard } from './design-system-card';
import type { DesignSystemRecord } from '@/src/lib/design-system-types';
import { DEV_WORKSPACE_ID } from '@/src/lib/dev-constants';

interface DesignSystemsListProps {
  designSystems: DesignSystemRecord[];
}

export function DesignSystemsList({ designSystems }: DesignSystemsListProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/design-systems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: DEV_WORKSPACE_ID,
          name: newName.trim(),
        }),
      });
      const ds = (await res.json()) as DesignSystemRecord;
      router.push(`/design-systems/${ds.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-text">Design Systems</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Design System
        </Button>
      </div>

      {designSystems.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-bg-elevated">
          <Palette className="h-8 w-8 text-text-faint" />
          <p className="text-sm font-medium text-text">No design systems yet</p>
          <p className="text-xs text-text-muted">Create one to define workspace-level tokens</p>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            Get started
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designSystems.map((ds) => (
            <DesignSystemCard key={ds.id} ds={ds} />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Design System</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Brand tokens"
              onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleCreate()} disabled={!newName.trim() || creating}>
              {creating ? <Spinner size="sm" className="mr-1.5" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
