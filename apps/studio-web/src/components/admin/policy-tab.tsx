'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button, Input, Separator, Spinner } from '@stackby/ui';

interface Policy {
  workspaceId: string;
  allowPublicPublishing: boolean;
  allowGitExport: boolean;
  allowedModelTiers: string[];
  monthlyCreditCap: number;
  requireApprovalForPublish: boolean;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        checked ? 'bg-accent' : 'bg-bg-muted'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

const MODEL_TIERS = ['T0', 'T1', 'T2', 'T3'];

export function PolicyTab() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [draft, setDraft] = useState<Policy | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/policy?workspaceId=dev-workspace')
      .then((r) => r.json() as Promise<Policy>)
      .then((p) => {
        setPolicy(p);
        setDraft(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function updateDraft<K extends keyof Policy>(key: K, value: Policy[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function toggleTier(tier: string) {
    if (!draft) return;
    const tiers = draft.allowedModelTiers.includes(tier)
      ? draft.allowedModelTiers.filter((t) => t !== tier)
      : [...draft.allowedModelTiers, tier];
    updateDraft('allowedModelTiers', tiers);
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      await fetch('/api/admin/policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, workspaceId: 'dev-workspace' }),
      });
      setPolicy(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!draft) {
    return <p className="text-sm text-text-faint">Unable to load policy.</p>;
  }

  const dirty = JSON.stringify(policy) !== JSON.stringify(draft);

  return (
    <div className="max-w-2xl space-y-0">
      <div className="flex items-center justify-between py-4">
        <div>
          <p className="text-sm font-medium text-text">Allow public publishing</p>
          <p className="text-xs text-text-muted">Allow members to publish artifacts publicly</p>
        </div>
        <Toggle
          checked={draft.allowPublicPublishing}
          onChange={(v) => updateDraft('allowPublicPublishing', v)}
        />
      </div>

      <Separator />

      <div className="flex items-center justify-between py-4">
        <div>
          <p className="text-sm font-medium text-text">Require approval for publish</p>
          <p className="text-xs text-text-muted">Require admin approval before any publish goes live</p>
        </div>
        <Toggle
          checked={draft.requireApprovalForPublish}
          onChange={(v) => updateDraft('requireApprovalForPublish', v)}
        />
      </div>

      <Separator />

      <div className="flex items-center justify-between py-4">
        <div>
          <p className="text-sm font-medium text-text">Allow Git export</p>
          <p className="text-xs text-text-muted">Allow export of artifact source to GitHub/GitLab</p>
        </div>
        <Toggle
          checked={draft.allowGitExport}
          onChange={(v) => updateDraft('allowGitExport', v)}
        />
      </div>

      <Separator />

      <div className="flex items-center justify-between py-4">
        <div>
          <p className="text-sm font-medium text-text">Monthly credit cap</p>
          <p className="text-xs text-text-muted">Maximum credits per workspace per month (0 = unlimited)</p>
        </div>
        <Input
          type="number"
          min={0}
          value={draft.monthlyCreditCap}
          onChange={(e) => updateDraft('monthlyCreditCap', Number(e.target.value))}
          className="w-28 text-right"
        />
      </div>

      <Separator />

      <div className="py-4">
        <p className="text-sm font-medium text-text">Allowed model tiers</p>
        <p className="mb-3 text-xs text-text-muted">Which AI model tiers are available for builds</p>
        <div className="flex gap-2">
          {MODEL_TIERS.map((tier) => {
            const active = draft.allowedModelTiers.includes(tier);
            return (
              <button
                key={tier}
                type="button"
                onClick={() => toggleTier(tier)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border bg-transparent text-text-muted hover:bg-bg-muted'
                }`}
              >
                {tier}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-end gap-3 py-4">
        {saved && (
          <span className="flex items-center gap-1 text-xs text-success">
            <Check className="h-3.5 w-3.5" /> Saved
          </span>
        )}
        <Button onClick={() => void handleSave()} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
