'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { DesignSystemCard } from './design-system-card';
import type { DesignSystemRecord } from '@/src/lib/design-system-types';
import { DEV_WORKSPACE_ID } from '@/src/lib/dev-constants';

type DSTab = 'all' | 'shared';

interface DesignSystemsListProps {
  designSystems: DesignSystemRecord[];
}

export function DesignSystemsList({ designSystems }: DesignSystemsListProps) {
  const router = useRouter();
  const [tab, setTab] = useState<DSTab>('all');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  async function handleCreate() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/design-systems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: DEV_WORKSPACE_ID, name: newName.trim() }),
      });
      const ds = (await res.json()) as DesignSystemRecord;
      router.push(`/design-systems/${ds.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h1 className="text-[26px] font-semibold text-text">Design systems</h1>
        <button
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-1 rounded-[8px] border border-border-bright bg-input px-3 py-2 text-[15px] text-text hover:bg-surface transition-colors duration-150"
        >
          <Plus strokeWidth={1.5} className="h-4 w-4" /> Create new
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-end border-b border-border px-6">
        {(['all', 'shared'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'mr-5 pb-2 pt-1 text-[15px] border-b-2 transition-colors duration-150 capitalize -mb-px',
              tab === t
                ? 'border-text text-text font-medium'
                : 'border-transparent text-text-faint hover:text-text-muted',
            ].join(' ')}
          >
            {t === 'all' ? 'All' : 'Shared'}
          </button>
        ))}
        <div className="flex-1" />
        <button className="pb-2 text-[15px] text-text-muted hover:text-text transition-colors duration-150">
          Sort: Newest ⌄
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {designSystems.length === 0 ? (
          <p className="py-16 text-center text-[15px] text-text-faint">
            No design systems yet. Create one from this page.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {designSystems.map((ds) => (
              <DesignSystemCard key={ds.id} ds={ds} />
            ))}
          </div>
        )}
      </div>

      {/* Create panel (slides in from right) */}
      {panelOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setPanelOpen(false)}
          />
          <div
            className="absolute right-0 top-0 z-40 h-full w-[400px] border-l border-border p-6 flex flex-col gap-5"
            style={{ background: '#202020' }}
          >
            <h2 className="text-[16px] font-semibold text-text">Create new design system</h2>

            <div className="space-y-1.5">
              <label className="text-[15px] font-medium text-text">Name</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
                placeholder="Airtable Web"
                className="w-full rounded-[8px] border border-border-active bg-hover px-3 py-2 text-[15px] text-text placeholder:text-text-faint outline-none focus:border-accent transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[15px] font-medium text-text">Brand website</label>
              <input
                placeholder="e.g. airtable.com"
                className="w-full rounded-[8px] border border-border-active bg-hover px-3 py-2 text-[15px] text-text placeholder:text-text-faint outline-none focus:border-accent transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[15px] font-medium text-text">Notes</label>
              <textarea
                placeholder="Any brand, tone, or visual guidance"
                rows={4}
                className="w-full resize-none rounded-[8px] border border-border-active bg-hover px-3 py-2 text-[15px] text-text placeholder:text-text-faint outline-none focus:border-accent transition-colors"
              />
            </div>

            <div className="flex-1" />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="rounded-[8px] px-3 py-2 text-[15px] text-text-muted hover:bg-hover hover:text-text transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={!newName.trim() || creating}
                className="rounded-[8px] bg-surface border border-border-bright px-4 py-2 text-[15px] text-text disabled:opacity-50 hover:bg-hover transition-colors duration-150"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
